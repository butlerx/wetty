import type SocketIO from 'socket.io';
import express from 'express';
import compression from 'compression';
import winston from 'express-winston';
import type { SSL, SSLBuffer, Server } from '../shared/interfaces.js';
import { favicon, redirect } from './socketServer/middleware.js';
import { html } from './socketServer/html.js';
import { listen } from './socketServer/socket.js';
import { logger } from '../shared/logger.js';
import { serveStatic, trim } from './socketServer/assets.js';
import { policies } from './socketServer/security.js';
import { loadSSL } from './socketServer/ssl.js';
import { metrics } from './socketServer/metrics.js';

export async function server(
  { base, port, host, title, allowIframe }: Server,
  ssl?: SSL,
): Promise<SocketIO.Server> {
  const basePath = trim(base);
  logger().info('Starting server', {
    ssl,
    port,
    base,
    title,
  });

  const app = express();
  const client = html(basePath, title);
  app
    .use(metrics)
    .use(`${basePath}/web_modules`, serveStatic('web_modules'))
    .use(`${basePath}/assets`, serveStatic('assets'))
    .use(`${basePath}/client`, serveStatic('client'))
    .use(
      winston.logger({
        winstonInstance: logger(),
        expressFormat: true,
        level: 'http',
      }),
    )
    .use(compression())
    .use(favicon(basePath))
    .use(redirect)
    .use(policies(allowIframe))
    .get(basePath, client)
    .get(`${basePath}/ssh/:user`, client);

  const sslBuffer: SSLBuffer = await loadSSL(ssl);

  return listen(app, host, port, basePath, sslBuffer);
}
