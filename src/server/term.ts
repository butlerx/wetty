import { spawn } from 'node-pty';
import { isUndefined } from 'lodash';
import events from './emitter';

const xterm = {
  name: 'xterm-256color',
  cols: 80,
  rows: 30,
  cwd: process.cwd(),
  env: process.env,
};

export default class Term {
  public static spawn(socket: SocketIO.Socket, args: string[]): void {
    const term = spawn('/usr/bin/env', args, xterm);
    const address = args[0] === 'ssh' ? args[1] : 'localhost';
    events.spawned(term.pid, address);
    socket.emit('login');
    term.on('exit', code => {
      events.exited(code, term.pid);
      socket.emit('logout');
      socket
        .removeAllListeners('disconnect')
        .removeAllListeners('resize')
        .removeAllListeners('input');
    });
    term.on('data', data => {
      socket.emit('data', data);
    });
    socket
      .on('resize', ({ cols, rows }) => {
        term.resize(cols, rows);
      })
      .on('input', input => {
        if (!isUndefined(term)) term.write(input);
      })
      .on('disconnect', () => {
        const { pid } = term;
        term.kill();
        events.exited(0, pid);
      });
  }

  public static login(socket: SocketIO.Socket): Promise<string> {

    // Check request-header for username
    let remoteUser = socket.request.headers['remote-user'];
    if (remoteUser) {
      return new Promise((resolve,reject) => {
        resolve(remoteUser);
      });
    }

    // Request carries no username information
    // Create terminal and ask user for username
    const term = spawn(
      '/usr/bin/env',
      ['node', `${__dirname}/buffer.js`],
      xterm
    );
    let buf = '';
    return new Promise((resolve, reject) => {
      term.on('exit', () => {
        resolve(buf);
      });
      term.on('data', data => {
        socket.emit('data', data);
      });
      socket
        .on('input', (input: string) => {
          term.write(input);
          buf = /\177/.exec(input) ? buf.slice(0, -1) : buf + input;
        })
        .on('disconnect', () => {
          term.kill();
          reject();
        });
    });
  }
}
