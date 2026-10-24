import { dirname, resolve as resolvePath } from 'path';
import { fileURLToPath } from 'url';
import pty from 'node-pty';
import { SessionEndError } from './session.js';
import { writePtyInput } from './shared/input.js';
import { xterm } from './shared/xterm.js';
import type { ServerSession } from './session.js';
import type SocketIO from 'socket.io';

interface Disposable {
  dispose(): void;
}

export interface LoginPty {
  kill(): void;
  onData(listener: (data: string) => void): Disposable;
  onExit(listener: (event: { exitCode: number }) => void): Disposable;
  write(data: string | Buffer): void;
}

interface LoginDependencies {
  spawnPty(): LoginPty;
}

const executable = resolvePath(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'buffer.js',
);

function isSessionActive(session: ServerSession): boolean {
  return session.active;
}

export function login(
  socket: SocketIO.Socket,
  session: ServerSession,
  dependencies: LoginDependencies = {
    spawnPty: () => pty.spawn('/usr/bin/env', ['node', executable], xterm),
  },
): Promise<string> {
  if (!isSessionActive(session)) {
    return Promise.reject(
      new SessionEndError(
        session.reason ?? 'login-rejected',
        'Session ended before interactive login',
      ),
    );
  }

  // Request carries no username information, so create a temporary terminal.
  const term = dependencies.spawnPty();
  let killed = false;
  function terminate(): void {
    if (killed) return;
    killed = true;
    term.kill();
  }

  if (!isSessionActive(session)) {
    terminate();
    return Promise.reject(
      new SessionEndError(
        session.reason ?? 'login-rejected',
        'Session ended during interactive login startup',
      ),
    );
  }

  return new Promise<string>((resolve, reject) => {
    let buffer = '';
    let exited = false;
    let released = false;
    let settled = false;
    let dataListener: Disposable | undefined;
    let exitListener: Disposable | undefined;
    let releaseOwnership: (() => void) | undefined;

    function resourcesReleased(): boolean {
      return released;
    }

    function cleanup(action: () => void): void {
      try {
        action();
      } catch (error) {
        session.reportCleanupError(error);
      }
    }

    function releaseResources(): void {
      if (released) return;
      released = true;
      cleanup(() => {
        socket.off('input', onInput);
      });
      cleanup(() => {
        socket.off('disconnect', onDisconnect);
      });
      cleanup(() => {
        session.signal.removeEventListener('abort', onAbort);
      });
      cleanup(() => {
        dataListener?.dispose();
      });
      cleanup(() => {
        exitListener?.dispose();
      });
      if (!exited) cleanup(terminate);
    }

    function release(): void {
      if (releaseOwnership === undefined) releaseResources();
      else releaseOwnership();
    }

    function resolveLogin(): void {
      if (settled) return;
      settled = true;
      release();
      resolve(buffer);
    }

    function rejectLogin(reason: string): void {
      if (settled) return;
      settled = true;
      const endReason = session.reason ?? 'login-rejected';
      release();
      reject(new SessionEndError(endReason, reason));
    }

    function onInput(input: string, binary?: unknown): void {
      if (settled || !session.active) return;
      const isBinary = binary === true;
      writePtyInput(term, input, isBinary);
      if (isBinary) return;
      // eslint-disable-next-line no-control-regex
      buffer = /\x0177/.exec(input) ? buffer.slice(0, -1) : buffer + input;
    }

    function onDisconnect(): void {
      rejectLogin('Client disconnected during interactive login');
    }

    function onAbort(): void {
      rejectLogin('Interactive login aborted');
    }

    try {
      socket.on('input', onInput);
      socket.on('disconnect', onDisconnect);
      session.signal.addEventListener('abort', onAbort, { once: true });
      dataListener = term.onData((data: string) => {
        if (!settled && session.active) socket.emit('data', data);
      });
      if (!isSessionActive(session)) {
        cleanup(() => {
          dataListener?.dispose();
        });
        onAbort();
        return;
      }
      exitListener = term.onExit(({ exitCode }) => {
        if (settled || !session.active) return;
        exited = true;
        // eslint-disable-next-line no-console
        console.error(`Process exited with code: ${String(exitCode)}`);
        resolveLogin();
      });
      if (!isSessionActive(session)) {
        cleanup(() => {
          exitListener?.dispose();
        });
        onAbort();
        return;
      }
      releaseOwnership = session.own(releaseResources);
      if (resourcesReleased()) releaseOwnership();
      else if (!isSessionActive(session)) onAbort();
    } catch (error) {
      release();
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}
