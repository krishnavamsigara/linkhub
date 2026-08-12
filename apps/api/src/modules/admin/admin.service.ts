import { AppError } from '../../shared/errors/app-error.js';
import type { UserRole } from '../../shared/constants/roles.js';

import { prisma } from '../../infrastructure/database/index.js';

export class AdminService {
  async updateUserRole(
    actorUserId: string,
    targetUserId: string,
    newRole: UserRole,
    metadata: {
      ipAddress?: string | undefined;
      userAgent?: string | undefined;
    },
  ) {
    return prisma.$transaction(
      async (tx) => {
        const actor = await tx.user.findFirst({
          where: {
            id: actorUserId,
            deletedAt: null,
          },
        });

        if (!actor) {
          throw new AppError(
            'Actor not found',
            401,
            'ACTOR_NOT_FOUND',
          );
        }

        const target = await tx.user.findFirst({
          where: {
            id: targetUserId,
            deletedAt: null,
          },
        });

        if (!target) {
          throw new AppError(
            'Target user not found',
            404,
            'TARGET_USER_NOT_FOUND',
          );
        }

        if (actor.id === target.id) {
          throw new AppError(
            'You cannot change your own role',
            400,
            'SELF_ROLE_CHANGE_NOT_ALLOWED',
          );
        }

        if (
          actor.role !== 'SUPER_ADMIN'
        ) {
          throw new AppError(
            'Only SUPER_ADMIN can change roles',
            403,
            'ROLE_CHANGE_FORBIDDEN',
          );
        }

        if (target.role === newRole) {
          return {
            changed: false,
            user: target,
          };
        }

        const oldRole = target.role;

        const updatedUser =
          await tx.user.update({
            where: {
              id: target.id,
            },
            data: {
              role: newRole,
            },
          });

        await tx.session.updateMany({
          where: {
            userId: target.id,
            revokedAt: null,
          },
          data: {
            revokedAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            actorUserId: actor.id,
            targetUserId: target.id,
            action: 'USER_ROLE_CHANGED',
            oldRole,
            newRole,
            ipAddress: metadata.ipAddress ?? null,
            userAgent: metadata.userAgent ?? null,
          },
        });

        return {
          changed: true,
          user: updatedUser,
        };
      },
    );
  }

  async getUsers() {
    return prisma.user.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}

export const adminService =
  new AdminService();
