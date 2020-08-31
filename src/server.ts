/**
 * Create WeTTY server
 * @module WeTTy
 */
import type { SSH, SSL, SSLBuffer, Server } from './shared/interfaces';
import { getCommand } from './server/command.js';
import { loadSSL } from './server/ssl.js';
import { logger } from './shared/logger.js';
import { login } from './server/login.js';
import { server } from './server/socketServer.js';
import { spawn } from './server/spawn.js';
import {
  sshDefault,
  serverDefault,
  forceSSHDefault,
  defaultCommand,
} from './server/default.js';

/**
 * Starts WeTTy Server
 * @name startServer
 * @returns Promise that resolves SocketIO server
 */
export async function startServer(
  ssh: SSH = sshDefault,
  serverConf: Server = serverDefault,
  command: string = defaultCommand,
  forcessh: boolean = forceSSHDefault,
  ssl?: SSL,
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
    const { args, user: sshUser } = getCommand(socket, ssh, command, forcessh);
    logger.debug('Command Generated', {
      user: sshUser,
      cmd: args.join(' '),
    });

    if (sshUser) {
      spawn(socket, args);
    } else {
      try {
        const username = await login(socket);
        args[1] = `${username.trim()}@${args[1]}`;
        logger.debug('Spawning term', {
          username: username.trim(),
          cmd: args.join(' ').trim(),
        });
        spawn(socket, args);
      } catch (error) {
        logger.info('Disconnect signal sent');
      }
    }
  });
  return io;
}
