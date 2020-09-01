/**
 * Create WeTTY server
 * @module WeTTy
 */
import yargs from 'yargs';
import isUndefined from 'lodash/isUndefined';
import { logger } from './shared/logger';
import {
  sshDefault,
  serverDefault,
  forceSSHDefault,
  defaultCommand,
} from './shared/defaults';
import { startServer } from './server';

const opts = yargs
  .option('ssl-key', {
    type: 'string',
    description: 'path to SSL key',
  })
  .option('ssl-cert', {
    type: 'string',
    description: 'path to SSL certificate',
  })
  .option('ssh-host', {
    description: 'ssh server host',
    type: 'string',
    default: sshDefault.host,
  })
  .option('ssh-port', {
    description: 'ssh server port',
    type: 'number',
    default: sshDefault.port,
  })
  .option('ssh-user', {
    description: 'ssh user',
    type: 'string',
    default: sshDefault.user,
  })
  .option('title', {
    description: 'window title',
    type: 'string',
    default: serverDefault.title,
  })
  .option('ssh-auth', {
    description:
      'defaults to "password", you can use "publickey,password" instead',
    type: 'string',
    default: sshDefault.auth,
  })
  .option('ssh-pass', {
    description: 'ssh password',
    type: 'string',
    default: sshDefault.pass,
  })
  .option('ssh-key', {
    demand: false,
    description:
      'path to an optional client private key (connection will be password-less and insecure!)',
    type: 'string',
    default: sshDefault.key,
  })
  .option('force-ssh', {
    description: 'Connecting through ssh even if running as root',
    type: 'boolean',
    default: forceSSHDefault,
  })
  .option('known-hosts', {
    description: 'path to known hosts file',
    type: 'string',
    default: sshDefault.knownHosts,
  })
  .option('base', {
    alias: 'b',
    description: 'base path to wetty',
    type: 'string',
    default: serverDefault.base,
  })
  .option('port', {
    alias: 'p',
    description: 'wetty listen port',
    type: 'number',
    default: serverDefault.port,
  })
  .option('host', {
    description: 'wetty listen host',
    default: serverDefault.host,
    type: 'string',
  })
  .option('command', {
    alias: 'c',
    description: 'command to run in shell',
    type: 'string',
    default: defaultCommand,
  })
  .option('bypass-helmet', {
    description: 'disable helmet from placing security restrictions',
    type: 'boolean',
    default: serverDefault.bypassHelmet,
  })
  .option('help', {
    alias: 'h',
    type: 'boolean',
    description: 'Print help message',
  })
  .boolean('allow_discovery').argv;
if (!opts.help) {
  startServer(
    {
      user: opts['ssh-user'],
      host: opts['ssh-host'],
      auth: opts['ssh-auth'],
      port: opts['ssh-port'],
      pass: opts['ssh-pass'],
      key: opts['ssh-key'],
      knownHosts: opts['known-hosts'],
    },
    {
      base: opts.base,
      host: opts.host,
      port: opts.port,
      title: opts.title,
      bypassHelmet: opts['bypass-helmet'],
    },
    opts.command,
    opts['force-ssh'],
    isUndefined(opts['ssl-key']) || isUndefined(opts['ssl-cert'])
      ? undefined
      : { key: opts['ssl-key'], cert: opts['ssl-cert'] },
  ).catch((err: Error) => {
    logger.error(err);
    process.exitCode = 1;
  });
} else {
  yargs.showHelp();
  process.exitCode = 0;
}
