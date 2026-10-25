import { expect } from 'chai';
import 'mocha';
import * as sinon from 'sinon';

import {
  createBrowserSession,
  createSessionController,
  type BrowserSessionDependencies,
  type SessionTerminal,
} from './wetty/term/session';
import type { Socket } from 'socket.io-client';

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

function createEventTargetHarness() {
  const listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();
  const target = {
    addEventListener(
      event: string,
      listener: EventListenerOrEventListenerObject,
    ) {
      const eventListeners =
        listeners.get(event) ?? new Set<EventListenerOrEventListenerObject>();
      eventListeners.add(listener);
      listeners.set(event, eventListeners);
    },
    removeEventListener(
      event: string,
      listener: EventListenerOrEventListenerObject,
    ) {
      listeners.get(event)?.delete(listener);
    },
  };

  return {
    target,
    listenerCount: (event: string) => listeners.get(event)?.size ?? 0,
    trigger(event: string) {
      for (const listener of [...(listeners.get(event) ?? [])]) {
        if (typeof listener === 'function') listener(new Event(event));
        else listener.handleEvent(new Event(event));
      }
    },
  };
}

function createTerminalHarness() {
  const callbacks = {
    binary: [] as ((data: string) => void)[],
    data: [] as ((data: string) => void)[],
  };
  const activeCallbacks = {
    binary: new Set<(data: string) => void>(),
    data: new Set<(data: string) => void>(),
  };
  const writes: { data: string; callback?: () => void }[] = [];
  const term = {
    dispose: sinon.spy(),
    focus: sinon.spy(),
    input: sinon.spy(),
    resizeTerm: sinon.spy(),
    write(data: string, callback?: () => void) {
      writes.push({ data, callback });
    },
    writeln: sinon.spy(),
    onBinary(callback: (data: string) => void) {
      callbacks.binary.push(callback);
      activeCallbacks.binary.add(callback);
      return { dispose: () => activeCallbacks.binary.delete(callback) };
    },
    onData(callback: (data: string) => void) {
      callbacks.data.push(callback);
      activeCallbacks.data.add(callback);
      return { dispose: () => activeCallbacks.data.delete(callback) };
    },
  } satisfies SessionTerminal;

  return {
    term,
    writes,
    retainedData: () => callbacks.data[0],
    triggerBinary(data: string) {
      for (const callback of [...activeCallbacks.binary]) callback(data);
    },
    triggerData(data: string) {
      for (const callback of [...activeCallbacks.data]) callback(data);
    },
  };
}

function createSessionHarness(terminals: (SessionTerminal | undefined)[]) {
  const socket = createSocketHarness();
  const windowTarget = createEventTargetHarness();
  const state = {
    connectedCount: 0,
    disconnectedReason: undefined as string | undefined,
    mobileKeyboardCount: 0,
    overlayVisible: true,
    terminalReference: undefined as SessionTerminal | undefined,
  };
  const dependencies: BrowserSessionDependencies = {
    socket: socket.socket,
    windowTarget: windowTarget.target,
    beforeUnloadHandler: () => undefined,
    createTerminal: () => terminals.shift(),
    createFileDownloader: () => ({ buffer: (data: string) => data }),
    createFlowControl: () => ({
      ackBytes: 1,
      needsCommit: () => true,
    }),
    enableMobileKeyboard: () => {
      state.mobileKeyboardCount += 1;
    },
    showConnected: () => {
      state.connectedCount += 1;
      state.overlayVisible = false;
      state.disconnectedReason = undefined;
    },
    showDisconnected: (reason?: string) => {
      state.overlayVisible = true;
      state.disconnectedReason = reason ?? 'Session ended';
    },
    setTerminalReference: (term) => {
      state.terminalReference = term;
    },
    clearTerminalReference: (term) => {
      if (state.terminalReference === term) state.terminalReference = undefined;
    },
  };

  return { dependencies, socket, state, windowTarget };
}

describe('browser terminal session lifecycle', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('keeps one active handler set across repeated reconnects', () => {
    const first = createTerminalHarness();
    const second = createTerminalHarness();
    const third = createTerminalHarness();
    const harness = createSessionHarness([first.term, second.term, third.term]);
    const controller = createSessionController(harness.dependencies);

    expect(harness.socket.listenerCount('connect')).to.equal(1);
    harness.socket.trigger('connect');
    harness.socket.trigger('connect');
    harness.socket.trigger('connect');

    expect(first.term.dispose.calledOnce).to.equal(true);
    expect(second.term.dispose.calledOnce).to.equal(true);
    expect(third.term.dispose.called).to.equal(false);
    expect(harness.socket.listenerCount('data')).to.equal(1);
    expect(harness.socket.listenerCount('disconnect')).to.equal(1);
    expect(harness.windowTarget.listenerCount('resize')).to.equal(1);
    expect(harness.windowTarget.listenerCount('beforeunload')).to.equal(1);

    harness.socket.trigger('data', 'server output');
    third.triggerData('input');
    third.triggerBinary('binary');
    harness.windowTarget.trigger('resize');

    expect(first.writes).to.have.length(0);
    expect(second.writes).to.have.length(0);
    expect(third.writes.map(({ data }) => data)).to.deep.equal([
      'server output',
    ]);
    expect(
      harness.socket.emissions.filter(({ event }) => event === 'input'),
    ).to.have.length(2);
    expect(
      harness.socket.emissions.filter(({ event }) => event === 'resize'),
    ).to.have.length(0);
    expect(third.term.resizeTerm.calledTwice).to.equal(true);

    controller.dispose();
  });

  it('makes retained callbacks from a disposed session inert', () => {
    const first = createTerminalHarness();
    const second = createTerminalHarness();
    const harness = createSessionHarness([first.term, second.term]);
    const controller = createSessionController(harness.dependencies);

    harness.socket.trigger('connect');
    harness.socket.trigger('data', 'first output');
    const delayedCommit = first.writes[0]?.callback;
    const staleSocketData = harness.socket.retained('data', 0);
    const staleTerminalData = first.retainedData();
    harness.socket.trigger('connect');
    const emissionsBeforeStaleCallbacks = harness.socket.emissions.length;

    delayedCommit?.();
    staleSocketData?.('stale output');
    staleTerminalData('stale input');

    expect(first.writes).to.have.length(1);
    expect(second.writes).to.have.length(0);
    expect(harness.socket.emissions).to.have.length(
      emissionsBeforeStaleCallbacks,
    );

    controller.dispose();
  });

  it('preserves visible disconnect, reconnect, and creation-failure states', () => {
    const first = createTerminalHarness();
    const replacement = createTerminalHarness();
    const harness = createSessionHarness([
      first.term,
      replacement.term,
      undefined,
    ]);
    const controller = createSessionController(harness.dependencies);

    harness.socket.trigger('connect');
    expect(harness.state.overlayVisible).to.equal(false);
    expect(first.term.focus.calledOnce).to.equal(true);

    harness.socket.trigger('disconnect', 'transport closed');
    expect(harness.state.overlayVisible).to.equal(true);
    expect(harness.state.disconnectedReason).to.equal('transport closed');
    expect(first.term.dispose.calledOnce).to.equal(true);
    const emissionsAfterDisconnect = harness.socket.emissions.length;
    first.triggerData('stale input');
    first.triggerBinary('stale binary');
    harness.windowTarget.trigger('resize');
    expect(harness.socket.emissions).to.have.length(emissionsAfterDisconnect);

    harness.socket.trigger('connect');
    expect(harness.state.overlayVisible).to.equal(false);
    expect(replacement.term.focus.calledOnce).to.equal(true);

    harness.socket.trigger('connect');
    expect(replacement.term.dispose.calledOnce).to.equal(true);
    expect(harness.state.overlayVisible).to.equal(true);
    expect(harness.state.disconnectedReason).to.equal(
      'Terminal initialization failed',
    );
    expect(harness.state.terminalReference).to.equal(undefined);

    controller.dispose();
  });

  it('releases earlier subscriptions when later initialization fails', () => {
    const firstListenerDispose = sinon.spy();
    const term = {
      dispose: sinon.spy(),
      focus: sinon.spy(),
      input: sinon.spy(),
      onBinary: () => {
        throw new Error('binary subscription failed');
      },
      onData: () => ({ dispose: firstListenerDispose }),
      resizeTerm: sinon.spy(),
      write: sinon.spy(),
      writeln: sinon.spy(),
    } satisfies SessionTerminal;
    const harness = createSessionHarness([term]);

    expect(() => createBrowserSession(harness.dependencies)).to.throw(
      'binary subscription failed',
    );

    expect(firstListenerDispose.calledOnce).to.equal(true);
    expect(term.dispose.calledOnce).to.equal(true);
    expect(harness.state.terminalReference).to.equal(undefined);
  });

  it('allows repeated disposal without clearing a replacement reference', () => {
    const first = createTerminalHarness();
    const replacement = createTerminalHarness();
    const harness = createSessionHarness([first.term, replacement.term]);
    const firstSession = createBrowserSession(harness.dependencies);

    firstSession?.dispose();
    const replacementSession = createBrowserSession(harness.dependencies);
    firstSession?.dispose();

    expect(first.term.dispose.calledOnce).to.equal(true);
    expect(harness.state.terminalReference).to.equal(replacement.term);

    replacementSession?.dispose();
    replacementSession?.dispose();
    expect(replacement.term.dispose.calledOnce).to.equal(true);
    expect(harness.state.terminalReference).to.equal(undefined);
  });
});
