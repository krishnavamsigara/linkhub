import type { RequestHandler } from 'express';

import { verifyAccessToken } from '../infrastructure/security/jwt.js';

export const requireAuth: RequestHandler =
  async (req, res, next) => {
    try {
      const authorization =
        req.get('authorization');

      if (!authorization) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHENTICATED',
            message: 'Authentication required',
          },
        });

        return;
      }

      const [scheme, token] =
        authorization.split(' ');

      if (
        scheme !== 'Bearer' ||
        !token
      ) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_AUTHORIZATION_HEADER',
            message:
              'Invalid authorization header',
          },
        });

        return;
      }

      const payload =
        await verifyAccessToken(token);

      req.user = {
        id: payload.sub,
      };

      next();
    } catch {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_ACCESS_TOKEN',
          message: 'Invalid or expired access token',
        },
      });
    }
  };
