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
import { xTermConfHTML } from './socketServer/xtermConfig.js';
import { metricMiddleware, metricRoute } from './socketServer/metrics.js';

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
  const xTermConf = await xTermConfHTML(basePath);
  app
    .disable('x-powered-by')
    .use(metricMiddleware(basePath))
    .use(`${basePath}/metrics`, metricRoute)
    .use(`${basePath}/web_modules`, await serveStatic('web_modules'))
    .use(`${basePath}/assets`, await serveStatic('assets'))
    .use(`${basePath}/client`, await serveStatic('client'))
    .use(
      winston.logger({
        winstonInstance: logger(),
        expressFormat: true,
        level: 'http',
      }),
    )
    .use(compression())
    .use(await favicon(basePath))
    .use(redirect)
    .use(policies(allowIframe))
    .get(basePath, client)
    .get(`${basePath}/ssh/:user`, client)
    .get(`${basePath}/xterm_config`, xTermConf);

  const sslBuffer: SSLBuffer = await loadSSL(ssl);

  return listen(app, host, port, basePath, sslBuffer);
}
