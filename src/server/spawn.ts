import type SocketIO from 'socket.io';
import isUndefined from 'lodash/isUndefined.js';
import pty from 'node-pty';
import { logger as getLogger } from '../shared/logger.js';
import { xterm } from './shared/xterm.js';
import { envVersion } from './spawn/env.js';

export async function spawn(
  socket: SocketIO.Socket,
  args: string[],
): Promise<void> {
  const logger = getLogger();
  const version = await envVersion();
  const cmd = version >= 9 ? ['-S', ...args] : args;
  logger.debug('Spawning PTY', { cmd });
  const term = pty.spawn('/usr/bin/env', cmd, xterm);
  const { pid } = term;
  const address = args[0] === 'ssh' ? args[1] : 'localhost';
  logger.info('Process Started on behalf of user', { pid, address });
  socket.emit('login');
  term.on('exit', (code: number) => {
    logger.info('Process exited', { code, pid });
    socket.emit('logout');
    socket
      .removeAllListeners('disconnect')
      .removeAllListeners('resize')
      .removeAllListeners('input');
  });
  const send = tinybuffer(socket, 2, 524288);
  const fcServer = new FlowControlServer();
  term.on('data', (data: string) => {
    send(data);
    if (fcServer.account(data.length)) {
      term.pause();
    }
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
    })
    .on('commit', size => {
      if (fcServer.commit(size)) {
        term.resume();
      }
    });
}

/**
 * tinybuffer to lower message pressure on the websocket.
 * Incoming data from PTY will be held back at most for `timeout` microseconds.
 * If the accumulated data exceeds `maxSize` the message will be sent
 * immediately.
 */
function tinybuffer(socket: any, timeout: number, maxSize: number) {
  const s: string[] = [];
  let length = 0;
  let sender: any = null;
  return (data: string) => {
    s.push(data);
    length += data.length;
    if (length > maxSize) {
      socket.emit('data', s.join(''));
      s.length = 0;
      length = 0;
      if (sender) {
        clearTimeout(sender);
        sender = null;
      }
    }
    else if (!sender) {
      sender = setTimeout(() => {
        socket.emit('data', s.join(''));
        s.length = 0;
        length = 0;
        sender = null;
      }, timeout);
    }
  };
}

/**
 * Flow control - server side.
 * Does basic low to high watermark flow control.
 *
 * `account` should be fed by new chunk length and returns `true`,
 * if the underlying PTY should be paused.
 *
 * `commit` should be fed by the length value of an 'ack' message
 * indicating its final processing on xtermjs side. Returns `true`
 * if the underlying PTY should be resumed.
 *
 * Note: Chosen values for ackBytes, low and high must be within
 * reach of the chosen value of ackBytes on client side, otherwise
 * flow control may block forever sooner or later.
 *
 * The default values are chosen quite high to lower negative impact on overall
 * throughput. If you need snappier keyboard response under high data pressure
 * (e.g. pressing Ctrl-C while `yes` is running), lower the values.
 * This furthermore depends a lot on the general latency of your connection.
 */
class FlowControlServer {
  public counter = 0;
  constructor(
    public ackBytes: number = 524288, // 2^19
    public low: number = 524288,      // 2^19
    public high: number = 4194304     // 2^22
  ) {}
  public account(length: number): boolean {
    const old = this.counter;
    this.counter += length;
    return old < this.high && this.counter > this.high;
  }
  public commit(length: number): boolean {
    const old = this.counter;
    this.counter -= length;
    return old > this.low && this.counter < this.low;
  }
}
