interface Disposable {
  dispose(): void;
}

export interface KillablePty {
  readonly pid?: number;
  kill(signal?: string): void;
  onExit(listener: (event: { exitCode: number }) => void): Disposable;
}

type SignalProcess = (pid: number, signal: NodeJS.Signals | 0) => void;

interface TerminationOptions {
  graceMs?: number;
  reportError?: (error: unknown) => void;
  signalProcess?: SignalProcess;
}

function processIsGone(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ESRCH'
  );
}

export function terminatePty(
  term: KillablePty,
  {
    graceMs = 250,
    reportError = () => undefined,
    signalProcess = (pid, signal) => {
      process.kill(pid, signal);
    },
  }: TerminationOptions = {},
): void {
  let escalation: NodeJS.Timeout | undefined;
  const exitListener = term.onExit(() => {
    if (escalation !== undefined) clearTimeout(escalation);
    exitListener.dispose();
  });

  let gracefulError: unknown;
  try {
    term.kill();
  } catch (error) {
    gracefulError = error;
  }

  if (process.platform === 'win32' || term.pid === undefined || term.pid <= 0) {
    exitListener.dispose();
    if (gracefulError !== undefined) reportError(gracefulError);
    return;
  }

  escalation = setTimeout(() => {
    try {
      signalProcess(term.pid ?? 0, 0);
    } catch (error) {
      exitListener.dispose();
      if (!processIsGone(error)) reportError(gracefulError ?? error);
      return;
    }

    try {
      signalProcess(term.pid ?? 0, 'SIGKILL');
    } catch (forcedError) {
      reportError(
        new AggregateError(
          gracefulError === undefined
            ? [forcedError]
            : [gracefulError, forcedError],
          'Unable to terminate PTY',
        ),
      );
    } finally {
      exitListener.dispose();
    }
  }, graceMs);
  escalation.unref();
}
