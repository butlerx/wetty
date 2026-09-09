import pty from 'node-pty';
import { logger as getLogger } from '../shared/logger.js';
import { tinybuffer, FlowControlServer } from './flowcontrol.js';
import { xterm } from './shared/xterm.js';
import { envVersionOr } from './spawn/env.js';
import { parseDimensions } from './spawn/resize.js';
import type SocketIO from 'socket.io';

export async function spawn(
  socket: SocketIO.Socket,
  args: string[],
): Promise<void> {
  const logger = getLogger();
  const version = await envVersionOr(0);
  const cmd = version >= 9 ? ['-S', ...args] : args;
  logger.debug('Spawning PTY', { cmd });
  const term = pty.spawn('/usr/bin/env', cmd, xterm);
  const { pid } = term;
  const address = args[0] === 'ssh' ? args[1] : 'localhost';
  logger.info('Process Started on behalf of user', { pid, address });
  socket.emit('login');
  term.onExit(({ exitCode }) => {
    logger.info('Process exited', { exitCode, pid });
    socket.emit('logout');
    socket
      .removeAllListeners('disconnect')
      .removeAllListeners('resize')
      .removeAllListeners('input');
  });
  const send = tinybuffer(socket, 2, 524288);
  const fcServer = new FlowControlServer();
  term.onData((data: string) => {
    send(data);
    if (fcServer.account(data.length)) {
      term.pause();
    }
  });
  socket
    .on('resize', (payload: unknown) => {
      // Socket.IO does not catch throws in listeners, so an invalid size would
      // otherwise take down the process and every other session with it.
      const dimensions = parseDimensions(payload);
      if (dimensions === undefined) {
        logger.debug('Ignoring invalid resize request', { pid });
        return;
      }
      try {
        term.resize(dimensions.cols, dimensions.rows);
      } catch (error) {
        logger.debug('Resize rejected by PTY', { pid, err: error });
      }
    })
    .on('input', (input: string) => {
      term.write(input);
    })
    .on('disconnect', () => {
      term.kill();
      logger.info('Process exited', { code: 0, pid });
    })
    .on('commit', (size: number) => {
      if (fcServer.commit(size)) {
        term.resume();
      }
    });
}
