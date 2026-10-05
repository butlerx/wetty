import 'mocha';
import { spawnSync } from 'child_process';
import { expect } from 'chai';

const runCli = (args: string[]) =>
  spawnSync(process.execPath, ['--import', 'tsx', 'src/main.ts', ...args], {
    encoding: 'utf8',
    timeout: 5000,
    env: {
      ...process.env,
      ALLOWEDORIGINS: '',
      ALLOWMISSINGORIGIN: 'false',
    },
  });

describe('CLI origin configuration', () => {
  it('fails with an actionable error when no trusted origin is configured', () => {
    const result = runCli(['--host', '127.0.0.1', '--port', '0']);
    expect(result.error).to.equal(undefined);
    expect(result.status).to.equal(1);
    expect(result.stdout).to.include('Configure at least one allowed origin');
    expect(result.stdout).not.to.include('Server started');
  });

  it('reports invalid origins without starting a listener', () => {
    const result = runCli([
      '--host',
      '127.0.0.1',
      '--port',
      '0',
      '--allowed-origin',
      'https://terminal.example/path',
    ]);
    expect(result.error).to.equal(undefined);
    expect(result.status).to.equal(1);
    expect(result.stdout).to.include('Invalid allowed origin');
    expect(result.stdout).not.to.include('Server started');
  });

  it('prints help without requiring an origin', () => {
    const result = runCli(['--help']);
    expect(result.error).to.equal(undefined);
    expect(result.status).to.equal(0);
    expect(result.stdout).to.include('--allowed-origin');
  });
});
