import http from 'http';
import https from 'https';
import { Server } from 'socket.io';

import {
  defaultPingInterval,
  defaultPingTimeout,
  positiveIntOr,
} from '../../shared/defaults.js';
import { logger } from '../../shared/logger.js';
import type { SSLBuffer } from '../../shared/interfaces.js';
import type express from 'express';

/**
 * Resolve a socket.io heartbeat value, warning when an unusable one is dropped
 *
 * socket.io turns a `NaN` or non positive interval into a 1ms timer, which
 * pings in a tight loop and disconnects the client, so bad input falls back to
 * the default rather than reaching the server options
 *
 * @param value - configured value, if any
 * @param fallback - default to use when `value` is unusable
 * @param option - option name, for the warning
 * @returns a usable heartbeat value in milliseconds
 *
 */
const heartbeat = (
  value: number | undefined,
  fallback: number,
  option: string,
): number => {
  const resolved = positiveIntOr(value, fallback);
  if (value !== undefined && resolved !== value) {
    logger().warn('Ignoring invalid heartbeat value, using default', {
      option,
      value,
      default: fallback,
    });
  }
  return resolved;
};

export const listen = (
  app: express.Express,
  host: string,
  port: number,
  path: string,
  { key, cert }: SSLBuffer,
  socket?: string | boolean,
  pingInterval?: number,
  pingTimeout?: number,
): Server => {
  // Create the base HTTP/HTTPS server
  const server =
    key !== undefined && cert !== undefined
      ? https.createServer({ key, cert }, app)
      : http.createServer(app);

  // Start listening on either Unix socket or TCP
  if (socket) {
    server.listen(socket, () => {
      logger().info('Server listening on Unix socket', { socket });
    });
  } else {
    server.listen(port, host, () => {
      logger().info('Server started', {
        port,
        connection: key !== undefined && cert !== undefined ? 'https' : 'http',
      });
    });
  }

  // Create Socket.IO server
  return new Server(server, {
    path: `${path}/socket.io`,
    pingInterval: heartbeat(pingInterval, defaultPingInterval, 'pingInterval'),
    pingTimeout: heartbeat(pingTimeout, defaultPingTimeout, 'pingTimeout'),
  });
};
