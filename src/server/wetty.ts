/**
 * Create WeTTY server
 * @module WeTTy
 */
import * as EventEmitter from 'events';
import server from './server';
import getCommand from './command';
import term from './term';
import loadSSL from './ssl';
import { SSL, SSH, SSLBuffer, Server } from './interfaces';

export default class WeTTy extends EventEmitter {
  /**
   * Starts WeTTy Server
   * @name start
   */
  public start(
    ssh: SSH = { user: '', host: 'localhost', auth: 'password', port: 22 },
    serverConf: Server = { base: '/wetty/', port: 3000, host: '0.0.0.0' },
    command: string = '',
    ssl?: SSL
  ): Promise<void> {
    return loadSSL(ssl).then((sslBuffer: SSLBuffer) => {
      if (ssh.key) {
        this.emit(
          'warn',
          `!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
! Password-less auth enabled using private key from ${ssh.key}.
! This is dangerous, anything that reaches the wetty server
! will be able to run remote operations without authentication.
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`
        );
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
        this.emit('connection', {
          msg: `Connection accepted.`,
          date: new Date(),
        });
        const { args, user: sshUser } = getCommand(socket, ssh, command);
        this.emit('debug', `sshUser: ${sshUser}, cmd: ${args.join(' ')}`);
        if (sshUser) {
          term.spawn(socket, args);
        } else {
          term
            .login(socket)
            .then((username: string) => {
              this.emit('debug', `username: ${username.trim()}`);
              args[1] = `${username.trim()}@${args[1]}`;
              this.emit('debug', `cmd : ${args.join(' ')}`);
              return term.spawn(socket, args);
            })
            .catch(() => this.disconnected());
        }
      });
    });
  }

  /**
   * terminal spawned
   *
   * @fires module:WeTTy#spawn
   */
  public spawned(pid: number, address: string): void {
    /**
     * Terminal process spawned
     * @event WeTTy#spawn
     * @name spawn
     * @type {object}
     */
    this.emit('spawn', {
      msg: `PID=${pid} STARTED on behalf of ${address}`,
      pid,
      address,
    });
  }

  /**
   * terminal exited
   *
   * @fires WeTTy#exit
   */
  public exited(code: number, pid: number): void {
    /**
     * Terminal process exits
     * @event WeTTy#exit
     * @name exit
     */
    this.emit('exit', { code, msg: `PID=${pid} ENDED` });
  }

  /**
   * Disconnect from WeTTY
   *
   * @fires WeTTy#disconnet
   */
  private disconnected(): void {
    /**
     * @event WeTTY#disconnect
     * @name disconnect
     */
    this.emit('disconnect');
  }

  /**
   * Wetty server started
   * @fires WeTTy#server
   */
  public server(port: number, connection: string): void {
    /**
     * @event WeTTy#server
     * @type {object}
     * @name server
     */
    this.emit('server', {
      msg: `${connection} on port ${port}`,
      port,
      connection,
    });
  }
}
