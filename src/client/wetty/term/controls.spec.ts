import { expect } from 'chai';
import 'mocha';
import { JSDOM } from 'jsdom';
import * as sinon from 'sinon';

import { createTerminalControls, type TerminalControls } from './controls';

interface FakeTerminal {
  focus: sinon.SinonSpy;
  input: sinon.SinonSpy;
}

describe('terminal controls lifecycle', () => {
  let controls: TerminalControls;
  let dom: JSDOM;
  let windowTarget: Window;

  beforeEach(() => {
    dom = new JSDOM(`
      <button id="onscreen-ctrl"></button>
      <div id="functions"><div class="onscreen-buttons"></div></div>
      <div id="options" class="opened"></div>
    `);
    windowTarget = dom.window as unknown as Window;
    controls = createTerminalControls(windowTarget, dom.window.document);
    controls.install();
  });

  afterEach(() => {
    controls.reset();
    dom.window.close();
    sinon.restore();
  });

  it('installs global control sequences and panel toggling once', () => {
    const terminal: FakeTerminal = {
      focus: sinon.spy(),
      input: sinon.spy(),
    };
    windowTarget.wetty_term = terminal;
    controls.install();

    windowTarget.toggleCTRL?.();
    windowTarget.pressESC?.();
    windowTarget.pressUP?.();
    windowTarget.pressDOWN?.();
    windowTarget.pressTAB?.();
    windowTarget.pressLEFT?.();
    windowTarget.pressRIGHT?.();

    expect(terminal.input.args).to.deep.equal([
      ['\x1B', false],
      ['\x1B[A', false],
      ['\x1B[B', false],
      ['\x09', false],
      ['\x1B[D', false],
      ['\x1B[C', false],
    ]);
    expect(
      dom.window.document
        .querySelector('#onscreen-ctrl')
        ?.classList.contains('active'),
    ).to.equal(false);

    windowTarget.toggleFunctions?.();
    expect(
      dom.window.document
        .querySelector('.onscreen-buttons')
        ?.classList.contains('active'),
    ).to.equal(true);
    expect(
      dom.window.document
        .querySelector('#options')
        ?.classList.contains('opened'),
    ).to.equal(false);
    windowTarget.toggleFunctions?.();
    expect(
      dom.window.document
        .querySelector('.onscreen-buttons')
        ?.classList.contains('active'),
    ).to.equal(false);
  });

  it('clears latched CTRL state and delayed input during disposal', () => {
    const clock = sinon.useFakeTimers();
    const terminal: FakeTerminal = {
      focus: sinon.spy(),
      input: sinon.spy(),
    };
    windowTarget.wetty_term = terminal;

    windowTarget.toggleCTRL?.();
    dom.window.document.dispatchEvent(
      new dom.window.KeyboardEvent('keyup', { key: 'a' }),
    );
    expect(terminal.input.calledOnceWith('\x01', false)).to.equal(true);

    controls.reset();
    clock.tick(100);

    expect(terminal.input.calledOnce).to.equal(true);
    expect(
      dom.window.document
        .querySelector('#onscreen-ctrl')
        ?.classList.contains('active'),
    ).to.equal(false);

    const replacement: FakeTerminal = {
      focus: sinon.spy(),
      input: sinon.spy(),
    };
    windowTarget.wetty_term = replacement;
    dom.window.document.dispatchEvent(
      new dom.window.KeyboardEvent('keyup', { key: 'b' }),
    );
    expect(replacement.input.called).to.equal(false);
  });
});
