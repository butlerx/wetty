import http from 'http';
import https from 'https';
import isUndefined from 'lodash/isUndefined.js';
import { Server } from 'socket.io';

import { logger } from '../../shared/logger.js';
import type { SSLBuffer } from '../../shared/interfaces.js';
import type express from 'express';

export const listen = (
  app: express.Express,
  host: string,
  port: number,
  path: string,
  { key, cert }: SSLBuffer,
  socket?: string | boolean
): Server =>{
  // Create the base HTTP/HTTPS server
  const server = !isUndefined(key) && !isUndefined(cert)
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
        connection: !isUndefined(key) && !isUndefined(cert) ? 'https' : 'http',
      });
    });
  }

  console.error(socket)

  // Create Socket.IO server
  return new Server(server, {
    path: `${path}/socket.io`,
    pingInterval: 3000,
    pingTimeout: 7000,
  });
}