import { isDev } from './env.js';
import type { SSH, Server } from './interfaces';

export const sshDefault: SSH = {
  user: process.env.SSHUSER ?? '',
  host: process.env.SSHHOST ?? 'localhost',
  auth: process.env.SSHAUTH ?? 'password',
  pass: process.env.SSHPASS ?? undefined,
  key: process.env.SSHKEY ?? undefined,
  port: parseInt(process.env.SSHPORT ?? '22', 10),
  knownHosts: process.env.KNOWNHOSTS ?? '/dev/null',
  allowRemoteHosts: false,
  allowRemoteCommand: false,
  config: process.env.SSHCONFIG ?? undefined,
};

/**
 * Resolve a positive integer from an environment variable or config value
 *
 * Falls back when the value is missing, empty, non numeric or out of range, so
 * a mistyped `PINGINTERVAL=` can never reach socket.io as `NaN`
 *
 * @param value - raw value to parse
 * @param fallback - value to use when `value` is unusable
 * @returns a positive integer
 *
 */
export const positiveIntOr = (
  value: string | number | undefined,
  fallback: number,
): number => {
  const parsed = typeof value === 'string' ? parseInt(value, 10) : value;
  return parsed !== undefined && Number.isFinite(parsed) && parsed > 0
    ? parsed
    : fallback;
};

export const defaultPingInterval = positiveIntOr(
  process.env.PINGINTERVAL,
  3000,
);
export const defaultPingTimeout = positiveIntOr(process.env.PINGTIMEOUT, 7000);

export const serverDefault: Server = {
  base: process.env.BASE ?? '/',
  port: parseInt(process.env.PORT ?? '3000', 10),
  host: '0.0.0.0',
  socket: false,
  title: process.env.TITLE ?? 'WeTTY - The Web Terminal Emulator',
  allowIframe: process.env.ALLOWIFRAME === 'true',
  pingInterval: defaultPingInterval,
  pingTimeout: defaultPingTimeout,
};

export const forceSSHDefault = process.env.FORCESSH === 'true';
export const defaultCommand = process.env.COMMAND ?? 'login';
export const defaultLogLevel = isDev ? 'debug' : 'http';
