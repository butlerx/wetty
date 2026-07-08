import type { SSH, Server } from './interfaces';

export const isDev = process.env.NODE_ENV === 'development';

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

export const serverDefault: Server = {
  base: process.env.BASE ?? '/',
  port: parseInt(process.env.PORT ?? '3000', 10),
  host: '0.0.0.0',
  socket: false,
  title: process.env.TITLE ?? 'WeTTY - The Web Terminal Emulator',
  allowIframe: process.env.ALLOWIFRAME === 'true',
};

export const forceSSHDefault = process.env.FORCESSH === 'true';
export const defaultCommand = process.env.COMMAND ?? 'login';
export const defaultLogLevel = isDev ? 'debug' : 'http';
