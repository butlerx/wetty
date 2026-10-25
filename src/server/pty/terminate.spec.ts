import { expect } from 'chai';
import 'mocha';
import * as sinon from 'sinon';

import { terminatePty, type KillablePty } from './terminate';

function createTerm(pid?: number) {
  const exitListeners = new Set<(event: { exitCode: number }) => void>();
  const kill = sinon.spy();
  const term: KillablePty = {
    pid,
    kill,
    onExit(listener) {
      exitListeners.add(listener);
      return { dispose: () => exitListeners.delete(listener) };
    },
  };
  return {
    kill,
    term,
    exit(): void {
      for (const listener of [...exitListeners]) listener({ exitCode: 0 });
    },
  };
}

describe('PTY termination', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('uses the PTY abstraction when no process id is available', () => {
    const pty = createTerm();

    terminatePty(pty.term);

    expect(pty.kill.calledOnceWithExactly()).to.equal(true);
  });

  it('allows graceful exit before bounded SIGKILL escalation', () => {
    if (process.platform === 'win32') return;
    const clock = sinon.useFakeTimers();
    const pty = createTerm(123);
    const signalProcess = sinon.spy();

    terminatePty(pty.term, { graceMs: 100, signalProcess });
    clock.tick(99);
    expect(signalProcess.called).to.equal(false);
    pty.exit();
    clock.tick(1);
    expect(signalProcess.called).to.equal(false);
  });

  it('force-kills a PTY that survives the grace period', () => {
    if (process.platform === 'win32') return;
    const clock = sinon.useFakeTimers();
    const pty = createTerm(123);
    const signalProcess = sinon.spy();

    terminatePty(pty.term, { graceMs: 100, signalProcess });
    clock.tick(100);

    expect(signalProcess.args).to.deep.equal([
      [123, 0],
      [123, 'SIGKILL'],
    ]);
  });

  it('treats an already-exited PTY as terminated', () => {
    if (process.platform === 'win32') return;
    const clock = sinon.useFakeTimers();
    const pty = createTerm(123);
    const gone = Object.assign(new Error('process gone'), { code: 'ESRCH' });
    const signalProcess = sinon.stub().throws(gone);
    const reportError = sinon.spy();

    terminatePty(pty.term, { graceMs: 100, reportError, signalProcess });
    clock.tick(100);

    expect(signalProcess.calledOnceWithExactly(123, 0)).to.equal(true);
    expect(reportError.called).to.equal(false);
  });

  it('reports a failed forced termination', () => {
    if (process.platform === 'win32') return;
    const clock = sinon.useFakeTimers();
    const pty = createTerm(123);
    const signalProcess = sinon.stub();
    signalProcess.withArgs(123, 'SIGKILL').throws(new Error('kill failed'));
    const reportError = sinon.spy();

    terminatePty(pty.term, { graceMs: 100, reportError, signalProcess });
    clock.tick(100);

    expect(reportError.calledOnce).to.equal(true);
    expect(reportError.firstCall.args[0]).to.be.instanceOf(AggregateError);
  });
});
