import type { RequestHandler } from 'express';

import { prisma } from '../infrastructure/database/index.js';
import type { UserRole } from '../shared/constants/roles.js';

export function requireRole(
  ...allowedRoles: UserRole[]
): RequestHandler {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHENTICATED',
            message: 'Authentication required',
          },
        });

        return;
      }

      const user = await prisma.user.findFirst({
        where: {
          id: req.user.id,
          deletedAt: null,
        },
        select: {
          id: true,
          role: true,
        },
      });

      if (!user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        });

        return;
      }

      if (!allowedRoles.includes(user.role)) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission',
          },
        });

        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
