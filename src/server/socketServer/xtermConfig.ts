import type { Request, Response, RequestHandler } from 'express';
import { readFile } from 'fs/promises';
import { rootDir } from './shared/path.js';

const render = (
  version: string,
  css: string,
  js: string,
): string => `<!doctype html>
<html lang="en">
  <head>
    <title>Wetty XTerm Configuration</title>
    <link rel="stylesheet" href="${css}/xTermConfig.css" />
  </head>
  <body>
    <header>
      <h1>Configure</h1>
      <p>WeTTy ${version}</p>
    </header>

    <script type="module" src="${js}/xTermConfig.js"></script>
    <script type="module" src="${js}/generalOptions.js"></script>
    <script type="module" src="${js}/colorTheme.js"></script>
    <script type="module" src="${js}/advancedOptions.js"></script>
    <script type="module" src="${js}/defaults.js"></script>
  </body>
</html>`;

export async function xTermConfHTML(base: string): Promise<RequestHandler> {
  const filePath = await rootDir();
  const pathURL = new URL(`${filePath}/package.json`, import.meta.url);
  const json = await readFile(pathURL);
  const packageJSON = JSON.parse(json.toString());
  return (_req: Request, res: Response): void => {
    res.send(
      render(packageJSON.version, `${base}/assets/css`, `${base}/client`),
    );
  };
}
