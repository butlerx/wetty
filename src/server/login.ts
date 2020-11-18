import type SocketIO from 'socket.io';
import pty from 'node-pty';
import { dirname, resolve as resolvePath } from 'path';
import { fileURLToPath } from 'url';
import { xterm } from './shared/xterm.js';

const executable = resolvePath(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'buffer.js',
);

export function login(socket: SocketIO.Socket): Promise<string> {
  // Request carries no username information
  // Create terminal and ask user for username
  const term = pty.spawn('/usr/bin/env', ['node', executable], xterm);
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
