import type express from 'express';
import socket from 'socket.io';
import http from 'http';
import https from 'https';
import isUndefined from 'lodash/isUndefined.js';

import { logger } from '../../shared/logger.js';
import type { SSLBuffer } from '../../shared/interfaces.js';

export const listen = (
  app: express.Express,
  host: string,
  port: number,
  path: string,
  { key, cert }: SSLBuffer,
): SocketIO.Server =>
  socket(
    !isUndefined(key) && !isUndefined(cert)
      ? https.createServer({ key, cert }, app).listen(port, host, () => {
          logger().info('Server started', {
            port,
            connection: 'https',
          });
        })
      : http.createServer(app).listen(port, host, () => {
          logger().info('Server started', {
            port,
            connection: 'http',
          });
        }),
    {
      path: `${path}/socket.io`,
      pingInterval: 3000,
      pingTimeout: 7000,
    },
  );
