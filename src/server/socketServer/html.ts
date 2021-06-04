import type { Request, Response, RequestHandler } from 'express';
import { isDev } from '../../shared/env.js';

const jsFiles = isDev ? ['dev', 'wetty'] : ['wetty'];
const cssFiles = ['styles', 'options', 'overlay', 'terminal'];

const render = (
  title: string,
  favicon: string,
  css: string[],
  js: string[],
  configUrl: string,
): string => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <link rel="icon" type="image/x-icon" href="${favicon}">
    <title>${title}</title>
    ${css.map(file => `<link rel="stylesheet" href="${file}" />`).join('\n')}
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
         alt="Toggle options"
       ><i class="fas fa-cogs"></i></a>
      <iframe class="editor" src="${configUrl}"></iframe>
    </div>
    <div id="terminal"></div>
    ${js
      .map(file => `<script type="module" src="${file}"></script>`)
      .join('\n')}
  </body>
</html>`;

export const html = (base: string, title: string): RequestHandler => (
  _req: Request,
  res: Response,
): void => {
  res.send(
    render(
      title,
      `${base}/favicon.ico`,
      cssFiles.map(css => `${base}/assets/css/${css}.css`),
      jsFiles.map(js => `${base}/client/${js}.js`),
	  `${base}/assets/xterm_config/index.html`,
    ),
  );
};
