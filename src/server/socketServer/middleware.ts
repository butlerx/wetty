import type express from 'express';
import { join } from 'path';
import { default as _favicon } from 'serve-favicon';

export const favicon = _favicon(join('build', 'assets', 'favicon.ico'));

export function redirect(
  req: express.Request,
  res: express.Response,
  next: Function,
) {
  if (req.path.substr(-1) === '/' && req.path.length > 1)
    res.redirect(301, req.path.slice(0, -1) + req.url.slice(req.path.length));
  else next();
}
