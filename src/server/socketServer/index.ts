import compression from 'compression';
import winston from 'express-winston';
import { logger } from '../observability/logger.js';
import { serveStatic, trim } from './assets.js';
import { html } from './html.js';
import { metricMiddleware, metricRoute } from './metrics.js';
import { redirect } from './middleware.js';
import { policies } from './security.js';
import { assetsPath } from './shared/path.js';
import { listen } from './socket.js';
import { loadSSL } from './ssl.js';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '../../protocol/socket-events.js';
import type { SSL, SSLBuffer, Server } from '../config/types.js';
import type { Express } from 'express';
import type { Server as SocketServer } from 'socket.io';

export async function server(
  app: Express,
  {
    base,
    port,
    host,
    title,
    allowIframe,
    socket,
    pingInterval,
    pingTimeout,
    allowedOrigins,
    allowMissingOrigin,
  }: Server,
  ssl?: SSL,
): Promise<SocketServer<ClientToServerEvents, ServerToClientEvents>> {
  const basePath = trim(base);
  logger().info('Starting server', {
    ssl,
    port,
    base,
    title,
  });

  const client = html(basePath, title);
  app
    .disable('x-powered-by')
    .use(metricMiddleware(basePath))
    .use(`${basePath}/metrics`, metricRoute)
    .use(`${basePath}/client`, serveStatic('client'))
    .get(`${basePath}/sw.js`, (_req, res) => {
      res.sendFile(assetsPath('sw.js'));
    })
    .use(
      winston.logger({
        winstonInstance: logger(),
        expressFormat: true,
        level: 'http',
      }),
    )
    .use(compression())
    .use(redirect)
    .use(policies(allowIframe))
    .get(basePath, client)
    .get(`${basePath}/ssh/:user`, client);

  const sslBuffer: SSLBuffer = await loadSSL(ssl);

  return listen(app, {
    host,
    port,
    path: basePath,
    ssl: sslBuffer,
    socket,
    pingInterval,
    pingTimeout,
    allowedOrigins,
    allowMissingOrigin,
  });
}
