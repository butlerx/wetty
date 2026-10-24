import { expect } from 'chai';
import 'mocha';
import { JSDOM } from 'jsdom';
import * as sinon from 'sinon';

import type { Term } from '../term';
import type { Options } from './options';

type ConfigureTerm = (term: Term) => () => void;

const applicationOrigin = 'https://wetty.example';

function createTermHarness() {
  return {
    attachCustomKeyEventHandler: sinon.spy(),
    getSelection: () => '',
    hasSelection: () => false,
    options: {} as Options['xterm'],
    resize: sinon.spy(),
    resizeTerm: sinon.spy(),
  };
}

describe('terminal configuration lifecycle', () => {
  let configureTerm: ConfigureTerm;
  let dom: JSDOM;
  let editorElement: HTMLIFrameElement;
  let editorWindow: Window;

  function dispatchEditorMessage(
    data: unknown,
    origin = applicationOrigin,
  ): void {
    window.dispatchEvent(
      new window.MessageEvent('message', {
        data,
        origin,
        source: editorWindow,
      }),
    );
  }

  before(async () => {
    dom = new JSDOM(
      `<div id="options" class="opened">
        <button class="toggler"></button>
        <iframe class="editor"></iframe>
      </div>
      <div id="functions"><div class="onscreen-buttons active"></div></div>`,
      { url: `${applicationOrigin}/wetty/client/` },
    );
    global.window = dom.window as unknown as Window & typeof globalThis;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    const foundEditor =
      document.querySelector<HTMLIFrameElement>('#options .editor');
    if (foundEditor == null) throw new Error('Editor iframe was not rendered');
    editorElement = foundEditor;
    editorWindow = editorElement.contentWindow as unknown as Window;
    ({ configureTerm } = await import('./configuration'));
  });

  after(() => {
    dom.window.close();
    Reflect.deleteProperty(globalThis, 'window');
    Reflect.deleteProperty(globalThis, 'document');
    Reflect.deleteProperty(globalThis, 'localStorage');
  });

  beforeEach(() => {
    localStorage.clear();
    document.getElementById('options')?.classList.add('opened');
    editorElement.classList.remove('error');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('sends initial options only to the application origin', () => {
    const term = createTermHarness();
    const postMessage = sinon.spy(editorWindow, 'postMessage');
    const dispose = configureTerm(term as unknown as Term);

    expect(postMessage.calledOnce).to.equal(true);
    expect(postMessage.firstCall.args).to.deep.equal([
      {
        type: 'wetty:load',
        config: {
          wettyFitTerminal: true,
          wettyVoid: 0,
          xterm: { fontSize: 14 },
        },
      },
      applicationOrigin,
    ]);

    dispose();
  });

  it('accepts a valid save only from the editor window and persists it', () => {
    const term = createTermHarness();
    const dispose = configureTerm(term as unknown as Term);
    const updated: Options = {
      wettyFitTerminal: true,
      wettyVoid: 0,
      xterm: { fontSize: 22 },
    };

    dispatchEditorMessage({ type: 'wetty:save', config: updated });

    expect(term.options.fontSize).to.equal(22);
    expect(term.resizeTerm.calledOnce).to.equal(true);
    expect(localStorage.options).to.equal(JSON.stringify(updated, null, 2));

    dispose();
  });

  it('ignores the trusted origin when the source is not the editor window', () => {
    const term = createTermHarness();
    const dispose = configureTerm(term as unknown as Term);

    window.dispatchEvent(
      new window.MessageEvent('message', {
        data: {
          type: 'wetty:save',
          config: {
            wettyFitTerminal: true,
            wettyVoid: 0,
            xterm: { fontSize: 22 },
          },
        },
        origin: applicationOrigin,
        source: window,
      }),
    );

    expect(term.options.fontSize).to.equal(14);
    expect(term.resizeTerm.called).to.equal(false);
    expect(localStorage.options).to.equal(undefined);

    dispose();
  });

  it('ignores a foreign origin even when the source is the editor window', () => {
    const term = createTermHarness();
    const dispose = configureTerm(term as unknown as Term);

    dispatchEditorMessage(
      {
        type: 'wetty:save',
        config: {
          wettyFitTerminal: true,
          wettyVoid: 0,
          xterm: { fontSize: 22 },
        },
      },
      'https://attacker.example',
    );

    expect(term.options.fontSize).to.equal(14);
    expect(term.resizeTerm.called).to.equal(false);
    expect(localStorage.options).to.equal(undefined);

    dispose();
  });

  it('does not grant a foreign outer frame editor authority', () => {
    const outer = new JSDOM('', { url: 'https://outer.example/' });
    const term = createTermHarness();
    const dispose = configureTerm(term as unknown as Term);
    Object.defineProperty(window, 'parent', {
      configurable: true,
      value: outer.window,
    });

    window.dispatchEvent(
      new window.MessageEvent('message', {
        data: {
          type: 'wetty:save',
          config: {
            wettyFitTerminal: true,
            wettyVoid: 0,
            xterm: { fontSize: 22 },
          },
        },
        origin: outer.window.location.origin,
        source: outer.window as unknown as Window,
      }),
    );

    expect(term.options.fontSize).to.equal(14);
    expect(term.resizeTerm.called).to.equal(false);
    expect(localStorage.options).to.equal(undefined);

    Object.defineProperty(window, 'parent', {
      configurable: true,
      value: window,
    });
    outer.window.close();
    dispose();
  });

  it('ignores malformed and unknown messages without changing state', () => {
    const term = createTermHarness();
    const dispose = configureTerm(term as unknown as Term);
    const optionsElement = document.getElementById('options');

    for (const data of [
      null,
      'wetty:close',
      { type: 'wetty:unknown' },
      { type: 'wetty:save' },
      { type: 'wetty:save', config: null },
      { type: 'wetty:save', config: { xterm: [] } },
      {
        type: 'wetty:save',
        config: { wettyFitTerminal: 'yes', wettyVoid: 0, xterm: {} },
      },
    ]) {
      dispatchEditorMessage(data);
    }

    expect(term.options.fontSize).to.equal(14);
    expect(term.resizeTerm.called).to.equal(false);
    expect(localStorage.options).to.equal(undefined);
    expect(editorElement.classList.contains('error')).to.equal(false);
    expect(optionsElement?.classList.contains('opened')).to.equal(true);

    dispose();
  });

  it('shows apply errors and recovers after a corrected save', () => {
    let currentOptions: Options['xterm'] = { fontSize: 14 };
    let rejectUpdate = true;
    const term = createTermHarness();
    Object.defineProperty(term, 'options', {
      get: () => currentOptions,
      set: (options: Options['xterm']) => {
        if (rejectUpdate && options.fontSize !== 14) {
          throw new Error('Unsupported option');
        }
        currentOptions = options;
      },
    });
    const dispose = configureTerm(term as unknown as Term);
    const consoleError = sinon.stub(console, 'error');

    dispatchEditorMessage({
      type: 'wetty:save',
      config: {
        wettyFitTerminal: true,
        wettyVoid: 0,
        xterm: { fontSize: 22 },
      },
    });

    expect(editorElement.classList.contains('error')).to.equal(true);
    expect(consoleError.calledOnce).to.equal(true);
    expect(localStorage.options).to.equal(undefined);
    expect(term.resizeTerm.called).to.equal(false);

    rejectUpdate = false;
    const corrected: Options = {
      wettyFitTerminal: true,
      wettyVoid: 0,
      xterm: { fontSize: 23 },
    };
    dispatchEditorMessage({ type: 'wetty:save', config: corrected });

    expect(currentOptions.fontSize).to.equal(23);
    expect(editorElement.classList.contains('error')).to.equal(false);
    expect(localStorage.options).to.equal(JSON.stringify(corrected, null, 2));
    expect(term.resizeTerm.calledOnce).to.equal(true);

    dispose();
  });

  it('closes only for a valid message from the editor', () => {
    const term = createTermHarness();
    const dispose = configureTerm(term as unknown as Term);
    const optionsElement = document.getElementById('options');

    dispatchEditorMessage({ type: 'wetty:close' });

    expect(optionsElement?.classList.contains('opened')).to.equal(false);

    dispose();
  });

  it('keeps an open editor bound only to the replacement terminal', () => {
    const first = createTermHarness();
    const replacement = createTermHarness();
    const disposeFirst = configureTerm(first as unknown as Term);

    disposeFirst();
    const disposeReplacement = configureTerm(replacement as unknown as Term);
    const optionsElement = document.getElementById('options');
    const updated: Options = {
      wettyFitTerminal: true,
      wettyVoid: 0,
      xterm: { fontSize: 22 },
    };

    expect(optionsElement?.classList.contains('opened')).to.equal(true);
    dispatchEditorMessage({ type: 'wetty:save', config: updated });

    expect(first.options.fontSize).to.equal(14);
    expect(replacement.options.fontSize).to.equal(22);
    expect(first.resizeTerm.called).to.equal(false);
    expect(replacement.resizeTerm.calledOnce).to.equal(true);
    expect(optionsElement?.classList.contains('opened')).to.equal(true);

    disposeReplacement();
    disposeReplacement();
  });
});
