import express from 'express';

const render = (
  title: string,
  css: string,
  js: string,
): string => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>${title}</title>
    <link rel="stylesheet" href="${css}" />
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
       ><i class="fas fa-cogs" /></a>
      <textarea class="editor"></textarea>
    </div>
    <div id="terminal"></div>
    <script type="module" src="${js}" />
  </body>
</html>`;

export const html = (base: string, title: string) => (
  _req: express.Request,
  res: express.Response,
) =>
  res.send(
    render(title, `${base}/assets/styles.css`, `${base}/client/index.js`),
  );
