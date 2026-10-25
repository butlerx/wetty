import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '../protocol/socket-events.js';
import type { Socket } from 'socket.io';

export type SessionEndReason =
  | 'socket-disconnect'
  | 'pty-exit'
  | 'login-rejected'
  | 'command-failure'
  | 'spawn-failure'
  | 'disposed';

type Cleanup = () => void;
type ServerSessionState =
  { status: 'active' } | { status: 'ended'; reason: SessionEndReason };

export interface ServerSession {
  readonly active: boolean;
  readonly completion: Promise<SessionEndReason>;
  readonly reason: SessionEndReason | undefined;
  readonly signal: AbortSignal;
  end(reason: SessionEndReason): void;
  own(cleanup: Cleanup): Cleanup;
  reportCleanupError(error: unknown): void;
}

export class SessionEndError extends Error {
  public readonly reason: SessionEndReason;

  constructor(reason: SessionEndReason, message: string) {
    super(message);
    this.name = 'SessionEndError';
    this.reason = reason;
  }
}

export function createServerSession(
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  onCleanupError: (error: unknown) => void = () => undefined,
): ServerSession {
  const abortController = new AbortController();
  const cleanups: Cleanup[] = [];
  let state: ServerSessionState = { status: 'active' };
  let resolveCompletion: (reason: SessionEndReason) => void = () => undefined;
  const completion = new Promise<SessionEndReason>((resolve) => {
    resolveCompletion = resolve;
  });

  function reportCleanupError(error: unknown): void {
    try {
      onCleanupError(error);
    } catch {
      // Cleanup reporting must not interrupt the remaining cleanup work.
    }
  }

  function own(cleanup: Cleanup): Cleanup {
    let owned = true;
    function release(): void {
      if (!owned) return;
      owned = false;
      const index = cleanups.indexOf(release);
      if (index !== -1) cleanups.splice(index, 1);
      try {
        cleanup();
      } catch (error) {
        reportCleanupError(error);
      }
    }

    if (state.status === 'active') cleanups.push(release);
    else release();
    return release;
  }

  function end(reason: SessionEndReason): void {
    if (state.status === 'ended') return;
    state = { status: 'ended', reason };
    try {
      socket.off('disconnect', onDisconnect);
    } catch (error) {
      reportCleanupError(error);
    }
    try {
      abortController.abort();
    } catch (error) {
      reportCleanupError(error);
    }
    for (const cleanup of [...cleanups].reverse()) cleanup();
    resolveCompletion(reason);
  }

  function onDisconnect(): void {
    end('socket-disconnect');
  }

  const session: ServerSession = {
    get active() {
      return state.status === 'active';
    },
    completion,
    get reason() {
      return state.status === 'ended' ? state.reason : undefined;
    },
    signal: abortController.signal,
    end,
    own,
    reportCleanupError,
  };

  socket.on('disconnect', onDisconnect);
  return session;
}

interface ConnectionGauge {
  inc(): void;
  dec(): void;
}

export interface ServerSessionRunnerDependencies {
  connections: ConnectionGauge;
  getCommand(session: ServerSession): Promise<string[]>;
  spawn(args: string[], session: ServerSession): Promise<void>;
  onCommand?(args: string[]): void;
  onError?(error: unknown): void;
  onCleanupError?(error: unknown): void;
}

const sessionEnded: unique symbol = Symbol('session-ended');

async function raceSessionStage<T>(
  session: ServerSession,
  operation: Promise<T>,
): Promise<T | typeof sessionEnded> {
  const settled = operation.then(
    (value) => ({ status: 'fulfilled' as const, value }),
    (error: unknown) => ({ status: 'rejected' as const, error }),
  );
  const outcome = await Promise.race([
    settled,
    session.completion.then(() => ({ status: 'ended' as const })),
  ]);
  if (outcome.status === 'ended') return sessionEnded;
  if (outcome.status === 'rejected') throw outcome.error;
  return outcome.value;
}

export async function runServerSession(
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  dependencies: ServerSessionRunnerDependencies,
): Promise<SessionEndReason> {
  const session = createServerSession(socket, (error) => {
    dependencies.onCleanupError?.(error);
  });
  let stage: 'command' | 'spawn' = 'command';
  dependencies.connections.inc();

  try {
    const args = await raceSessionStage(
      session,
      dependencies.getCommand(session),
    );
    if (args !== sessionEnded && session.active) {
      dependencies.onCommand?.(args);
      stage = 'spawn';
      await raceSessionStage(session, dependencies.spawn(args, session));
    }
    if (session.active) await session.completion;
  } catch (error) {
    if (session.active) {
      let reason: SessionEndReason;
      if (error instanceof SessionEndError) reason = error.reason;
      else if (stage === 'command') reason = 'command-failure';
      else reason = 'spawn-failure';
      session.end(reason);
    }
    dependencies.onError?.(error);
  } finally {
    session.end('disposed');
    dependencies.connections.dec();
  }

  return session.completion;
}
