export interface KillablePty {
  readonly pid?: number;
  kill(signal?: string): void;
}

type SignalProcess = (pid: number, signal: NodeJS.Signals | 0) => void;

function processIsGone(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ESRCH'
  );
}

export function terminatePty(
  term: KillablePty,
  signalProcess: SignalProcess = (pid, signal) => {
    process.kill(pid, signal);
  },
): void {
  let gracefulError: unknown;
  try {
    term.kill();
  } catch (error) {
    gracefulError = error;
  }

  if (process.platform === 'win32' || term.pid === undefined || term.pid <= 0) {
    if (gracefulError !== undefined) {
      throw gracefulError instanceof Error
        ? gracefulError
        : new Error('PTY termination failed', { cause: gracefulError });
    }
    return;
  }

  try {
    signalProcess(term.pid, 0);
  } catch (error) {
    if (processIsGone(error)) return;
    gracefulError ??= error;
  }

  try {
    signalProcess(term.pid, 'SIGKILL');
  } catch (forcedError) {
    throw new AggregateError(
      gracefulError === undefined
        ? [forcedError]
        : [gracefulError, forcedError],
      'Unable to terminate PTY',
    );
  }
}
