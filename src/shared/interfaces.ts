import type winston from 'winston';

export interface SSH {
  [s: string]: string | number | boolean | undefined;
  user: string;
  host: string;
  auth: string;
  port: number;
  knownHosts: string;
  allowRemoteHosts: boolean;
  allowRemoteCommand: boolean;
  pass?: string;
  key?: string;
  config?: string;
}

export interface SSL {
  key: string;
  cert: string;
}

export interface SSLBuffer {
  key?: Buffer;
  cert?: Buffer;
}

export interface Server {
  [s: string]: string | number | boolean;
  port: number;
  host: string;
  title: string;
  base: string;
  allowIframe: boolean;
}

export interface Config {
  ssh: SSH;
  server: Server;
  forceSSH: boolean;
  command: string;
  logLevel: typeof winston.level;
  ssl?: SSL;
}
