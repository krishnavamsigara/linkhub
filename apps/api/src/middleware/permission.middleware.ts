import type { RequestHandler } from 'express';
import { prisma } from '../infrastructure/database/index.js';
import { permissionsService } from '../modules/permissions/permissions.service.js';
import { AppError } from '../shared/errors/app-error.js';

export function requirePermission(
  ...requiredPermissions: string[]
): RequestHandler {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'UNAUTHENTICATED');
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
        throw new AppError('User not found', 401, 'USER_NOT_FOUND');
      }

      if (user.role === 'SUPER_ADMIN') {
        next();
        return;
      }

      const { effectivePermissions } =
        await permissionsService.getUserEffectivePermissions(user.id);

      const hasAllPermissions = requiredPermissions.every((perm) =>
        effectivePermissions.includes(perm),
      );

      if (!hasAllPermissions) {
        const missing = requiredPermissions.filter(
          (perm) => !effectivePermissions.includes(perm),
        );

        throw new AppError(
          `Missing required permission(s): ${missing.join(', ')}`,
          403,
          'INSUFFICIENT_PERMISSIONS',
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
