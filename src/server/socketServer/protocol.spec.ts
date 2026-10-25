import 'mocha';
import { once } from 'node:events';
import { expect } from 'chai';
import express from 'express';
import * as sinon from 'sinon';
import { io as connect, type Socket as ClientSocket } from 'socket.io-client';

import { runServerSession, type SessionEndReason } from '../session';
import { spawn, type SpawnPty } from '../spawn/index';
import { listen } from './socket';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '../../protocol/socket-events';
import type { AddressInfo } from 'node:net';

function deferred<T>() {
  let resolvePromise: (value: T | PromiseLike<T>) => void = () => undefined;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise };
}

function createPtyHarness() {
  const dataListeners = new Set<(data: string) => void>();
  const exitListeners = new Set<(event: { exitCode: number }) => void>();
  const inputReceived = deferred<string | Buffer>();
  const resizeReceived = deferred<{ columns: number; rows: number }>();
  const write = sinon.spy((data: string | Buffer) => {
    inputReceived.resolve(data);
  });
  const resize = sinon.spy((columns: number, rows: number) => {
    resizeReceived.resolve({ columns, rows });
  });
  const pty: SpawnPty = {
    pid: -1,
    kill: sinon.spy(),
    onData(listener) {
      dataListeners.add(listener);
      return { dispose: () => dataListeners.delete(listener) };
    },
    onExit(listener) {
      exitListeners.add(listener);
      return { dispose: () => exitListeners.delete(listener) };
    },
    pause: sinon.spy(),
    resize,
    resume: sinon.spy(),
    write,
  };

  return {
    pty,
    inputReceived: inputReceived.promise,
    resize,
    resizeReceived: resizeReceived.promise,
    write,
    emitData(data: string): void {
      for (const listener of dataListeners) listener(data);
    },
  };
}

describe('Socket.IO terminal protocol integration', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('connects validated client events to one PTY session', async () => {
    const io = await listen(express(), {
      host: '127.0.0.1',
      port: 0,
      path: '',
      ssl: {},
      allowedOrigins: ['http://terminal.example'],
    });
    if (!io.httpServer.listening) await once(io.httpServer, 'listening');
    const { port } = io.httpServer.address() as AddressInfo;
    const pty = createPtyHarness();
    let sessionRun: Promise<SessionEndReason> | undefined;
    io.on('connection', (socket) => {
      sessionRun = runServerSession(socket, {
        connections: { inc: () => undefined, dec: () => undefined },
        getCommand: () => Promise.resolve(['login']),
        spawn: (args, session) =>
          spawn(socket, args, session, {
            envVersion: () => Promise.resolve(9),
            spawnPty: () => pty.pty,
          }),
      });
    });
    const client: ClientSocket<ServerToClientEvents, ClientToServerEvents> =
      connect(`http://127.0.0.1:${String(port)}`, {
        extraHeaders: { Origin: 'http://terminal.example' },
        path: '/socket.io',
        transports: ['websocket'],
      });

    try {
      await new Promise<void>((resolveLogin) => {
        client.once('login', resolveLogin);
      });
      client.emit('input', 'whoami');
      expect(await pty.inputReceived).to.equal('whoami');

      client.emit('resize', { cols: 100, rows: 40 });
      expect(await pty.resizeReceived).to.deep.equal({
        columns: 100,
        rows: 40,
      });

      const output = new Promise<string>((resolveOutput) => {
        client.once('data', resolveOutput);
      });
      pty.emitData('terminal output');
      expect(await output).to.equal('terminal output');

      const rawClient = client as unknown as {
        emit(event: string, ...args: unknown[]): void;
      };
      rawClient.emit('input', 42);
      rawClient.emit('resize', { cols: Number.NaN, rows: 40 });
      rawClient.emit('commit', Number.POSITIVE_INFINITY);
      await new Promise<void>((resolveDelay) => {
        setTimeout(resolveDelay, 10);
      });
      expect(pty.write.calledOnce).to.equal(true);
      expect(pty.resize.calledOnce).to.equal(true);
      expect((pty.pty.resume as sinon.SinonSpy).called).to.equal(false);

      client.disconnect();
      expect(await sessionRun).to.equal('socket-disconnect');
      expect((pty.pty.kill as sinon.SinonSpy).calledOnce).to.equal(true);
    } finally {
      client.disconnect();
      await io.close();
    }
  }).timeout(10_000);
});
