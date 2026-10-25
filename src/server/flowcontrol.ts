import {
  MAX_FLOW_CONTROL_COMMIT,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from '../protocol/socket-events.js';
import type { Socket } from 'socket.io';

/**
 * tinybuffer to lower message pressure on the websocket.
 * Incoming data from PTY will be held back at most for `timeout` microseconds.
 * If the accumulated data exceeds `maxSize` the message will be sent
 * immediately.
 */
export interface BufferedSender {
  (data: string): void;
  cancel(): void;
}

export function tinybuffer(
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  timeout: number,
  maxSize: number,
): BufferedSender {
  const chunks: string[] = [];
  let active = true;
  let length = 0;
  let sender: NodeJS.Timeout | undefined;

  function clear(): void {
    chunks.length = 0;
    length = 0;
    if (sender !== undefined) {
      clearTimeout(sender);
      sender = undefined;
    }
  }

  function emit(): void {
    if (!active) return;
    socket.emit('data', chunks.join(''));
    clear();
  }

  const send = ((data: string): void => {
    if (!active) return;
    chunks.push(data);
    length += data.length;
    if (length > maxSize) emit();
    else sender ??= setTimeout(emit, timeout);
  }) as BufferedSender;

  send.cancel = (): void => {
    if (!active) return;
    active = false;
    clear();
  };

  return send;
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
 * Note: Chosen values for low and high must be within reach of the
 * chosen value of ackBytes on client side, otherwise
 * flow control may block forever sooner or later.
 *
 * The default values are chosen quite high to lower negative impact on overall
 * throughput. If you need snappier keyboard response under high data pressure
 * (e.g. pressing Ctrl-C while `yes` is running), lower the values.
 * This furthermore depends a lot on the general latency of your connection.
 */
export class FlowControlServer {
  public counter = 0;
  public low = 524288; // 2^19 --> 2x ackBytes from frontend
  public high = MAX_FLOW_CONTROL_COMMIT; // 2^21 --> 8x ackBytes from frontend

  constructor(low?: number, high?: number) {
    if (low != null) {
      this.low = low;
    }
    if (high != null) {
      this.high = high;
    }
  }

  public account(length: number): boolean {
    const old = this.counter;
    this.counter += length;
    return old < this.high && this.counter >= this.high;
  }

  public commit(length: number): boolean {
    const old = this.counter;
    this.counter -= length;
    return old > this.low && this.counter <= this.low;
  }
}
