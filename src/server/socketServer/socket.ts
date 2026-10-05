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
  // Accept only HTTP(S) origins, not URLs with credentials, paths or lists.
  // Check the raw value before URL normalization can discard unsafe parts.
  if (!/^https?:\/\/[^/?#\s\\,@*]+\/?$/i.test(value)) return undefined;
  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
};

const originAllowed = (
  req: IncomingMessage,
  allowedOrigins: ReadonlySet<string>,
  allowedHosts: ReadonlySet<string>,
  allowMissingOrigin: boolean,
): boolean => {
  const { origin } = req.headers;
  if (origin === undefined) {
    if (allowMissingOrigin) return true;
    // Browsers can omit Origin on same-origin polling. DNS rebinding is also
    // same-origin, so Fetch Metadata alone is insufficient: pin the Host to
    // the explicitly configured origins instead of trusting an arbitrary Host.
    return (
      req.headers['sec-fetch-site'] === 'same-origin' &&
      req.headers.host !== undefined &&
      allowedHosts.has(req.headers.host.toLowerCase())
    );
  }

  const parsedOrigin =
    typeof origin === 'string' ? parseOrigin(origin) : undefined;
  return parsedOrigin !== undefined && allowedOrigins.has(parsedOrigin);
};

const originAllowlist = (origins: string[]): ReadonlySet<string> => {
  if (origins.length === 0) {
    throw new Error(
      'Configure at least one allowed origin with --allowed-origin, ALLOWEDORIGINS, or server.allowedOrigins',
    );
  }
  return new Set(
    origins.map((origin) => {
      const parsed = parseOrigin(origin);
      if (parsed === undefined) {
        throw new Error(`Invalid allowed origin: ${origin}`);
      }
      return parsed;
    }),
  );
};

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
  // Canonical origins contain only the scheme and authority.
  const allowedHosts = new Set(
    [...allowed].map((origin) => origin.slice(origin.indexOf('://') + 3)),
  );

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
      const accepted = originAllowed(
        req,
        allowed,
        allowedHosts,
        allowMissingOrigin,
      );
      callback(accepted ? null : 'Origin not allowed', accepted);
    },
  });
};
