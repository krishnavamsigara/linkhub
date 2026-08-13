import { prisma } from '../../infrastructure/database/index.js';
import type { OAuthProvider } from '../../generated/prisma/enums.js';

export class OAuthRepository {
  async findByProviderAccount(
    provider: OAuthProvider,
    providerAccountId: string,
  ) {
    return prisma.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId,
        },
      },
      include: {
        user: true,
      },
    });
  }

  async findByUserAndProvider(userId: string, provider: OAuthProvider) {
    return prisma.oAuthAccount.findUnique({
      where: {
        userId_provider: {
          userId,
          provider,
        },
      },
    });
  }

  async findUserByEmail(email: string) {
    return prisma.user.findFirst({
      where: {
        email,
        deletedAt: null,
      },
    });
  }

  async createUserWithOAuth(data: {
    email: string;
    username: string;
    displayName?: string | null;
    provider: OAuthProvider;
    providerAccountId: string;
    accessToken?: string | null;
  }) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          username: data.username,
          displayName: data.displayName ?? null,
          role: 'USER',
        },
      });

      const oauthAccount = await tx.oAuthAccount.create({
        data: {
          userId: user.id,
          provider: data.provider,
          providerAccountId: data.providerAccountId,
          accessToken: data.accessToken ?? null,
        },
      });

      return { user, oauthAccount };
    });
  }

  async linkOAuthAccount(data: {
    userId: string;
    provider: OAuthProvider;
    providerAccountId: string;
    accessToken?: string | null;
  }) {
    return prisma.oAuthAccount.create({
      data: {
        userId: data.userId,
        provider: data.provider,
        providerAccountId: data.providerAccountId,
        accessToken: data.accessToken ?? null,
      },
    });
  }

  async updateAccountTokens(
    id: string,
    tokens: { accessToken?: string | null },
  ) {
    return prisma.oAuthAccount.update({
      where: { id },
      data: {
        accessToken: tokens.accessToken ?? null,
      },
    });
  }
}

export const oauthRepository = new OAuthRepository();
