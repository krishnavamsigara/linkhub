import { randomUUID, createHash } from 'node:crypto';

import { AppError } from '../../shared/errors/app-error.js';
import { prisma } from '../../infrastructure/database/index.js';

import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../infrastructure/security/jwt.js';

import { passwordHasher } from '../../infrastructure/security/password-hasher.js';

import { authRepository } from './auth.repository.js';

import type {
  AuthResult,
  LoginInput,
  RegisterInput,
} from './auth.types.js';

export interface AuthMetadata {
  userAgent?: string | undefined;
  ipAddress?: string | undefined;
}

function hashRefreshToken(token: string): string {
  return createHash('sha256')
    .update(token)
    .digest('hex');
}

function getRefreshExpiration(): Date {
  const days = 7;

  return new Date(
    Date.now() + days * 24 * 60 * 60 * 1000,
  );
}

export class AuthService {
  async register(
    input: RegisterInput,
    metadata: AuthMetadata,
  ): Promise<AuthResult & { refreshToken: string }> {
    const existingEmail = await prisma.user.findFirst({
      where: {
        email: input.email,
        deletedAt: null,
      },
    });

    if (existingEmail) {
      throw new AppError(
        'Email is already registered',
        409,
        'USER_EMAIL_ALREADY_EXISTS',
      );
    }

    const existingUsername =
      await prisma.user.findFirst({
        where: {
          username: input.username,
          deletedAt: null,
        },
      });

    if (existingUsername) {
      throw new AppError(
        'Username is already taken',
        409,
        'USER_USERNAME_ALREADY_EXISTS',
      );
    }

    const passwordHash =
      await passwordHasher.hash(input.password);

    const sessionId = randomUUID();

    const result = await prisma.$transaction(
      async (tx) => {
        const user = await tx.user.create({
          data: {
            email: input.email,
            username: input.username,
            displayName: input.displayName ?? null,
            role: 'USER',
          },
        });

        const refreshToken =
          await signRefreshToken(
            user.id,
            sessionId,
          );

        await tx.userCredential.create({
          data: {
            userId: user.id,
            passwordHash,
          },
        });

        await tx.session.create({
          data: {
            id: sessionId,
            userId: user.id,
            refreshTokenHash:
              hashRefreshToken(
                refreshToken,
              ),
            userAgent: metadata.userAgent ?? null,
            ipAddress: metadata.ipAddress ?? null,
            expiresAt:
              getRefreshExpiration(),
          },
        });

        // Create FREE subscription for new user
        const now = new Date();
        await tx.$executeRaw`
          INSERT INTO subscriptions (user_id, plan, status, updated_at)
          VALUES (${user.id}::uuid, 'FREE'::"Plan", 'ACTIVE'::"SubscriptionStatus", ${now})
          ON CONFLICT (user_id) DO NOTHING
        `;

        return {
          user,
          refreshToken,
        };
      },
    );

    const accessToken =
      await signAccessToken(
        result.user.id,
      );

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        username: result.user.username,
        displayName:
          result.user.displayName,
        role: result.user.role,
      },
      accessToken,
      refreshToken:
        result.refreshToken,
    };
  }

  async login(
    input: LoginInput,
    metadata: AuthMetadata,
  ): Promise<AuthResult & { refreshToken: string }> {
    const user = await prisma.user.findFirst({
      where: {
        email: input.email,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new AppError(
        'Invalid email or password',
        401,
        'AUTHENTICATION_FAILED',
      );
    }

    const credential =
      await authRepository.findCredentialByUserId(
        user.id,
      );

    if (!credential) {
      throw new AppError(
        'Invalid email or password',
        401,
        'AUTHENTICATION_FAILED',
      );
    }

    const validPassword =
      await passwordHasher.verify(
        credential.passwordHash,
        input.password,
      );

    if (!validPassword) {
      throw new AppError(
        'Invalid email or password',
        401,
        'AUTHENTICATION_FAILED',
      );
    }

    const sessionId = randomUUID();

    const refreshToken =
      await signRefreshToken(
        user.id,
        sessionId,
      );

    await authRepository.createSession({
      id: sessionId,
      userId: user.id,
      refreshTokenHash:
        hashRefreshToken(refreshToken),
      userAgent: metadata.userAgent ?? null,
      ipAddress: metadata.ipAddress ?? null,
      expiresAt: getRefreshExpiration(),
    });

    const accessToken =
      await signAccessToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        role: user.role,

      },
      accessToken,
      refreshToken,
    };
  }

  async refresh(
    refreshToken: string,
    _metadata?: AuthMetadata,
  ) {
    let payload;

    try {
      payload =
        await verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError(
        'Invalid refresh token',
        401,
        'INVALID_REFRESH_TOKEN',
      );
    }

    const session =
      await authRepository.findSessionById(
        payload.sid,
      );

    if (!session) {
      throw new AppError(
        'Session not found',
        401,
        'SESSION_NOT_FOUND',
      );
    }

    if (
      session.revokedAt ||
      session.expiresAt <= new Date()
    ) {
      throw new AppError(
        'Session is no longer valid',
        401,
        'SESSION_INVALID',
      );
    }

    if (session.user.deletedAt) {
      await authRepository.revokeSession(
        session.id,
      );

      throw new AppError(
        'User account is unavailable',
        401,
        'USER_UNAVAILABLE',
      );
    }

    const suppliedHash =
      hashRefreshToken(refreshToken);

    if (
      suppliedHash !== session.refreshTokenHash
    ) {
      await authRepository.revokeSession(
        session.id,
      );

      throw new AppError(
        'Refresh token reuse detected',
        401,
        'REFRESH_TOKEN_REUSE',
      );
    }

    const newRefreshToken =
      await signRefreshToken(
        session.userId,
        session.id,
      );

    await authRepository.rotateSession(
      session.id,
      hashRefreshToken(newRefreshToken),
      getRefreshExpiration(),
    );

    const accessToken =
      await signAccessToken(
        session.userId,
      );

    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        username: session.user.username,
        displayName: session.user.displayName,
        role: session.user.role,
      },
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(sessionId: string): Promise<void> {
    const session =
      await authRepository.findSessionById(
        sessionId,
      );

    if (!session) {
      return;
    }

    await authRepository.revokeSession(
      sessionId,
    );
  }

  async logoutAll(userId: string): Promise<void> {
    await authRepository.revokeAllUserSessions(
      userId,
    );
  }

  async getCurrentUser(userId: string) {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new AppError(
        'User not found',
        404,
        'USER_NOT_FOUND',
      );
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
    };
  }
}

export const authService = new AuthService();
