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
  { base, port, host, title, bypasshelmet }: Server,
  { key, cert }: SSLBuffer
): SocketIO.Server {
  const basePath = trim(base);
  events.emit(
    'debug',
    `key: ${key}, cert: ${cert}, port: ${port}, base: ${base}, title: ${title}`
  );

  const html = (
    req: express.Request,
    res: express.Response
  ): express.Response => {
    const resourcePath = /^\/ssh\//.test(req.url) ? '../' : '';
    res.send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>${title}</title>
    <link rel="stylesheet" href="${resourcePath}public/index.css" />
    <link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.8.1/css/all.css" integrity="sha384-50oBUHEmvpQ+1lW4y57PTFmhCaXp0ML5d60M1M7uH2+nqUivzIebhndOJK28anvf" crossorigin="anonymous">
  </head>
  <body>
    <div id="overlay">
      <div class="error">
        <div id="msg"></div>
        <input type="button" onclick="location.reload();" value="reconnect" />
      </div>
    </div>
    <div id="options">
      <a class="toggler"
         href="#"
         alt="Toggle options"><i class="fas fa-cogs"></i></a>
      <textarea class="editor"></textarea>
    </div>
    <div id="terminal"></div>
    <script src="${resourcePath}public/index.js"></script>
  </body>
</html>`);
  }

  const app = express();
  app
    .use(morgan('combined', { stream: logger.stream }))
    .use(compression())
    .use(favicon(path.join(distDir, 'favicon.ico')))
    .use(`${basePath}/public`, express.static(distDir))
    .use((req, res, next) => {
      if (req.url === basePath) res.redirect(301, req.url + '/');
      else next();
    });

  // Allow helmet to be bypassed.
  // Unfortunately, order matters with middleware
  // which is why this is thrown in the middle
  if (!bypasshelmet) {
    app.use(helmet());
  }

  app.get(basePath, html).get(`${basePath}/ssh/:user`, html);

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
