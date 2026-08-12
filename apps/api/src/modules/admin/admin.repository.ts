import { prisma } from '../../infrastructure/database/index.js';

export class AdminRepository {
  async findUserById(userId: string) {
    return prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
    });
  }

  async updateUserRole(
    userId: string,
    role: 'USER' | 'ADMIN' | 'SUPER_ADMIN',
  ) {
    return prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        role,
      },
    });
  }

  async revokeUserSessions(
    userId: string,
  ) {
    return prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async createAuditLog(data: {
    actorUserId: string;
    targetUserId: string;
    action: string;
    oldRole: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
    newRole: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
    ipAddress?: string;
    userAgent?: string;
  }) {
    return prisma.auditLog.create({
      data: {
        actorUserId: data.actorUserId,
        targetUserId: data.targetUserId,
        action: data.action,
        oldRole: data.oldRole,
        newRole: data.newRole,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
      },
    });
  }

  async findUsers() {
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

export const adminRepository = new AdminRepository();
