import type { Request, Response, NextFunction, RequestHandler } from 'express';
import etag from 'etag';
import fresh from 'fresh';
import parseUrl from 'parseurl';
import fs from 'fs';
import { assetsPath } from './shared/path.js';

const ONE_YEAR_MS = 60 * 60 * 24 * 365 * 1000; // 1 year

/**
 * Determine if the cached representation is fresh.
 * @param req - server request
 * @param res - server response
 * @returns if the cache is fresh or not
 */
const isFresh = (req: Request, res: Response): boolean =>
  fresh(req.headers, {
    etag: res.getHeader('ETag'),
    'last-modified': res.getHeader('Last-Modified'),
  });

/**
 * redirect requests with trailing / to remove it
 *
 * @param req - server request
 * @param res - server response
 * @param next - next middleware to call on finish
 */
export function redirect(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.path.substr(-1) === '/' && req.path.length > 1)
    res.redirect(301, req.path.slice(0, -1) + req.url.slice(req.path.length));
  else next();
}

/**
 * Serves the favicon located by the given `path`.
 *
 * @param basePath - server base path
 * @returns middleware
 */
export function favicon(basePath: string): RequestHandler {
  const path = assetsPath('assets', 'favicon.ico');
  return (req: Request, res: Response, next: NextFunction): void => {
    if (getPathName(req) !== `${basePath}/favicon.ico`) {
      next();
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = req.method === 'OPTIONS' ? 200 : 405;
      res.setHeader('Allow', 'GET, HEAD, OPTIONS');
      res.setHeader('Content-Length', '0');
      res.end();
      return;
    }

    fs.readFile(path, (err: Error | null, buf: Buffer) => {
      if (err) return next(err);
      Object.entries({
        'Cache-Control': `public, max-age=${Math.floor(ONE_YEAR_MS / 1000)}`,
        ETag: etag(buf),
      }).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      // Validate freshness
      if (isFresh(req, res)) {
        res.statusCode = 304;
        return res.end();
      }

      // Send icon
      res.statusCode = 200;
      res.setHeader('Content-Length', buf.length);
      res.setHeader('Content-Type', 'image/x-icon');
      return res.end(buf);
    });
  };
}

/**
 * Get the request pathname.
 *
 * @param requests
 * @returns path name or undefined
 */

function getPathName(req: Request): string | undefined {
  try {
    const url = parseUrl(req);
    return url?.pathname ? url.pathname : undefined;
  } catch (e) {
    return undefined;
  }
}
