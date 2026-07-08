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
import {
  start as rustStart,
  type ServerHandle,
} from '../build/wetty_server.node';
import {
  sshDefault,
  serverDefault,
  forceSSHDefault,
  defaultCommand,
} from './config/defaults.js';
import { logger } from './config/logger.js';
import type { SSH, SSL, Server } from './config/interfaces.js';

export * from './config/interfaces.js';
export { logger } from './config/logger.js';
export type { ServerHandle };

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
export const start = (
  ssh: SSH = sshDefault,
  serverConf: Server = serverDefault,
  command: string = defaultCommand,
  forcessh: boolean = forceSSHDefault,
  ssl?: SSL,
): Promise<ServerHandle> => {
  if (ssh.key) {
    logger().warn(SSH_KEY_WARNING);
  }
  return rustStart(ssh, serverConf, command, forcessh, ssl ?? null);
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
