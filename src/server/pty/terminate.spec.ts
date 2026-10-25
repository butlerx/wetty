import { expect } from 'chai';
import 'mocha';
import * as sinon from 'sinon';

import { terminatePty } from './terminate';

describe('PTY termination', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('uses the PTY abstraction when no process id is available', () => {
    const kill = sinon.spy();

    terminatePty({ kill });

    expect(kill.calledOnceWithExactly()).to.equal(true);
  });

  it('verifies and force-kills a surviving PTY process', () => {
    if (process.platform === 'win32') return;
    const kill = sinon.spy();
    const signalProcess = sinon.spy();

    terminatePty({ pid: 123, kill }, signalProcess);

    expect(kill.calledOnceWithExactly()).to.equal(true);
    expect(signalProcess.args).to.deep.equal([
      [123, 0],
      [123, 'SIGKILL'],
    ]);
  });

  it('treats an already-exited PTY as terminated', () => {
    if (process.platform === 'win32') return;
    const gone = Object.assign(new Error('process gone'), { code: 'ESRCH' });
    const signalProcess = sinon.stub().throws(gone);

    terminatePty({ pid: 123, kill: sinon.spy() }, signalProcess);

    expect(signalProcess.calledOnceWithExactly(123, 0)).to.equal(true);
  });

  it('reports a failed forced termination', () => {
    if (process.platform === 'win32') return;
    const signalProcess = sinon.stub();
    signalProcess.withArgs(123, 'SIGKILL').throws(new Error('kill failed'));

    expect(() => {
      terminatePty({ pid: 123, kill: sinon.spy() }, signalProcess);
    }).to.throw(AggregateError);
  });
});
