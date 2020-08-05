import compression from 'compression';
import express from 'express';
import favicon from 'serve-favicon';
import helmet from 'helmet';
import http from 'http';
import https from 'https';
import isUndefined from 'lodash/isUndefined.js';
import sassMiddleware from 'node-sass-middleware';
import socket from 'socket.io';
import winston from 'express-winston';
import { join, resolve } from 'path';

import type { SSLBuffer, Server } from '../shared/interfaces';
import { html } from './socketServer/html.js';
import { logger } from '../shared/logger.js';

const trim = (str: string): string => str.replace(/\/*$/, '');

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
    .use(
      `${basePath}/web_modules`,
      express.static(resolve(process.cwd(), 'web_modules')),
    )
    .use(
      sassMiddleware({
        src: resolve(process.cwd(), 'lib', 'client'),
        dest: resolve(process.cwd(), 'assets'),
        outputStyle: 'compressed',
        log(severity: string, key: string, value: string) {
          logger.log(severity, 'node-sass-middleware   %s : %s', key, value);
        },
      }),
    )
    .use(`${basePath}/assets`, express.static(resolve(process.cwd(), 'assets')))
    .use(
      `${basePath}/client`,
      express.static(resolve(process.cwd(), 'lib', 'client')),
    )
    .use(winston.logger(logger))
    .use(compression())
    .use(favicon(join('assets', 'favicon.ico')));
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
