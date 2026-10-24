import { expect } from 'chai';
import 'mocha';
import { JSDOM } from 'jsdom';
import * as sinon from 'sinon';

import type { Term } from '../term';
import type { Options } from './options';

type ConfigureTerm = (term: Term) => () => void;

function createTermHarness() {
  const term = {
    attachCustomKeyEventHandler: sinon.spy(),
    getSelection: () => '',
    hasSelection: () => false,
    options: {} as Options['xterm'],
    resize: sinon.spy(),
    resizeTerm: sinon.spy(),
  };
  return term;
}

describe('terminal configuration lifecycle', () => {
  let configureTerm: ConfigureTerm;
  let dom: JSDOM;

  before(async () => {
    dom = new JSDOM(
      `<div id="options" class="opened">
        <button class="toggler"></button>
        <iframe class="editor"></iframe>
      </div>
      <div id="functions"><div class="onscreen-buttons active"></div></div>`,
      { url: 'https://wetty.example/' },
    );
    global.window = dom.window as unknown as Window & typeof globalThis;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
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
  });

  afterEach(() => {
    sinon.restore();
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
    window.dispatchEvent(
      new window.MessageEvent('message', {
        data: { type: 'wetty:save', config: updated },
      }),
    );

    expect(first.options.fontSize).to.equal(14);
    expect(replacement.options.fontSize).to.equal(22);
    expect(first.resizeTerm.called).to.equal(false);
    expect(replacement.resizeTerm.calledOnce).to.equal(true);
    expect(optionsElement?.classList.contains('opened')).to.equal(true);

    disposeReplacement();
    disposeReplacement();
  });
});
