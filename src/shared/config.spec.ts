import 'mocha';
import { expect } from 'chai';
import { mergeCliConf } from './config';
import {
  defaultCommand,
  defaultLogLevel,
  forceSSHDefault,
  serverDefault,
  sshDefault,
} from './defaults';
import type { Config } from './interfaces';
import type { Arguments } from 'yargs';

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
