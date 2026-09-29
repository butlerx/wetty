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
import type { IncomingMessage } from 'http';

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

const parseOrigin = (value: string): string | undefined => {
  try {
    const parsed = new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol)
      ? parsed.origin
      : undefined;
  } catch {
    return undefined;
  }
};

const firstHeaderValue = (
  value: string | string[] | undefined,
): string | undefined => {
  const first = Array.isArray(value) ? value[0] : value?.split(',')[0];
  return first?.trim();
};

const expectedOrigin = (req: IncomingMessage): string | undefined => {
  const host = firstHeaderValue(req.headers.host);
  if (host === undefined) {
    return undefined;
  }

  const encrypted = 'encrypted' in req.socket && req.socket.encrypted === true;
  const forwardedProtocol = firstHeaderValue(req.headers['x-forwarded-proto']);
  const protocol = (
    encrypted ? 'https' : (forwardedProtocol ?? 'http')
  ).toLowerCase();

  return ['http', 'https'].includes(protocol)
    ? parseOrigin(`${protocol}://${host}`)
    : undefined;
};

const originAllowed = (
  req: IncomingMessage,
  allowedOrigins: ReadonlySet<string>,
  allowMissingOrigin = false,
): boolean => {
  const origin = firstHeaderValue(req.headers.origin);
  if (origin === 'null') {
    return false;
  }
  if (origin === undefined) {
    return allowMissingOrigin;
  }

  const parsedOrigin = parseOrigin(origin);
  return (
    parsedOrigin !== undefined &&
    (parsedOrigin === expectedOrigin(req) || allowedOrigins.has(parsedOrigin))
  );
};

const originAllowlist = (origins: string[]): ReadonlySet<string> =>
  new Set(
    origins.map((origin) => {
      const parsed = parseOrigin(origin);
      if (parsed === undefined) {
        throw new Error(`Invalid allowed origin: ${origin}`);
      }
      return parsed;
    }),
  );

interface ListenOptions {
  host: string;
  port: number;
  path: string;
  ssl: SSLBuffer;
  socket?: string | boolean;
  pingInterval?: number;
  pingTimeout?: number;
  allowedOrigins?: string[];
  allowMissingOrigin?: boolean;
}

export const listen = (
  app: express.Express,
  {
    host,
    port,
    path,
    ssl: { key, cert },
    socket,
    pingInterval,
    pingTimeout,
    allowedOrigins = [],
    allowMissingOrigin = false,
  }: ListenOptions,
): Server => {
  const allowed = originAllowlist(allowedOrigins);

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
    allowRequest: (req, callback) => {
      const accepted = originAllowed(req, allowed, allowMissingOrigin);
      callback(accepted ? null : 'Origin not allowed', accepted);
    },
  });
};
