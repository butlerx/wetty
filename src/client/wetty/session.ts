import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '../../protocol/socket-events.js';
import type { Socket } from 'socket.io-client';

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
  let active = true;
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
    if (active) term.resizeTerm();
  }

  function onTerminalData(data: string): void {
    if (active) socket.emit('input', data);
  }

  function onTerminalBinary(data: string): void {
    if (active) socket.emit('input', data, true);
  }

  function onSocketData(data: string): void {
    if (!active) return;
    const remainingData = fileDownloader.buffer(data);
    const downloadLength = data.length - remainingData.length;
    if (downloadLength && flowControl.needsCommit(downloadLength)) {
      socket.emit('commit', flowControl.ackBytes);
    }
    if (!remainingData) return;
    if (flowControl.needsCommit(remainingData.length)) {
      term.write(remainingData, () => {
        if (active) socket.emit('commit', flowControl.ackBytes);
      });
      return;
    }
    term.write(remainingData);
  }

  function onLogin(): void {
    if (!active) return;
    term.writeln('');
    term.resizeTerm();
  }

  function onDisconnect(reason?: string): void {
    if (!active) return;
    dispose();
    showDisconnected(reason);
  }

  function onError(error: string | null): void {
    if (active && error) onDisconnect(error);
  }

  function dispose(): void {
    if (!active) return;
    active = false;
    removeBeforeUnloadListener();
    windowTarget.removeEventListener('resize', onWindowResize, false);
    socket.off('data', onSocketData);
    socket.off('login', onLogin);
    socket.off('logout', onDisconnect);
    socket.off('disconnect', onDisconnect);
    socket.off('error', onError);
    for (const listener of terminalListeners) listener.dispose();
    clearTerminalReference(term);
    term.dispose();
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
  let disposed = false;

  function onConnect(): void {
    if (disposed) return;
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
      if (disposed) return;
      disposed = true;
      dependencies.socket.off('connect', onConnect);
      activeSession?.dispose();
      activeSession = undefined;
    },
  };
}
