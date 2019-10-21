import * as express from 'express';

export default (base: string, title: string) => (
  req: express.Request,
  res: express.Response
): express.Response => {
  const resourcePath = /^\/ssh\//.test(req.url.replace(base, '/')) ? '../' : '';
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
};
