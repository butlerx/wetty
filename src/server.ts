/**
 * Create WeTTY server
 * @module WeTTy
 */
import type SocketIO from 'socket.io';
import type { SSH, SSL, Server } from './shared/interfaces.js';
import { getCommand } from './server/command.js';
import { logger } from './shared/logger.js';
import { login } from './server/login.js';
import { server } from './server/socketServer.js';
import { spawn } from './server/spawn.js';
import {
  sshDefault,
  serverDefault,
  forceSSHDefault,
  defaultCommand,
} from './shared/defaults.js';
import { escapeShell } from './server/shared/shell.js';

/**
 * Starts WeTTy Server
 * @name startServer
 * @returns Promise that resolves SocketIO server
 */
export async function start(
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

  const io = await server(serverConf, ssl);
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
    const [args, sshUser] = getCommand(socket, ssh, command, forcessh);
    logger.debug('Command Generated', {
      user: sshUser,
      cmd: args.join(' '),
    });

    if (sshUser) {
      spawn(socket, args);
    } else {
      try {
        const username = await login(socket);
        args[1] = `${escapeShell(username.trim())}@${args[1]}`;
        logger.debug('Spawning term', {
          username: username.trim(),
          cmd: args.join(' '),
        });
        spawn(socket, args);
      } catch (error) {
        logger.info('Disconnect signal sent', { err: error });
      }
    }
  });
  return io;
}
