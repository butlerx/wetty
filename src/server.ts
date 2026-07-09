/**
 * Create WeTTY server
 * @module WeTTy
 *
 * This module is a thin shim that delegates to the Rust napi-rs native addon
 * (`wetty-server`).  The public API signatures are identical to the previous
 * Express/Socket.IO implementation with one intentional breaking change:
 *
 *   - `start()` and `decorateServerWithSsh()` now return
 *     `Promise<ServerHandle>` instead of `Promise<SocketIO.Server>`.
 *
 * Callers who previously called methods on the returned `SocketIO.Server`
 * (e.g. `io.on('connection', ...)`) will need to adapt.  The `ServerHandle`
 * exposes a single `close()` method to gracefully shut down the server.
 */
import { createRequire } from 'module';
import {
  sshDefault,
  serverDefault,
  forceSSHDefault,
  defaultCommand,
} from './config/defaults.js';
import { logger } from './config/logger.js';
import type { SSH, SSL, Server } from './config/interfaces.js';

const require = createRequire(import.meta.url);
const { start: rustStart } = require('../build/wetty_server.node') as {
  start: (
    ssh: SSH | null,
    serverConf: RustServerConf | null,
    command: string | null,
    forcessh: boolean | null,
    ssl: SSL | null,
  ) => Promise<RustServerHandle>;
};

interface RustServerConf {
  port: number;
  host: string;
  socket: string;
  title: string;
  base: string;
  allowIframe: boolean;
}

interface RustServerHandle {
  close(): void;
  wait(): Promise<void>;
}

export interface ServerHandle {
  close(): void;
  wait(): Promise<void>;
}

export * from './config/interfaces.js';
export { logger } from './config/logger.js';

const SSH_KEY_WARNING = [
  'Password-less auth enabled using private key.',
  'This is dangerous, anything that reaches the wetty server',
  'will be able to run remote operations without authentication.',
].join(' ');

/**
 * Starts WeTTy Server
 * @name startServer
 * @returns Promise that resolves a {@link ServerHandle}
 */
export const start = async (
  ssh: SSH = sshDefault,
  serverConf: Server = serverDefault,
  command: string = defaultCommand,
  forcessh: boolean = forceSSHDefault,
  ssl?: SSL,
): Promise<ServerHandle> => {
  if (ssh.key) {
    logger().warn(SSH_KEY_WARNING);
  }
  const rustConf: RustServerConf = {
    ...serverConf,
    socket: typeof serverConf.socket === 'string' ? serverConf.socket : '',
  };
  const handle = await rustStart(ssh, rustConf, command, forcessh, ssl ?? null);
  return {
    close() {
      handle.close();
    },
    wait() {
      return handle.wait();
    },
  };
};

/**
 * Attach WeTTy to an existing server – kept for backward compatibility.
 *
 * @deprecated The `app` parameter is ignored in the Rust backend.
 *   Prefer {@link start} for new code.
 */
export async function decorateServerWithSsh(
  _app: unknown,
  ssh: SSH = sshDefault,
  serverConf: Server = serverDefault,
  command: string = defaultCommand,
  forcessh: boolean = forceSSHDefault,
  ssl?: SSL,
): Promise<ServerHandle> {
  return start(ssh, serverConf, command, forcessh, ssl);
}
