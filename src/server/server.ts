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
import logger from './logger';
import events from './emitter';
import { SSLBuffer, Server } from './interfaces';

const distDir = path.join(__dirname, 'client');

const trim = (str: string): string => str.replace(/\/*$/, '');

export default function createServer(
  { base, port, host }: Server,
  { key, cert }: SSLBuffer
): SocketIO.Server {
  const basePath = trim(base);
  events.emit(
    'debug',
    `key: ${key}, cert: ${cert}, port: ${port}, base: ${base}`
  );

  const html = (
    req: express.Request,
    res: express.Response
  ): express.Response =>
    res.send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>WeTTy - The Web Terminal Emulator</title>
    <link rel="stylesheet" href="${basePath}/public/index.css" />
  </head>
  <body>
    <div id="overlay">
      <div class="error">
        <div id="msg"></div>
        <input type="button" onclick="location.reload();" value="reconnect" />
      </div>
    </div>
    <div id="terminal"></div>
    <script src="${basePath}/public/index.js"></script>
  </body>
</html>`);

  const app = express();
  app
    .use(morgan('combined', { stream: logger.stream }))
    .use(helmet({ frameguard: false }))
    .use(compression())
    .use(favicon(path.join(distDir, 'favicon.ico')))
    .use(`${basePath}/public`, express.static(distDir))
    .use((req, res, next) => {
      if (
        req.url.substr(-1) === '/' &&
        req.url.length > 1 &&
        !/\?[^]*\//.test(req.url)
      )
        res.redirect(301, req.url.slice(0, -1));
      else next();
    })
    .get(basePath, html)
    .get(`${basePath}/ssh/:user`, html);

  return socket(
    !isUndefined(key) && !isUndefined(cert)
      ? https.createServer({ key, cert }, app).listen(port, host, () => {
          events.server(port, 'https');
        })
      : http.createServer(app).listen(port, host, () => {
          events.server(port, 'http');
        }),
    { path: `${basePath}/socket.io` }
  );
}
