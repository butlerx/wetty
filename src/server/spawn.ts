import type SocketIO from 'socket.io';
import isUndefined from 'lodash/isUndefined.js';
import pty from 'node-pty';
import { logger } from '../shared/logger.js';
import { xterm } from './shared/xterm.js';

export function spawn(socket: SocketIO.Socket, args: string[]): void {
  const term = pty.spawn('/usr/bin/env', args, xterm);
  const { pid } = term;
  const address = args[0] === 'ssh' ? args[1] : 'localhost';
  logger.info('Process Started on behalf of user', {
    pid,
    address,
  });
  socket.emit('login');
  term.on('exit', (code: number) => {
    logger.info('Process exited', { code, pid });
    socket.emit('logout');
    socket
      .removeAllListeners('disconnect')
      .removeAllListeners('resize')
      .removeAllListeners('input');
  });
  term.on('data', (data: string) => {
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
      term.kill();
      logger.info('Process exited', { code: 0, pid });
    });
}
