import pty from 'node-pty';
import { xterm } from './shared/xterm.js';

export function login(socket: SocketIO.Socket): Promise<string> {
  // Check request-header for username
  const remoteUser = socket.request.headers['remote-user'];
  if (remoteUser) {
    return new Promise(resolve => {
      resolve(remoteUser);
    });
  }

  // Request carries no username information
  // Create terminal and ask user for username
  const term = pty.spawn(
    '/usr/bin/env',
    ['node', `${__dirname}/buffer.js`],
    xterm,
  );
  let buf = '';
  return new Promise((resolve, reject) => {
    term.on('exit', () => {
      resolve(buf);
    });
    term.on('data', (data: string) => {
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
