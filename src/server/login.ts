import { dirname, resolve as resolvePath } from 'path';
import { fileURLToPath } from 'url';
import pty from 'node-pty';
import {
  parseInputPayload,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from '../protocol/socket-events.js';
import { logger as getLogger } from './observability/logger.js';
import { writePtyInput } from './pty/input.js';
import { xterm } from './pty/options.js';
import { terminatePty } from './pty/terminate.js';
import { SessionEndError } from './session.js';
import type { ServerSession } from './session.js';
import type { Socket } from 'socket.io';

interface Disposable {
  dispose(): void;
}

export interface LoginPty {
  readonly pid: number;
  kill(signal?: string): void;
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
const MAX_INTERACTIVE_LOGIN_LENGTH = 256;

function isSessionActive(session: ServerSession): boolean {
  return session.active;
}

export function login(
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  session: ServerSession,
  dependencies: LoginDependencies = {
    spawnPty: () => pty.spawn('/usr/bin/env', ['node', executable], xterm),
  },
): Promise<string> {
  const logger = getLogger();
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
  let ptyStatus: 'running' | 'exited' | 'terminated' = 'running';
  function terminate(): void {
    if (ptyStatus !== 'running') return;
    terminatePty(term, {
      reportError: (error) => {
        session.reportCleanupError(error);
      },
    });
    ptyStatus = 'terminated';
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
      if (ptyStatus === 'running') cleanup(terminate);
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

    function onInput(input: string, binary?: boolean): void {
      if (settled || !session.active) return;
      const payload = parseInputPayload(input, binary);
      if (payload === undefined) {
        logger.debug('Ignoring invalid interactive login input');
        return;
      }
      if (payload.binary) {
        logger.debug('Ignoring binary interactive login input');
        return;
      }
      let updatedBuffer = buffer;
      for (const character of payload.input) {
        updatedBuffer =
          character === '\x7F'
            ? updatedBuffer.slice(0, -1)
            : updatedBuffer + character;
        if (updatedBuffer.length > MAX_INTERACTIVE_LOGIN_LENGTH) {
          logger.warn('Interactive login input exceeded the username limit');
          session.end('login-rejected');
          return;
        }
      }
      writePtyInput(term, payload.input, false);
      buffer = updatedBuffer;
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
        ptyStatus = 'exited';
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
