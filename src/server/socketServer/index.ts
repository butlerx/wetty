import * as compression from 'compression';
import * as express from 'express';
import * as favicon from 'serve-favicon';
import * as helmet from 'helmet';
import * as http from 'http';
import * as https from 'https';
import * as path from 'path';
import * as socket from 'socket.io';
import { isUndefined } from 'lodash';
import * as morgan from 'morgan';
import logger from '../utils/logger';
import { SSLBuffer, Server } from '../interfaces';
import html from './html';

const distDir = path.join(__dirname, 'client');

const trim = (str: string): string => str.replace(/\/*$/, '');

export default function createServer(
  { base, port, host, title, bypasshelmet }: Server,
  { key, cert }: SSLBuffer
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
    .use(morgan('combined', { stream: logger.stream }))
    .use(compression())
    .use(favicon(path.join(distDir, 'favicon.ico')))
    .use(`${basePath}/public`, express.static(distDir))
    .use((req, res, next) => {
      if (req.url === basePath) res.redirect(301, `${req.url}/`);
      else next();
    });

  // Allow helmet to be bypassed.
  // Unfortunately, order matters with middleware
  // which is why this is thrown in the middle
  if (!bypasshelmet) {
    app.use(helmet());
  }

  const client = html(base, title);
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
    { path: `${basePath}/socket.io` }
  );
}
