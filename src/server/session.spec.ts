import { expect } from 'chai';
import 'mocha';
import * as sinon from 'sinon';

import { tinybuffer } from './flowcontrol';
import { login, type LoginPty } from './login';
import {
  createServerSession,
  runServerSession,
  SessionEndError,
} from './session';
import { spawn, type SpawnPty } from './spawn/index.js';
import type { Socket } from 'socket.io';

type Listener = (...args: unknown[]) => void;

interface Emission {
  event: string;
  args: unknown[];
}

function createSocketHarness() {
  const listeners = new Map<string, Set<Listener>>();
  const retained = new Map<string, Listener[]>();
  const emissions: Emission[] = [];
  const socket = {
    on(event: string, listener: Listener) {
      const eventListeners = listeners.get(event) ?? new Set<Listener>();
      eventListeners.add(listener);
      listeners.set(event, eventListeners);
      retained.set(event, [...(retained.get(event) ?? []), listener]);
      return socket;
    },
    off(event: string, listener: Listener) {
      listeners.get(event)?.delete(listener);
      return socket;
    },
    emit(event: string, ...args: unknown[]) {
      emissions.push({ event, args });
      return socket;
    },
  };

  return {
    socket: socket as unknown as Socket,
    emissions,
    listenerCount: (event: string) => listeners.get(event)?.size ?? 0,
    retained: (event: string, index: number) => retained.get(event)?.[index],
    trigger(event: string, ...args: unknown[]) {
      for (const listener of [...(listeners.get(event) ?? [])]) {
        listener(...args);
      }
    },
  };
}

function createPtyHarness() {
  const activeData = new Set<(data: string) => void>();
  const activeExit = new Set<(event: { exitCode: number }) => void>();
  const retainedData: ((data: string) => void)[] = [];
  const retainedExit: ((event: { exitCode: number }) => void)[] = [];
  const writes: (string | Buffer)[] = [];
  let killCount = 0;
  let pauseCount = 0;
  let resumeCount = 0;
  const pty: LoginPty & SpawnPty = {
    pid: -1,
    kill() {
      killCount += 1;
    },
    onData(listener) {
      activeData.add(listener);
      retainedData.push(listener);
      return { dispose: () => activeData.delete(listener) };
    },
    onExit(listener) {
      activeExit.add(listener);
      retainedExit.push(listener);
      return { dispose: () => activeExit.delete(listener) };
    },
    pause() {
      pauseCount += 1;
    },
    resize() {
      return undefined;
    },
    resume() {
      resumeCount += 1;
    },
    write(data) {
      writes.push(data);
    },
  };

  return {
    pty,
    writes,
    get killCount() {
      return killCount;
    },
    get pauseCount() {
      return pauseCount;
    },
    get resumeCount() {
      return resumeCount;
    },
    retainedData: (): ((data: string) => void) | undefined => retainedData[0],
    retainedExit: (): ((event: { exitCode: number }) => void) | undefined =>
      retainedExit[0],
    triggerData(data: string) {
      for (const listener of [...activeData]) listener(data);
    },
    triggerExit(exitCode = 0) {
      for (const listener of [...activeExit]) listener({ exitCode });
    },
  };
}

function createGaugeHarness() {
  let active = 0;
  let increments = 0;
  let decrements = 0;
  return {
    gauge: {
      inc() {
        active += 1;
        increments += 1;
      },
      dec() {
        active -= 1;
        decrements += 1;
      },
    },
    get active() {
      return active;
    },
    get increments() {
      return increments;
    },
    get decrements() {
      return decrements;
    },
  };
}

function deferred<T>() {
  let resolvePromise: (value: T | PromiseLike<T>) => void = () => undefined;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise };
}

describe('server socket session lifecycle', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('awaits normal disconnect and releases the gauge exactly once', async () => {
    const socket = createSocketHarness();
    const gauge = createGaugeHarness();
    const started = deferred<undefined>();
    const run = runServerSession(socket.socket, {
      connections: gauge.gauge,
      getCommand: () => Promise.resolve(['login']),
      spawn: () => {
        started.resolve(undefined);
        return Promise.resolve();
      },
    });

    await started.promise;
    expect(gauge.active).to.equal(1);
    socket.trigger('disconnect');
    socket.trigger('disconnect');

    expect(await run).to.equal('socket-disconnect');
    expect(gauge.increments).to.equal(1);
    expect(gauge.decrements).to.equal(1);
    expect(gauge.active).to.equal(0);
  });

  it('settles setup failures and typed login rejection through one finally path', async () => {
    await Promise.all(
      (['command-failure', 'login-rejected'] as const).map(async (expected) => {
        const socket = createSocketHarness();
        const gauge = createGaugeHarness();
        const result = await runServerSession(socket.socket, {
          connections: gauge.gauge,
          getCommand: () =>
            Promise.reject(
              expected === 'login-rejected'
                ? new SessionEndError('login-rejected', 'Login rejected')
                : new Error('command failed'),
            ),
          spawn: () => Promise.resolve(),
        });

        expect(result).to.equal(expected);
        expect(gauge.increments).to.equal(1);
        expect(gauge.decrements).to.equal(1);
        expect(gauge.active).to.equal(0);
      }),
    );
  });

  it('releases the gauge after PTY exit and spawn failure', async () => {
    const exitSocket = createSocketHarness();
    const exitGauge = createGaugeHarness();
    const pty = createPtyHarness();
    const exitResult = runServerSession(exitSocket.socket, {
      connections: exitGauge.gauge,
      getCommand: () => Promise.resolve(['login']),
      spawn: async (args, session) => {
        await spawn(exitSocket.socket, args, session, {
          envVersion: () => Promise.resolve(9),
          spawnPty: () => pty.pty,
        });
        queueMicrotask(() => {
          pty.triggerExit();
        });
      },
    });

    expect(await exitResult).to.equal('pty-exit');
    expect(exitGauge.decrements).to.equal(1);
    expect(exitGauge.active).to.equal(0);
    expect(pty.killCount).to.equal(0);

    const failureSocket = createSocketHarness();
    const failureGauge = createGaugeHarness();
    const failureResult = await runServerSession(failureSocket.socket, {
      connections: failureGauge.gauge,
      getCommand: () => Promise.resolve(['login']),
      spawn: () => Promise.reject(new Error('spawn failed')),
    });

    expect(failureResult).to.equal('spawn-failure');
    expect(failureGauge.decrements).to.equal(1);
    expect(failureGauge.active).to.equal(0);
  });

  it('does not start a PTY when disconnect wins command generation', async () => {
    const socket = createSocketHarness();
    const gauge = createGaugeHarness();
    let spawnCount = 0;
    const result = await runServerSession(socket.socket, {
      connections: gauge.gauge,
      getCommand: () => {
        socket.trigger('disconnect');
        return Promise.resolve(['login']);
      },
      spawn: () => {
        spawnCount += 1;
        return Promise.resolve();
      },
    });

    expect(result).to.equal('socket-disconnect');
    expect(spawnCount).to.equal(0);
    expect(gauge.decrements).to.equal(1);
  });

  it('removes only owned listeners and makes retained callbacks inert', async () => {
    const socket = createSocketHarness();
    const session = createServerSession(socket.socket);
    let unrelatedInputCount = 0;
    let ownedInputCount = 0;
    const unrelatedInput = () => {
      unrelatedInputCount += 1;
    };
    const ownedInput = () => {
      if (session.active) ownedInputCount += 1;
    };
    socket.socket.on('input', unrelatedInput);
    socket.socket.on('input', ownedInput);
    session.own(() => socket.socket.off('input', ownedInput));
    const retainedOwnedInput = socket.retained('input', 1);

    session.end('disposed');
    session.end('spawn-failure');
    socket.trigger('input', 'late');
    retainedOwnedInput?.('late');

    expect(await session.completion).to.equal('disposed');
    expect(socket.listenerCount('input')).to.equal(1);
    expect(unrelatedInputCount).to.equal(1);
    expect(ownedInputCount).to.equal(0);
  });

  it('hands login input to the main PTY without leaking temporary listeners', async () => {
    const socket = createSocketHarness();
    const session = createServerSession(socket.socket);
    const loginPty = createPtyHarness();
    const mainPty = createPtyHarness();
    let unrelatedInputCount = 0;
    socket.socket.on('input', () => {
      unrelatedInputCount += 1;
    });

    const username = login(socket.socket, session, {
      spawnPty: () => loginPty.pty,
    });
    socket.trigger('input', 'alice');
    loginPty.triggerExit();

    expect(await username).to.equal('alice');
    expect(socket.listenerCount('input')).to.equal(1);
    expect(socket.listenerCount('disconnect')).to.equal(1);

    await spawn(socket.socket, ['login'], session, {
      envVersion: () => Promise.resolve(9),
      spawnPty: () => mainPty.pty,
    });
    socket.trigger('input', 'whoami');

    expect(loginPty.writes).to.deep.equal(['alice']);
    expect(mainPty.writes).to.deep.equal(['whoami']);
    expect(unrelatedInputCount).to.equal(2);
    expect(
      socket.emissions.filter(({ event }) => event === 'login'),
    ).to.have.lengthOf(1);
  });

  it('ignores malformed login input before temporary PTY and buffer access', async () => {
    const socket = createSocketHarness();
    const session = createServerSession(socket.socket);
    const pty = createPtyHarness();
    const username = login(socket.socket, session, {
      spawnPty: () => pty.pty,
    });

    socket.trigger('input');
    socket.trigger('input', 42);
    socket.trigger('input', 'wrong binary flag', 'true');
    socket.trigger('input', 'x'.repeat(1_000_001));

    expect(pty.writes).to.have.lengthOf(0);

    socket.trigger('input', 'alice');
    pty.triggerExit();

    expect(await username).to.equal('alice');
    expect(pty.writes).to.deep.equal(['alice']);
  });

  it('accepts the exact interactive login username limit', async () => {
    const socket = createSocketHarness();
    const session = createServerSession(socket.socket);
    const pty = createPtyHarness();
    const pendingLogin = login(socket.socket, session, {
      spawnPty: () => pty.pty,
    });

    socket.trigger('input', 'ignored binary', true);
    socket.trigger('input', 'a'.repeat(128));
    socket.trigger('input', 'b'.repeat(128));
    pty.triggerExit();

    expect(await pendingLogin).to.equal(`${'a'.repeat(128)}${'b'.repeat(128)}`);
    expect(pty.writes).to.deep.equal(['a'.repeat(128), 'b'.repeat(128)]);
  });

  it('accounts for delete characters in interactive login input', async () => {
    const socket = createSocketHarness();
    const session = createServerSession(socket.socket);
    const pty = createPtyHarness();
    const pendingLogin = login(socket.socket, session, {
      spawnPty: () => pty.pty,
    });

    socket.trigger('input', 'abc');
    socket.trigger('input', '\x7F');
    pty.triggerExit();

    expect(await pendingLogin).to.equal('ab');
  });

  it('rejects aggregate interactive login input above the username limit', async () => {
    const socket = createSocketHarness();
    const session = createServerSession(socket.socket);
    const pty = createPtyHarness();
    const pendingLogin = login(socket.socket, session, {
      spawnPty: () => pty.pty,
    });

    socket.trigger('input', 'a'.repeat(128));
    socket.trigger('input', 'b'.repeat(129));
    let rejection: unknown;
    try {
      await pendingLogin;
    } catch (error) {
      rejection = error;
    }

    expect(rejection).to.be.instanceOf(SessionEndError);
    expect((rejection as SessionEndError).reason).to.equal('login-rejected');
    expect(await session.completion).to.equal('login-rejected');
    expect(pty.writes).to.deep.equal(['a'.repeat(128)]);
    expect(pty.killCount).to.equal(1);
    expect(socket.listenerCount('input')).to.equal(0);
  });

  it('rejects login disconnect and removes temporary listener authority', async () => {
    const socket = createSocketHarness();
    const session = createServerSession(socket.socket);
    const pty = createPtyHarness();
    let unrelatedInputCount = 0;
    socket.socket.on('input', () => {
      unrelatedInputCount += 1;
    });
    const pendingLogin = login(socket.socket, session, {
      spawnPty: () => pty.pty,
    });
    const retainedInput = socket.retained('input', 1);
    const retainedData = pty.retainedData();

    socket.trigger('disconnect');
    let rejection: unknown;
    try {
      await pendingLogin;
    } catch (error) {
      rejection = error;
    }
    const emissionsAfterDisconnect = socket.emissions.length;
    retainedInput?.('late input');
    retainedData?.('late data');
    socket.trigger('input', 'unrelated input');

    expect(rejection).to.be.instanceOf(SessionEndError);
    expect((rejection as SessionEndError).reason).to.equal('socket-disconnect');
    expect(socket.listenerCount('disconnect')).to.equal(0);
    expect(socket.listenerCount('input')).to.equal(1);
    expect(pty.killCount).to.equal(1);
    expect(pty.writes).to.have.lengthOf(0);
    expect(socket.emissions).to.have.lengthOf(emissionsAfterDisconnect);
    expect(unrelatedInputCount).to.equal(1);
  });

  it('ignores malformed main-session input before PTY access', async () => {
    const socket = createSocketHarness();
    const session = createServerSession(socket.socket);
    const pty = createPtyHarness();

    await spawn(socket.socket, ['login'], session, {
      envVersion: () => Promise.resolve(9),
      spawnPty: () => pty.pty,
    });

    socket.trigger('input');
    socket.trigger('input', 42);
    socket.trigger('input', 'wrong binary flag', 'true');
    socket.trigger('input', 'x'.repeat(1_000_001));

    expect(pty.writes).to.have.lengthOf(0);

    socket.trigger('input', 'whoami');
    socket.trigger('input', 'text', false);
    socket.trigger('input', '\u0000', true);

    expect(pty.writes.slice(0, 2)).to.deep.equal(['whoami', 'text']);
    expect(pty.writes[2]).to.deep.equal(Buffer.from('\u0000', 'binary'));
  });

  it('ignores invalid commits without changing flow-control state', async () => {
    const socket = createSocketHarness();
    const session = createServerSession(socket.socket);
    const pty = createPtyHarness();

    await spawn(socket.socket, ['login'], session, {
      envVersion: () => Promise.resolve(9),
      spawnPty: () => pty.pty,
    });
    socket.trigger('commit', 1);
    pty.triggerData('x'.repeat(2_097_153));
    expect(pty.pauseCount).to.equal(1);

    for (const invalid of [
      undefined,
      '262144',
      -1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      2_097_153,
    ]) {
      socket.trigger('commit', invalid);
    }
    expect(pty.resumeCount).to.equal(0);

    for (let index = 0; index < 8; index += 1) {
      socket.trigger('commit', 262_144);
    }
    expect(pty.resumeCount).to.equal(1);

    socket.trigger('commit', 262_144);
    pty.triggerData('x'.repeat(2_097_152));
    expect(pty.pauseCount).to.equal(2);
  });

  it('cancels PTY startup and late events when disconnect wins acquisition', async () => {
    const socket = createSocketHarness();
    const session = createServerSession(socket.socket);
    const pty = createPtyHarness();
    let unrelatedInputCount = 0;
    socket.socket.on('input', () => {
      unrelatedInputCount += 1;
    });

    await spawn(socket.socket, ['login'], session, {
      envVersion: () => Promise.resolve(9),
      spawnPty: () => {
        socket.trigger('disconnect');
        return pty.pty;
      },
    });
    const emissionsAfterDisconnect = socket.emissions.length;
    pty.retainedData()?.('late data');
    pty.retainedExit()?.({ exitCode: 0 });
    socket.trigger('input', 'late input');

    expect(await session.completion).to.equal('socket-disconnect');
    expect(pty.killCount).to.equal(1);
    expect(pty.writes).to.have.lengthOf(0);
    expect(socket.emissions).to.have.lengthOf(emissionsAfterDisconnect);
    expect(unrelatedInputCount).to.equal(1);
  });

  it('settles while command generation remains pending after disconnect', async () => {
    const socket = createSocketHarness();
    const gauge = createGaugeHarness();
    const command = deferred<string[]>();
    let spawnCount = 0;
    const run = runServerSession(socket.socket, {
      connections: gauge.gauge,
      getCommand: () => command.promise,
      spawn: () => {
        spawnCount += 1;
        return Promise.resolve();
      },
    });

    await Promise.resolve();
    socket.trigger('disconnect');

    expect(await run).to.equal('socket-disconnect');
    expect(gauge.active).to.equal(0);
    expect(gauge.decrements).to.equal(1);
    command.resolve(['login']);
    await Promise.resolve();
    expect(spawnCount).to.equal(0);
  });

  it('settles while PTY environment acquisition remains pending', async () => {
    const socket = createSocketHarness();
    const gauge = createGaugeHarness();
    const environmentVersion = deferred<number>();
    const spawnStarted = deferred<undefined>();
    let ptySpawnCount = 0;
    const run = runServerSession(socket.socket, {
      connections: gauge.gauge,
      getCommand: () => Promise.resolve(['login']),
      spawn: async (args, session) => {
        spawnStarted.resolve(undefined);
        await spawn(socket.socket, args, session, {
          envVersion: () => environmentVersion.promise,
          spawnPty: () => {
            ptySpawnCount += 1;
            return createPtyHarness().pty;
          },
        });
      },
    });

    await spawnStarted.promise;
    socket.trigger('disconnect');

    expect(await run).to.equal('socket-disconnect');
    expect(gauge.active).to.equal(0);
    environmentVersion.resolve(9);
    await Promise.resolve();
    await Promise.resolve();
    expect(ptySpawnCount).to.equal(0);
  });

  it('contains cleanup failures and continues settling login', async () => {
    const socket = createSocketHarness();
    const cleanupErrors: unknown[] = [];
    const session = createServerSession(socket.socket, (error) => {
      cleanupErrors.push(error);
    });
    const finalCleanup = sinon.spy();
    session.own(finalCleanup);
    session.own(() => {
      throw new Error('owned cleanup failed');
    });
    const pty = createPtyHarness();
    pty.pty.kill = () => {
      throw new Error('PTY kill failed');
    };
    const pendingLogin = login(socket.socket, session, {
      spawnPty: () => pty.pty,
    });

    expect(() => {
      socket.trigger('disconnect');
    }).not.to.throw();
    let rejection: unknown;
    try {
      await pendingLogin;
    } catch (error) {
      rejection = error;
    }

    expect(rejection).to.be.instanceOf(SessionEndError);
    expect(await session.completion).to.equal('socket-disconnect');
    expect(finalCleanup.calledOnce).to.equal(true);
    expect(cleanupErrors).to.have.lengthOf(2);
  });

  it('kills a PTY once when disconnect and PTY exit race', async () => {
    const socket = createSocketHarness();
    const session = createServerSession(socket.socket);
    const pty = createPtyHarness();

    await spawn(socket.socket, ['login'], session, {
      envVersion: () => Promise.resolve(9),
      spawnPty: () => pty.pty,
    });
    const retainedExit = pty.retainedExit();
    socket.trigger('disconnect');
    retainedExit?.({ exitCode: 0 });
    session.end('disposed');

    expect(await session.completion).to.equal('socket-disconnect');
    expect(pty.killCount).to.equal(1);
    expect(
      socket.emissions.filter(({ event }) => event === 'logout'),
    ).to.have.lengthOf(0);
  });

  it('cancels buffered sends so timers cannot emit after disposal', () => {
    const clock = sinon.useFakeTimers();
    const socket = createSocketHarness();
    const send = tinybuffer(socket.socket, 20, 1024);

    send('pending');
    send.cancel();
    clock.tick(20);

    expect(socket.emissions).to.have.lengthOf(0);
  });
});
