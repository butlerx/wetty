/**
 * Create WeTTY server
 * @module WeTTy
 */
import * as yargs from 'yargs';
import { isUndefined } from 'lodash';
import { SSH, SSL, SSLBuffer, Server } from './shared/interfaces';
import { getCommand } from './server/command';
import { loadSSL } from './server/ssl';
import { logger } from './shared/logger';
import { login } from './server/login';
import { server } from './server/socketServer';
import { spawn } from './server/spawn';
import { sshDefault, serverDefault, forceSSHDefault, defaultCommand} from './server/default';


/**
 * Check if being run by cli or require
 */
if (require.main === module) {
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
      default: forceSSHDefault
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
        : { key: opts['ssl-key'], cert: opts['ssl-cert'] }
    ).catch(err => {
      logger.error(err);
      process.exitCode = 1;
    });
  } else {
    yargs.showHelp();
    process.exitCode = 0;
  }
}

/**
 * Starts WeTTy Server
 * @name startServer
 */
export async function startServer(
  ssh: SSH = sshDefault,
  serverConf: Server = serverDefault,
  command:string = defaultCommand,
  forcessh:boolean = forceSSHDefault,
  ssl?: SSL
): Promise<SocketIO.Server> {
    if (ssh.key) {
      logger.warn(`!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
! Password-less auth enabled using private key from ${ssh.key}.
! This is dangerous, anything that reaches the wetty server
! will be able to run remote operations without authentication.
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`);
    }

    const sslBuffer: SSLBuffer = await loadSSL(ssl);
    const io = server(serverConf, sslBuffer);
    /**
     * Wetty server connected too
     * @fires WeTTy#connnection
     */
    io.on('connection', async (socket: SocketIO.Socket) => {
      /**
       * @event wetty#connection
       * @name connection
       */
      logger.info('Connection accepted.');
      const { args, user: sshUser } = getCommand(
        socket,
        ssh,
        command,
        forcessh
      );
      logger.debug('Command Generated', {
        user: sshUser,
        cmd: args.join(' '),
      });

      if (sshUser) {
        spawn(socket, args);
      } else {
        try {
          const username = await login(socket)
          args[1] = `${username.trim()}@${args[1]}`;
          logger.debug('Spawning term', {
            username: username.trim(),
            cmd: args.join(' ').trim(),
          });
          spawn(socket, args);
        }catch (error) {
          logger.info('Disconnect signal sent');
        }
      }
    });
    return io
}

