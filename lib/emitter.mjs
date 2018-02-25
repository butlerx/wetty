/**
 * Create WeTTY server
 * @module WeTTy
 */
import EventEmitter from 'events';
import server from './server.mjs';
import command from './command.mjs';
import term from './term.mjs';
import loadSSL from './ssl.mjs';

class WeTTy extends EventEmitter {
  /**
   * Starts WeTTy Server
   * @name start
   * @async
   * @param {Object} [ssh] SSH settings
   * @param {string} [ssh.user=''] default user for ssh
   * @param {string} [ssh.host=localhost] machine to ssh too
   * @param {string} [ssh.auth=password] authtype to use
   * @param {number} [ssh.port=22] port to connect to over ssh
   * @param {number} [serverPort=3000] Port to run server on
   * @param {Object} [ssl] SSL settings
   * @param {?string} [ssl.key] Path to ssl key
   * @param {?string} [ssl.cert] Path to ssl cert
   * @return {Promise} Promise resolves once server is running
   */
  start(
    { user = '', host = 'localhost', auth = 'password', port = 22 },
    serverPort = 3000,
    { key, cert }
  ) {
    return loadSSL(key, cert).then(ssl => {
      const io = server(serverPort, ssl);
      /**
       * Wetty server connected too
       * @fires WeTTy#connnection
       */
      io.on('connection', socket => {
        /**
         * @event wetty#connection
         * @name connection
         * @type {object}
         * @property {string} msg Message for logs
         * @property {Date} date date and time of connection
         */
        this.emit('connection', {
          msg: `Connection accepted.`,
          date: new Date(),
        });
        const { args, user: sshUser } = command(socket, {
          user,
          host,
          auth,
          port,
        });
        this.emit('debug', `sshUser: ${sshUser}, cmd: ${args.join(' ')}`);
        if (sshUser) {
          term.spawn(socket, args);
        } else {
          term
            .login(socket)
            .then(username => {
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
  spawned(pid, address) {
    /**
     * Terminal process spawned
     * @event WeTTy#spawn
     * @name spawn
     * @type {object}
     * @property {string} msg Message containing pid info and status
     * @property {number} pid Pid of the terminal
     * @property {string} address address of connecting user
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
  exited(code, pid) {
    /**
     * Terminal process exits
     * @event WeTTy#exit
     * @name exit
     * @type {object}
     * @property {number} code the exit code
     * @property {string} msg Message containing pid info and status
     */
    this.emit('exit', { code, msg: `PID=${pid} ENDED` });
  }

  /**
   * Disconnect from WeTTY
   *
   * @fires WeTTy#disconnet
   */
  disconnected() {
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
  server(port, connection) {
    /**
     * @event WeTTy#server
     * @type {object}
     * @name server
     * @property {string} msg Message for logging
     * @property {number} port port sever is on
     * @property {string} connection connection type for web traffic
     */
    this.emit('server', {
      msg: `${connection} on port ${port}`,
      port,
      connection,
    });
  }
}

export default new WeTTy();
