import { expect } from 'chai';
import 'mocha';
import * as sinon from 'sinon';
import { modifierHandler } from './confiruragtion';

describe('modifierHandler', () => {
  let inputStub: sinon.SinonStub;

  beforeEach(() => {
    inputStub = sinon.stub();
    (window as any).wetty_term = {
      input: inputStub
    };
  });

  afterEach(() => {
    delete (window as any).wetty_term;
    sinon.restore();
  });

  it('should allow normal Enter to pass through', () => {
    const event = {
      type: 'keydown',
      key: 'Enter',
      shiftKey: false,
      altKey: false,
      ctrlKey: false,
      metaKey: false
    } as KeyboardEvent;

    const result = modifierHandler(event);
    expect(result).to.be.true;
    expect(inputStub.called).to.be.false;
  });

  it('should intercept Shift+Enter and send CSI u sequence', () => {
    const event = {
      type: 'keydown',
      key: 'Enter',
      shiftKey: true,
      altKey: false,
      ctrlKey: false,
      metaKey: false
    } as KeyboardEvent;

    const result = modifierHandler(event);
    expect(result).to.be.false;
    expect(inputStub.calledOnceWith('\x1b[13;2u', false)).to.be.true;
  });

  it('should intercept Ctrl+Tab and send CSI u sequence', () => {
    const event = {
      type: 'keydown',
      key: 'Tab',
      shiftKey: false,
      altKey: false,
      ctrlKey: true,
      metaKey: false
    } as KeyboardEvent;

    const result = modifierHandler(event);
    expect(result).to.be.false;
    expect(inputStub.calledOnceWith('\x1b[9;5u', false)).to.be.true;
  });

  it('should intercept Ctrl+Shift+Backspace and send CSI u sequence', () => {
    const event = {
      type: 'keydown',
      key: 'Backspace',
      shiftKey: true,
      altKey: false,
      ctrlKey: true,
      metaKey: false
    } as KeyboardEvent;

    const result = modifierHandler(event);
    expect(result).to.be.false;
    expect(inputStub.calledOnceWith('\x1b[127;6u', false)).to.be.true;
  });

  it('should ignore non-keydown events', () => {
    const event = {
      type: 'keyup',
      key: 'Enter',
      shiftKey: true
    } as KeyboardEvent;

    const result = modifierHandler(event);
    expect(result).to.be.true;
    expect(inputStub.called).to.be.false;
  });

  it('should ignore modified keys that are not in the special list', () => {
    const event = {
      type: 'keydown',
      key: 'a',
      shiftKey: true,
      altKey: false,
      ctrlKey: false,
      metaKey: false
    } as KeyboardEvent;

    const result = modifierHandler(event);
    expect(result).to.be.true;
    expect(inputStub.called).to.be.false;
  });
});
