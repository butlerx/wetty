import compression from 'compression';
import express from 'express';
import favicon from 'serve-favicon';
import helmet from 'helmet';
import http from 'http';
import https from 'https';
import isUndefined from 'lodash/isUndefined.js';
import socket from 'socket.io';
import winston from 'express-winston';
import { join, resolve } from 'path';

import type { SSLBuffer, Server } from '../shared/interfaces';
import { html } from './socketServer/html.js';
import { logger } from '../shared/logger.js';

const trim = (str: string): string => str.replace(/\/*$/, '');
const serveStatic = (path: string) =>
  express.static(resolve(process.cwd(), 'build', path));

export function server(
  { base, port, host, title, bypassHelmet }: Server,
  { key, cert }: SSLBuffer,
): SocketIO.Server {
  const basePath = trim(base);

  logger.info('Starting server', {
    key,
    cert,
    port,
    base,
    title,
  });

  const app = express();
  app
    .use(`${basePath}/web_modules`, serveStatic('web_modules'))
    .use(`${basePath}/assets`, serveStatic('assets'))
    .use(`${basePath}/client`, serveStatic('client'))
    .use(winston.logger(logger))
    .use(compression())
    .use(favicon(join('build', 'assets', 'favicon.ico')));
  /* .use((req, res, next) => {
      if (req.path.substr(-1) === '/' && req.path.length > 1)
        res.redirect(
          301,
          req.path.slice(0, -1) + req.url.slice(req.path.length),
        );
      else next();
    }); */

  // Allow helmet to be bypassed.
  // Unfortunately, order matters with middleware
  // which is why this is thrown in the middle
  if (!bypassHelmet) {
    app.use(helmet());
  }

  const client = html(basePath, title);
  app.get(basePath, client).get(`${basePath}/ssh/:user`, client);

  return socket(
    !isUndefined(key) && !isUndefined(cert)
      ? https.createServer({ key, cert }, app).listen(port, host, () => {
          logger.info('Server started', {
            port,
            connection: 'https',
          });
        })
      : http.createServer(app).listen(port, host, () => {
          logger.info('Server started', {
            port,
            connection: 'http',
          });
        }),
    {
      path: `${basePath}/socket.io`,
      pingInterval: 3000,
      pingTimeout: 7000,
    },
  );
}
