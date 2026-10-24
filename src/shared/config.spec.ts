import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import 'mocha';
import { expect } from 'chai';
import { loadConfigFile, mergeCliConf } from './config';
import {
  defaultCommand,
  defaultLogLevel,
  forceSSHDefault,
  serverDefault,
  sshDefault,
} from './defaults';
import type { Config } from './interfaces';
import type { Arguments } from 'yargs';

const originalSshDefault = { ...sshDefault };
const originalServerOrigins = [...(serverDefault.allowedOrigins ?? [])];
const originalServerDefault = {
  ...serverDefault,
  allowedOrigins: originalServerOrigins,
};
const temporaryDirectories: string[] = [];

const configWithOrigins = (): Config => ({
  ssh: { ...sshDefault },
  server: {
    ...serverDefault,
    allowedOrigins: ['https://configured.example'],
  },
  command: defaultCommand,
  forceSSH: forceSSHDefault,
  logLevel: defaultLogLevel,
});

const args = (allowedOrigins?: string[]): Arguments => ({
  _: [],
  $0: 'wetty',
  'allowed-origin': allowedOrigins,
});

async function configFile(content: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'wetty-config-'));
  temporaryDirectories.push(directory);
  const filepath = join(directory, 'config.json5');
  await writeFile(filepath, content);
  return filepath;
}

function getAllowedOrigins(config: Config): string[] {
  const origins = config.server.allowedOrigins;
  expect(origins).not.to.equal(undefined);
  if (origins === undefined) throw new Error('Expected allowed origins');
  return origins;
}

afterEach(async () => {
  Object.assign(sshDefault, originalSshDefault);
  Object.assign(serverDefault, originalServerDefault, {
    allowedOrigins: [...originalServerDefault.allowedOrigins],
  });
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('configuration isolation', () => {
  it('does not carry values between config file loads', async () => {
    const firstPath = await configFile('{ ssh: { port: 2222 } }');
    const secondPath = await configFile("{ ssh: { user: 'second' } }");

    const first = await loadConfigFile(firstPath);
    const second = await loadConfigFile(secondPath);

    expect(first.ssh.port).to.equal(2222);
    expect(second.ssh.port).to.equal(originalSshDefault.port);
    expect(sshDefault.port).to.equal(originalSshDefault.port);
  });

  it('returns independent objects when no config file is provided', async () => {
    const first = await loadConfigFile();
    first.ssh.port = 2222;
    getAllowedOrigins(first).push('https://mutated.example');

    const second = await loadConfigFile();

    expect(second.ssh.port).to.equal(originalSshDefault.port);
    expect(second.server.allowedOrigins).to.deep.equal(
      originalServerDefault.allowedOrigins,
    );
    expect(serverDefault.allowedOrigins).to.deep.equal(
      originalServerDefault.allowedOrigins,
    );
  });

  it('keeps merged origins independent of the source config', () => {
    const source = configWithOrigins();
    const merged = mergeCliConf(args(), source);

    getAllowedOrigins(merged).push('https://mutated.example');

    expect(source.server.allowedOrigins).to.deep.equal([
      'https://configured.example',
    ]);
  });
});

describe('allowed Origin configuration', () => {
  it('keeps origins loaded from configuration when the CLI option is absent', () => {
    const config = mergeCliConf(args(), configWithOrigins());
    expect(config.server.allowedOrigins).to.deep.equal([
      'https://configured.example',
    ]);
  });

  it('uses repeated CLI origin values instead of configured origins', () => {
    const config = mergeCliConf(
      args(['https://one.example', 'https://two.example']),
      configWithOrigins(),
    );
    expect(config.server.allowedOrigins).to.deep.equal([
      'https://one.example',
      'https://two.example',
    ]);
  });
});
