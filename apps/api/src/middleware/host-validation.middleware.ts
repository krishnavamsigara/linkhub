import type { RequestHandler } from 'express';

import { env } from '../config/index.js';

export const validateHostHeader: RequestHandler = (req, res, next) => {
  const host = req.get('host');

  if (!host) {
    res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_HOST_HEADER',
        message: 'Host header is required',
      },
    });
    return;
  }

  const hostname = host.split(':')[0]!.toLowerCase();
  const allowedHosts = ['localhost', '127.0.0.1', '::1'];

  if (env.FRONTEND_URL) {
    try {
      const parsedUrl = new URL(env.FRONTEND_URL);
      allowedHosts.push(parsedUrl.hostname.toLowerCase());
    } catch {
      // Ignored
    }
  }

  if (env.NODE_ENV === 'production' && !allowedHosts.includes(hostname)) {
    res.status(403).json({
      success: false,
      error: {
        code: 'INVALID_HOST_HEADER',
        message: 'Untrusted host header detected',
      },
    });
    return;
  }

  next();
};
