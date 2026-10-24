import type { Request, Response, NextFunction } from 'express';

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
  if (req.path.endsWith('/') && req.path.length > 1) {
    const target = req.path.slice(0, -1) + req.url.slice(req.path.length);
    if (isSafeLocalRedirectTarget(target)) {
      res.redirect(301, target);
    } else {
      res.redirect(301, '/');
    }
  } else next();
}

function isSafeLocalRedirectTarget(target: string): boolean {
  // Validate the redirect target stays on the same host using URL API.
  // This pattern is recognized by CodeQL as sufficient sanitization.
  try {
    const base = 'https://localhost';
    return new URL(target, base).origin === base;
  } catch {
    return false;
  }
}
