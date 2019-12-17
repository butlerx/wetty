/**
 * Create WeTTY server
 * @module WeTTy
 */
import server from '../socketServer';
import getCommand from '../command';
import { login, spawn } from './term';
import { loadSSL, logger } from '../utils';
import { SSH, SSL, SSLBuffer, Server } from '../interfaces';

/**
 * Starts WeTTy Server
 * @name startWeTTy
 */
export default function startWeTTy(
  ssh: SSH = { user: '', host: 'localhost', auth: 'password', port: 22 },
  serverConf: Server = {
    base: '/wetty/',
    port: 3000,
    host: '0.0.0.0',
    title: 'WeTTy',
    bypasshelmet: false,
  },
  command = '',
  ssl?: SSL
): Promise<void> {
  return loadSSL(ssl).then((sslBuffer: SSLBuffer) => {
    if (ssh.key) {
      logger.warn(`!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
! Password-less auth enabled using private key from ${ssh.key}.
! This is dangerous, anything that reaches the wetty server
! will be able to run remote operations without authentication.
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`);
    }

    const io = server(serverConf, sslBuffer);
    /**
     * Wetty server connected too
     * @fires WeTTy#connnection
     */
    io.on('connection', (socket: SocketIO.Socket) => {
      /**
       * @event wetty#connection
       * @name connection
       */
      logger.info('Connection accepted.');
      const { args, user: sshUser } = getCommand(socket, ssh, command);
      logger.debug('Command Generated', {
        user: sshUser,
        cmd: args.join(' '),
      });

      if (sshUser) {
        spawn(socket, args);
      } else {
        login(socket)
          .then((username: string) => {
            args[1] = `${username.trim()}@${args[1]}`;
            logger.debug('Spawning term', {
              username: username.trim(),
              cmd: args.join(' ').trim(),
            });
            return spawn(socket, args);
          })
          .catch(() => {
            logger.info('Disconnect signal sent');
          });
      }
    });
  });
}
