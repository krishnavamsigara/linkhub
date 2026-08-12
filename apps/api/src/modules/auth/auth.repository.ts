import { prisma } from '../../infrastructure/database/index.js';

export class AuthRepository {
  async createCredential(userId: string, passwordHash: string) {
    return prisma.userCredential.create({
      data: {
        userId,
        passwordHash,
      },
    });
  }

  async findCredentialByUserId(userId: string) {
    return prisma.userCredential.findUnique({
      where: {
        userId,
      },
    });
  }

  async createSession(data: {
    id: string;
    userId: string;
    refreshTokenHash: string;
    userAgent?: string | null;
    ipAddress?: string | null;
    expiresAt: Date;
  }) {
    return prisma.session.create({
      data: {
        id: data.id,
        userId: data.userId,
        refreshTokenHash: data.refreshTokenHash,
        userAgent: data.userAgent ?? null,
        ipAddress: data.ipAddress ?? null,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findSessionById(id: string) {
    return prisma.session.findUnique({
      where: {
        id,
      },
      include: {
        user: true,
      },
    });
  }

  async revokeSession(id: string) {
    return prisma.session.update({
      where: {
        id,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async revokeAllUserSessions(userId: string) {
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

  async rotateSession(
    sessionId: string,
    refreshTokenHash: string,
    expiresAt: Date,
  ) {
    return prisma.session.update({
      where: {
        id: sessionId,
      },
      data: {
        refreshTokenHash,
        expiresAt,
      },
    });
  }
}

export const authRepository = new AuthRepository();
