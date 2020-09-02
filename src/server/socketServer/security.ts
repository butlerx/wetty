import helmet from 'helmet';
import type { Request, Response } from 'express';

export const policies = (allowIframe: boolean) => (
  req: Request,
  res: Response,
  next: (err?: unknown) => void,
) => {
  helmet({
    frameguard: allowIframe ? false : { action: 'sameorigin' },
    referrerPolicy: { policy: ['no-referrer-when-downgrade'] },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'", 'data:'],
        connectSrc: [
          "'self'",
          (req.protocol === 'http' ? 'ws://' : 'wss://') + req.get('host'),
        ],
      },
    },
  })(req, res, next);
};
