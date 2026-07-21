import { readFile } from 'node:fs/promises';
import path from 'path';
import JSON5 from 'json5';
import {
  sshDefault,
  serverDefault,
  forceSSHDefault,
  defaultCommand,
  defaultLogLevel,
} from './defaults.js';
import type { Config, SSH, Server, SSL } from './interfaces';

export { mergeCliConf } from './merge.js';

/**
 * Load JSON5 config from file and merge with default args
 * If no path is provided the default config is returned
 *
 * @param filepath - path to config to load
 * @returns variable cast to boolean
 */
export async function loadConfigFile(filepath?: string): Promise<Config> {
  if (filepath === undefined) {
    return {
      ssh: sshDefault,
      server: serverDefault,
      command: defaultCommand,
      forceSSH: forceSSHDefault,
      logLevel: defaultLogLevel,
    };
  }
  const content = await readFile(path.resolve(filepath));
  const parsed: Partial<{
    ssh: Partial<SSH>;
    server: Partial<Server>;
    command: string;
    forceSSH: boolean | string | number;
    ssl: SSL;
    logLevel: unknown;
  }> = JSON5.parse(content.toString());
  return {
    ssh:
      parsed.ssh === undefined
        ? sshDefault
        : Object.assign(sshDefault, parsed.ssh),
    server:
      parsed.server === undefined
        ? serverDefault
        : Object.assign(serverDefault, parsed.server),
    command: parsed.command ?? defaultCommand,
    forceSSH:
      parsed.forceSSH === undefined
        ? forceSSHDefault
        : Boolean(parsed.forceSSH),
    ssl: parsed.ssl,
    logLevel: parseLogLevel(defaultLogLevel, parsed.logLevel),
  };
}

function parseLogLevel(confLevel: string, optsLevel: unknown): string {
  const logLevel =
    optsLevel === undefined || typeof optsLevel !== 'string'
      ? confLevel
      : optsLevel;
  return [
    'error',
    'warn',
    'info',
    'http',
    'verbose',
    'debug',
    'silly',
  ].includes(logLevel)
    ? logLevel
    : defaultLogLevel;
}
