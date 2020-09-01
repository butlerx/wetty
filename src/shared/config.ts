import fs from 'fs-extra';
import path from 'path';
import JSON5 from 'json5';
import isUndefined from 'lodash/isUndefined.js';

import type { Config, SSH, Server } from './interfaces';
import {
  sshDefault,
  serverDefault,
  forceSSHDefault,
  defaultCommand,
} from './defaults.js';

/**
 * Cast given value to boolean
 *
 * @param value - variable to cast
 * @returns variable cast to boolean
 */
function ensureBoolean(value: any): boolean {
  switch (value) {
    case true:
    case 'true':
    case 1:
    case '1':
    case 'on':
    case 'yes':
      return true;
    default:
      return false;
  }
}

/**
 * Load JSON5 config from file and merge with default args
 * If no path is provided the default config is returned
 *
 * @param filepath - path to config to load
 * @returns variable cast to boolean
 */
export async function loadConfigFile(filepath?: string): Promise<Config> {
  if (isUndefined(filepath)) {
    return {
      ssh: sshDefault,
      server: serverDefault,
      command: defaultCommand,
      forceSSH: forceSSHDefault,
    };
  }
  const content = await fs.readFile(path.resolve(filepath));
  const parsed = JSON5.parse(content.toString()) as Config;
  return {
    ssh: isUndefined(parsed.ssh)
      ? sshDefault
      : Object.assign(sshDefault, parsed.ssh),
    server: isUndefined(parsed.server)
      ? serverDefault
      : Object.assign(serverDefault, parsed.server),
    command: isUndefined(parsed.command) ? defaultCommand : `${parsed.command}`,
    forceSSH: isUndefined(parsed.forceSSH)
      ? forceSSHDefault
      : ensureBoolean(parsed.forceSSH),
    ssl: parsed.ssl,
  };
}

/**
 * Merge 2 objects removing undefined fields
 *
 * @param target - base object
 * @param source - object to get new values from
 * @returns merged object
 *
 */
const objectAssign = (
  target: Record<string, any>,
  source: Record<string, any>,
): Record<string, any> =>
  Object.fromEntries(
    Object.entries(source).map(([key, value]) => [
      key,
      isUndefined(source[key]) ? target[key] : value,
    ]),
  );

/**
 * Merge cli arguemens with config object
 *
 * @param opts - Object containing cli args
 * @param config - Config object
 * @returns merged configuration
 *
 */
export function mergeCliConf(
  opts: Record<string, any>,
  config: Config,
): Config {
  const ssl = {
    key: opts['ssl-key'],
    cert: opts['ssl-cert'],
    ...config.ssl,
  };
  return {
    ssh: objectAssign(config.ssh, {
      user: opts['ssh-user'],
      host: opts['ssh-host'],
      auth: opts['ssh-auth'],
      port: opts['ssh-port'],
      pass: opts['ssh-pass'],
      key: opts['ssh-key'],
      knownHosts: opts['known-hosts'],
    }) as SSH,
    server: objectAssign(config.server, {
      base: opts.base,
      host: opts.host,
      port: opts.port,
      title: opts.title,
      bypassHelmet: opts['bypass-helmet'],
    }) as Server,
    command: isUndefined(opts.command) ? config.command : opts.command,
    forceSSH: isUndefined(opts['force-ssh'])
      ? config.forceSSH
      : opts['force-ssh'],
    ssl: isUndefined(ssl.key) || isUndefined(ssl.cert) ? undefined : ssl,
  };
}
