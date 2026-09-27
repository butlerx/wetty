import 'mocha';
import { expect } from 'chai';
import { logSafeArgs } from './logsafe';

const sshArgs = (...extra: string[]): string[] => [
  'ssh',
  '-t',
  '-p',
  '22',
  ...extra,
  '--',
  'bob@example.com',
];

describe('Arguments written to the log should carry no secrets or forged records', () => {
  it('should redact the password sshpass is given', () => {
    expect(
      logSafeArgs(['sshpass', '-p', 'hunter2', ...sshArgs()]),
    ).to.deep.equal(['sshpass', '-p', '[redacted]', ...sshArgs()]);
  });

  it('should redact the password when the vector is prefixed by env flags', () => {
    const args = logSafeArgs(['-S', 'sshpass', '-p', 'hunter2', ...sshArgs()]);
    expect(args).to.not.include('hunter2');
    expect(args[3]).to.equal('[redacted]');
  });

  it("should leave ssh's own -p port flag alone", () => {
    expect(logSafeArgs(sshArgs())).to.deep.equal(sshArgs());
  });

  it('should pass through a vector without sshpass unchanged', () => {
    const args = ['login', '-p', '127.0.0.1'];
    expect(logSafeArgs(args)).to.deep.equal(args);
  });

  it('should tolerate a trailing -p with no value', () => {
    expect(logSafeArgs(['sshpass', '-p'])).to.deep.equal(['sshpass', '-p']);
  });

  it('should strip newlines that would forge log records', () => {
    expect(
      logSafeArgs(['ssh', 'host\nWetty info: Process Started']),
    ).to.deep.equal(['ssh', 'hostWetty info: Process Started']);
  });

  it('should strip carriage returns and other control characters', () => {
    expect(logSafeArgs(['ssh', 'ho\rst\x00\x7f'])).to.deep.equal([
      'ssh',
      'host',
    ]);
  });

  it('should leave ordinary arguments untouched', () => {
    const args = ['ssh', '-o', 'StrictHostKeyChecking=yes', 'bob@example.com'];
    expect(logSafeArgs(args)).to.deep.equal(args);
  });
});
