import { isDev } from '../../shared/env.js';
import type { Request, Response, RequestHandler } from 'express';

const jsFiles = isDev ? ['dev.js', 'wetty.js'] : ['wetty.js'];

const render = (
  title: string,
  base: string,
): string => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <link rel="icon" type="image/x-icon" href="${base}/client/favicon.ico">
    <title>${title}</title>
    <link rel="stylesheet" href="${base}/client/wetty.css" />
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
      <iframe class="editor" src="${base}/client/xterm_config/index.html"></iframe>
    </div>
    <div id="functions">
      <a class="toggler"
        id="onscreen-ctrl"
        href="#"
        alt="Toggle options"
        onclick="window.toggleCTRL()"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.88 108.95" height="20">
          <path xmlns="http://www.w3.org/2000/svg" d="M23.01,0h76.87c6.33,0,12.08,2.59,16.25,6.76c4.17,4.17,6.76,9.92,6.76,16.25v62.93c0,6.33-2.59,12.08-6.76,16.25 c-4.17,4.17-9.92,6.76-16.25,6.76H23.01c-6.33,0-12.08-2.59-16.25-6.76C2.59,98.02,0,92.27,0,85.94V23.01 c0-6.33,2.59-12.08,6.76-16.25C10.92,2.59,16.68,0,23.01,0L23.01,0z M43.42,51.16l7.42,2.37c-0.5,2.2-1.28,4.04-2.36,5.51 c-1.07,1.48-2.4,2.59-3.99,3.34c-1.59,0.75-3.61,1.13-6.06,1.13c-2.98,0-5.41-0.46-7.31-1.37c-1.89-0.92-3.51-2.53-4.88-4.83 c-1.37-2.3-2.06-5.25-2.06-8.84c0-4.79,1.21-8.47,3.62-11.05c2.42-2.57,5.83-3.86,10.24-3.86c3.45,0,6.17,0.74,8.14,2.21 c1.97,1.48,3.44,3.74,4.4,6.8l-7.46,1.75c-0.26-0.88-0.54-1.52-0.82-1.92c-0.48-0.68-1.06-1.21-1.74-1.57 c-0.69-0.37-1.45-0.55-2.3-0.55c-1.93,0-3.4,0.82-4.42,2.44c-0.77,1.21-1.16,3.11-1.16,5.69c0,3.21,0.46,5.4,1.38,6.6 c0.92,1.19,2.22,1.78,3.89,1.78c1.62,0,2.84-0.48,3.67-1.44C42.45,54.38,43.05,52.99,43.42,51.16L43.42,51.16z M4.95,77.43 c0.85,3.18,2.52,6.03,4.76,8.3l0.1,0.09c3.39,3.39,8.06,5.49,13.19,5.49h76.86l0.18,0l1.98-0.12c4.23-0.49,8.04-2.41,10.94-5.26 l0.09-0.1c2.3-2.3,4.01-5.19,4.86-8.42v-54.4c0-4.96-2.03-9.47-5.31-12.75c-3.27-3.27-7.79-5.31-12.75-5.31H23.01 c-4.96,0-9.48,2.03-12.75,5.3c-3.27,3.27-5.3,7.79-5.3,12.75V77.43L4.95,77.43z M64,34.04v7.97h4.17v5.91H64v7.43 c0,0.89,0.08,1.48,0.24,1.77c0.25,0.45,0.69,0.67,1.31,0.67c0.56,0,1.35-0.17,2.36-0.51l0.56,5.56c-1.88,0.44-3.63,0.65-5.27,0.65 c-1.89,0-3.29-0.26-4.19-0.77c-0.89-0.51-1.56-1.29-1.99-2.34c-0.43-1.05-0.64-2.74-0.64-5.08v-7.38H53.6v-5.91h2.79v-3.85 L64,34.04L64,34.04z M72.26,42.01h7.13v3.43c0.69-1.49,1.4-2.52,2.12-3.08c0.73-0.56,1.63-0.84,2.7-0.84 c1.13,0,2.36,0.37,3.69,1.11l-2.36,5.71c-0.9-0.4-1.61-0.59-2.14-0.59c-0.99,0-1.77,0.44-2.32,1.31c-0.78,1.23-1.18,3.53-1.18,6.89 v7.05h-7.65V42.01L72.26,42.01z M91.09,34.04h7.61v28.97h-7.61V34.04L91.09,34.04z"/>
        </svg>
      </a>
    </div>
    <div id="terminal"></div>
    ${jsFiles
        .map(file => `    <script type="module" src="${base}/client/${file}"></script>`)
        .join('\n')
    }
  </body>
</html>`;

export const html = (base: string, title: string): RequestHandler => (
  _req: Request,
  res: Response,
): void => {
  res.send(
    render(
      title,
      base,
    ),
  );
};
