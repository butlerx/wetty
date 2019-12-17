import { isUndefined } from 'lodash';
import { SSH, SSL, Server } from '../interfaces';
import { Options } from './options';

export function unWrapArgs(
  args: Options
): { ssh: SSH; server: Server; command?: string; ssl?: SSL } {
  return {
    ssh: {
      user: args.sshuser,
      host: args.sshhost,
      auth: args.sshauth,
      port: args.sshport,
      pass: args.sshpass,
      key: args.sshkey,
    },
    server: {
      base: args.base,
      host: args.host,
      port: args.port,
      title: args.title,
      bypasshelmet: args.bypasshelmet || false,
    },
    command: args.command,
    ssl:
      isUndefined(args.sslkey) || isUndefined(args.sslcert)
        ? undefined
        : { key: args.sslkey, cert: args.sslcert },
  };
}
