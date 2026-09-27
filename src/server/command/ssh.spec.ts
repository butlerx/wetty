import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import 'mocha';
import { expect } from 'chai';
import { sshOptions } from './ssh';

const baseOptions = {
  pass: '',
  command: 'login',
  host: 'example.com',
  port: '22',
  auth: 'password',
  knownHosts: '/dev/null',
  config: '',
};

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('SSH command options', () => {
  it('treats command substitutions in paths as literal text', () => {
    const directory = mkdtempSync(join(tmpdir(), 'wetty-ssh-'));
    temporaryDirectories.push(directory);
    const marker = join(directory, 'pwned');
    const remoteCommand = sshOptions({
      ...baseOptions,
      path: `/tmp/$(touch ${marker})`,
    }).at(-1);
    expect(remoteCommand).to.be.a('string');

    const result = spawnSync('/bin/sh', ['-c', remoteCommand ?? ''], {
      encoding: 'utf8',
      env: { ...process.env, SHELL: '/bin/sh' },
    });

    expect(result.status).to.equal(0);
    expect(existsSync(marker)).to.equal(false);
  });

  it('preserves shell metacharacters in a working directory path', () => {
    const directory = mkdtempSync(join(tmpdir(), 'wetty-ssh-'));
    temporaryDirectories.push(directory);
    const workingDirectory = join(directory, `it's "quoted"; $(literal)`);
    mkdirSync(workingDirectory);
    const remoteCommand = sshOptions({
      ...baseOptions,
      command: 'pwd',
      path: workingDirectory,
    }).at(-1);
    expect(remoteCommand).to.be.a('string');

    const result = spawnSync('/bin/sh', ['-c', remoteCommand ?? ''], {
      encoding: 'utf8',
      env: { ...process.env, SHELL: '/bin/sh' },
    });

    expect(result.status).to.equal(0);
    expect(result.stdout.trim()).to.equal(workingDirectory);
  });

  it('passes a command through unchanged when no path is provided', () => {
    const remoteCommand = sshOptions({
      ...baseOptions,
      command: 'printf allowed',
    }).at(-1);

    expect(remoteCommand).to.equal('printf allowed');
  });
});
