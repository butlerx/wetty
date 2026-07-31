import type { Config, SSH, Server, SSL } from './interfaces';
import type { Arguments } from 'yargs';

type confValue = boolean | string | number | undefined | SSH | Server | SSL;

/**
 * Cast given value to boolean
 *
 * @param value - variable to cast
 * @returns variable cast to boolean
 */
function ensureBoolean(value: confValue): boolean {
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
 * Merge 2 objects removing undefined fields
 *
 * @param target - base object
 * @param source - object to get new values from
 * @returns merged object
 *
 */
const objectAssign = (
  target: SSH | Server,
  source: Record<string, confValue>,
): SSH | Server =>
  Object.fromEntries(
    Object.entries(source).map(([key, value]) => [
      key,
      source[key] === undefined ? target[key] : value,
    ]),
  ) as SSH | Server;

/**
 * Merge cli arguemens with config object
 *
 * @param opts - Object containing cli args
 * @param config - Config object
 * @returns merged configuration
 *
 */
export function mergeCliConf(opts: Arguments, config: Config): Config {
  const ssl: Partial<SSL> = {
    key: opts['ssl-key'] as string | undefined,
    cert: opts['ssl-cert'] as string | undefined,
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
      allowRemoteHosts: opts['allow-remote-hosts'],
      allowRemoteCommand: opts['allow-remote-command'],
      config: opts['ssh-config'],
      knownHosts: opts['known-hosts'],
    } as Record<string, confValue>) as SSH,
    server: objectAssign(config.server, {
      base: opts.base,
      host: opts.host,
      socket: opts.socket,
      port: opts.port,
      title: opts.title,
      allowIframe: opts['allow-iframe'],
    } as Record<string, confValue>) as Server,
    command:
      opts.command === undefined || typeof opts.command !== 'string'
        ? config.command
        : opts.command,
    forceSSH:
      opts['force-ssh'] === undefined
        ? config.forceSSH
        : ensureBoolean(opts['force-ssh'] as confValue),
    ssl:
      ssl.key === undefined || ssl.cert === undefined
        ? undefined
        : (ssl as SSL),
    logLevel: parseLogLevel(config.logLevel, opts['log-level']),
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
    : 'error';
}
