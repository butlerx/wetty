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
         href="#"
         alt="Toggle options"
         onclick="window.toggleFunctions()"
       ><i class="fas fa-keyboard"></i></a>
      <div class="onscreen-buttons">
        <a
          href="#"
          alt="Up"
          onclick="window.pressUP()"
        >
          <div>
            Up
          </div>
        </a>
        <a
          href="#"
          alt="Down"
          onclick="window.pressDOWN()"
        >
          <div>
            Down
          </div>
        </a>
        <a
          href="#"
          alt="Left"
          onclick="window.pressLEFT()"
        >
          <div>
            Left
          </div>
        </a>
        <a
          href="#"
          alt="Right"
          onclick="window.pressRIGHT()"
        >
          <div>
            Right
          </div>
        </a>
        <a
          href="#"
          alt="Esc"
          onclick="window.pressESC()"
        >
          <div>
            Esc
          </div>
        </a>
        <a
          id="onscreen-ctrl"
          href="#"
          alt="Ctrl"
          onclick="window.toggleCTRL()"
        >
          <div>
            Ctrl
          </div>
        </a>
        <a
          href="#"
          alt="Tab"
          onclick="window.pressTAB()"
        >
          <div>
            Tab
          </div>
        </a>
      </div>
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
