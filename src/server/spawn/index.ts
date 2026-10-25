import pty from 'node-pty';
import {
  parseCommitPayload,
  parseInputPayload,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from '../../protocol/socket-events.js';
import { tinybuffer, FlowControlServer } from '../flowcontrol.js';
import { logger as getLogger } from '../observability/logger.js';
import { writePtyInput } from '../pty/input.js';
import { xterm } from '../pty/options.js';
import { envVersionOr } from './env.js';
import { logSafeArgs } from './log-safety.js';
import { parseDimensions } from './resize.js';
import type { ServerSession } from '../session.js';
import type { Socket } from 'socket.io';

interface Disposable {
  dispose(): void;
}

export interface SpawnPty {
  readonly pid: number;
  kill(): void;
  onData(listener: (data: string) => void): Disposable;
  onExit(listener: (event: { exitCode: number }) => void): Disposable;
  pause(): void;
  resize(columns: number, rows: number): void;
  resume(): void;
  write(data: string | Buffer): void;
}

interface SpawnDependencies {
  envVersion(fallback: number, signal?: AbortSignal): Promise<number>;
  spawnPty(command: string[]): SpawnPty;
}

function isSessionActive(session: ServerSession): boolean {
  return session.active;
}

export async function spawn(
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  args: string[],
  session: ServerSession,
  dependencies: SpawnDependencies = {
    envVersion: envVersionOr,
    spawnPty: (command) => pty.spawn('/usr/bin/env', command, xterm),
  },
): Promise<void> {
  const logger = getLogger();
  const version = await dependencies.envVersion(0, session.signal);
  if (!isSessionActive(session)) return;

  const cmd = version >= 9 ? ['-S', ...args] : args;
  logger.debug('Spawning PTY', { cmd: logSafeArgs(cmd) });
  const term = dependencies.spawnPty(cmd);
  let exited = false;
  let terminated = false;
  function terminate(): void {
    if (exited || terminated) return;
    terminated = true;
    term.kill();
  }

  const releaseTerm = session.own(terminate);
  if (!isSessionActive(session)) {
    releaseTerm();
    return;
  }

  const { pid } = term;
  const address = args[0] === 'ssh' ? args[1] : 'localhost';
  const send = tinybuffer(socket, 2, 524288);
  const fcServer = new FlowControlServer();
  let exitListener: Disposable | undefined;
  let dataListener: Disposable | undefined;

  function cleanup(action: () => void): void {
    try {
      action();
    } catch (error) {
      session.reportCleanupError(error);
    }
  }

  function onResize(payload: unknown): void {
    if (!session.active) return;
    // Socket.IO does not catch throws in listeners, so an invalid size would
    // otherwise take down the process and every other session with it.
    const dimensions = parseDimensions(payload);
    if (dimensions === undefined) {
      logger.debug('Ignoring invalid resize request', { pid });
      return;
    }
    try {
      term.resize(dimensions.cols, dimensions.rows);
    } catch (error) {
      logger.debug('Resize rejected by PTY', { pid, err: error });
    }
  }

  function onInput(input: string, binary?: boolean): void {
    if (!session.active) return;
    const payload = parseInputPayload(input, binary);
    if (payload === undefined) {
      logger.debug('Ignoring invalid terminal input', { pid });
      return;
    }
    writePtyInput(term, payload.input, payload.binary);
  }

  function onCommit(size: number): void {
    if (!session.active) return;
    const commit = parseCommitPayload(size);
    if (commit === undefined || commit > fcServer.counter) {
      logger.debug('Ignoring invalid flow-control commit', { pid });
      return;
    }
    if (fcServer.commit(commit)) term.resume();
  }

  function removeSessionListeners(): void {
    cleanup(() => {
      socket.off('resize', onResize);
    });
    cleanup(() => {
      socket.off('input', onInput);
    });
    cleanup(() => {
      socket.off('commit', onCommit);
    });
    cleanup(() => {
      send.cancel();
    });
    cleanup(() => {
      dataListener?.dispose();
    });
    cleanup(() => {
      exitListener?.dispose();
    });
  }

  session.own(removeSessionListeners);
  try {
    exitListener = term.onExit(({ exitCode }) => {
      if (!session.active) return;
      exited = true;
      logger.info('Process exited', { exitCode, pid });
      socket.emit('logout');
      session.end('pty-exit');
    });
    if (!isSessionActive(session)) {
      cleanup(() => {
        exitListener?.dispose();
      });
      return;
    }
    dataListener = term.onData((data: string) => {
      if (!session.active) return;
      send(data);
      if (fcServer.account(data.length)) term.pause();
    });
    if (!isSessionActive(session)) {
      cleanup(() => {
        dataListener?.dispose();
      });
      return;
    }
    socket.on('resize', onResize);
    socket.on('input', onInput);
    socket.on('commit', onCommit);
  } catch (error) {
    session.end('spawn-failure');
    throw error;
  }

  if (!isSessionActive(session)) return;
  logger.info('Process Started on behalf of user', { pid, address });
  socket.emit('login');
}
