import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '../../../protocol/socket-events.js';
import type { Socket } from 'socket.io-client';

type BrowserSessionState = { status: 'active' } | { status: 'disposed' };
type SessionControllerState = { status: 'active' } | { status: 'disposed' };

interface Disposable {
  dispose(): void;
}

interface FileDownloader {
  buffer(data: string): string;
}

interface FlowControl {
  ackBytes: number;
  needsCommit(length: number): boolean;
}

export interface SessionTerminal {
  dispose(): void;
  focus(): void;
  input(data: string, wasUserInput?: boolean): void;
  onBinary(callback: (data: string) => void): Disposable;
  onData(callback: (data: string) => void): Disposable;
  resizeTerm(): void;
  write(data: string, callback?: () => void): void;
  writeln(data: string): void;
}

interface SessionWindowTarget {
  addEventListener(
    event: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener(
    event: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;
}

export interface BrowserSessionDependencies {
  socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  windowTarget: SessionWindowTarget;
  beforeUnloadHandler: EventListener;
  createTerminal: () => SessionTerminal | undefined;
  createFileDownloader: () => FileDownloader;
  createFlowControl: () => FlowControl;
  enableMobileKeyboard: () => void;
  showConnected: () => void;
  showDisconnected: (reason?: string) => void;
  setTerminalReference: (term: SessionTerminal) => void;
  clearTerminalReference: (term: SessionTerminal) => void;
}

export interface BrowserSession {
  dispose(): void;
}

export function createBrowserSession(
  dependencies: BrowserSessionDependencies,
): BrowserSession | undefined {
  const {
    beforeUnloadHandler,
    clearTerminalReference,
    createFileDownloader,
    createFlowControl,
    createTerminal,
    enableMobileKeyboard,
    setTerminalReference,
    showConnected,
    showDisconnected,
    socket,
    windowTarget,
  } = dependencies;
  const createdTerminal = createTerminal();
  if (createdTerminal === undefined) return undefined;
  const term: SessionTerminal = createdTerminal;

  const fileDownloader = createFileDownloader();
  const flowControl = createFlowControl();
  const terminalListeners: Disposable[] = [];
  let state: BrowserSessionState = { status: 'active' };
  let beforeUnloadAttached = false;

  function removeBeforeUnloadListener(): void {
    if (!beforeUnloadAttached) return;
    windowTarget.removeEventListener(
      'beforeunload',
      beforeUnloadHandler,
      false,
    );
    beforeUnloadAttached = false;
  }

  function onWindowResize(): void {
    if (state.status === 'active') term.resizeTerm();
  }

  function onTerminalData(data: string): void {
    if (state.status === 'active') socket.emit('input', data);
  }

  function onTerminalBinary(data: string): void {
    if (state.status === 'active') socket.emit('input', data, true);
  }

  function onSocketData(data: string): void {
    if (state.status === 'disposed') return;
    const remainingData = fileDownloader.buffer(data);
    const downloadLength = data.length - remainingData.length;
    if (downloadLength && flowControl.needsCommit(downloadLength)) {
      socket.emit('commit', flowControl.ackBytes);
    }
    if (!remainingData) return;
    if (flowControl.needsCommit(remainingData.length)) {
      term.write(remainingData, () => {
        if (state.status === 'active') {
          socket.emit('commit', flowControl.ackBytes);
        }
      });
      return;
    }
    term.write(remainingData);
  }

  function onLogin(): void {
    if (state.status === 'disposed') return;
    term.writeln('');
    term.resizeTerm();
  }

  function onDisconnect(reason?: string): void {
    if (state.status === 'disposed') return;
    try {
      dispose();
    } finally {
      showDisconnected(reason);
    }
  }

  function onError(error: string | null): void {
    if (state.status === 'active' && error) onDisconnect(error);
  }

  function cleanup(action: () => void): void {
    try {
      action();
    } catch {
      // Continue releasing the remaining resources for this dead session.
    }
  }

  function dispose(): void {
    if (state.status === 'disposed') return;
    state = { status: 'disposed' };
    cleanup(removeBeforeUnloadListener);
    cleanup(() => {
      windowTarget.removeEventListener('resize', onWindowResize, false);
    });
    cleanup(() => {
      socket.off('data', onSocketData);
    });
    cleanup(() => {
      socket.off('login', onLogin);
    });
    cleanup(() => {
      socket.off('logout', onDisconnect);
    });
    cleanup(() => {
      socket.off('disconnect', onDisconnect);
    });
    cleanup(() => {
      socket.off('error', onError);
    });
    for (const listener of terminalListeners) {
      cleanup(() => {
        listener.dispose();
      });
    }
    cleanup(() => {
      clearTerminalReference(term);
    });
    cleanup(() => {
      term.dispose();
    });
  }

  try {
    setTerminalReference(term);
    terminalListeners.push(term.onData(onTerminalData));
    terminalListeners.push(term.onBinary(onTerminalBinary));
    socket.on('data', onSocketData);
    socket.on('login', onLogin);
    socket.on('logout', onDisconnect);
    socket.on('disconnect', onDisconnect);
    socket.on('error', onError);
    windowTarget.addEventListener('beforeunload', beforeUnloadHandler, false);
    beforeUnloadAttached = true;
    windowTarget.addEventListener('resize', onWindowResize, false);
    showConnected();
    term.resizeTerm();
    term.focus();
    enableMobileKeyboard();
  } catch (error) {
    dispose();
    throw error;
  }

  return { dispose };
}

export function createSessionController(
  dependencies: BrowserSessionDependencies,
): BrowserSession {
  let activeSession: BrowserSession | undefined;
  let state: SessionControllerState = { status: 'active' };

  function onConnect(): void {
    if (state.status === 'disposed') return;
    activeSession?.dispose();
    activeSession = undefined;
    try {
      activeSession = createBrowserSession(dependencies);
    } catch {
      dependencies.showDisconnected('Terminal initialization failed');
      return;
    }
    if (activeSession === undefined) {
      dependencies.showDisconnected('Terminal initialization failed');
    }
  }

  dependencies.socket.on('connect', onConnect);

  return {
    dispose(): void {
      if (state.status === 'disposed') return;
      state = { status: 'disposed' };
      dependencies.socket.off('connect', onConnect);
      activeSession?.dispose();
      activeSession = undefined;
    },
  };
}
