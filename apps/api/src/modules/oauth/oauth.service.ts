import { randomUUID, createHash } from 'node:crypto';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/app-error.js';
import { redis } from '../../infrastructure/redis/index.js';
import {
  signAccessToken,
  signRefreshToken,
} from '../../infrastructure/security/jwt.js';
import {
  generateOAuthState,
  generateCodeVerifier,
  generateCodeChallenge,
  generateUniqueUsername,
} from './oauth.utils.js';
import { OAUTH_STATE_TTL_SECONDS } from './oauth.constants.js';
import { GoogleOAuthProvider } from './providers/google.provider.js';
import { GitHubOAuthProvider } from './providers/github.provider.js';
import {
  OAuthRepository,
  oauthRepository as defaultOAuthRepository,
} from './oauth.repository.js';
import { authRepository as defaultAuthRepository } from '../auth/auth.repository.js';
import type { OAuthProvider } from './providers/oauth.provider.js';
import type {
  OAuthProviderName,
  OAuthState,
  OAuthResult,
} from './oauth.types.js';
import type { OAuthProvider as OAuthProviderEnum } from '../../generated/prisma/enums.js';

function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function getRefreshExpiration(): Date {
  const days = 7;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export class OAuthService {
  private readonly providers: Record<OAuthProviderName, OAuthProvider>;

  constructor(
    private readonly oauthRepository: OAuthRepository = defaultOAuthRepository,
    private readonly authRepository = defaultAuthRepository,
  ) {
    this.providers = {
      google: new GoogleOAuthProvider(),
      github: new GitHubOAuthProvider(),
    };
  }

  async start(providerName: OAuthProviderName): Promise<string> {
    const provider = this.providers[providerName];
    if (!provider) {
      throw new AppError(
        `Unsupported OAuth provider: ${providerName}`,
        400,
        'UNSUPPORTED_OAUTH_PROVIDER',
      );
    }

    const state = generateOAuthState();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    const oauthState: OAuthState = {
      provider: providerName,
      codeVerifier,
      redirectUri: env.FRONTEND_URL,
      createdAt: Date.now(),
    };

    // Store state in Redis with TTL
    await redis.setex(
      `oauth:state:${state}`,
      OAUTH_STATE_TTL_SECONDS,
      JSON.stringify(oauthState),
    );

    return provider.getAuthorizationUrl({
      state,
      codeChallenge,
    });
  }

  async handleCallback(
    providerName: OAuthProviderName,
    code: string,
    state: string,
    metadata: { userAgent?: string | undefined; ipAddress?: string | undefined } = {},
  ): Promise<OAuthResult> {
    const stateKey = `oauth:state:${state}`;
    const rawState = await redis.get(stateKey);

    if (!rawState) {
      throw new AppError(
        'Invalid or expired OAuth state parameter',
        400,
        'INVALID_OAUTH_STATE',
      );
    }

    // Delete state after one-time verification
    await redis.del(stateKey);

    const oauthState: OAuthState = JSON.parse(rawState);

    if (oauthState.provider !== providerName) {
      throw new AppError(
        'Provider mismatch in OAuth callback',
        400,
        'OAUTH_PROVIDER_MISMATCH',
      );
    }

    const provider = this.providers[providerName];

    // Exchange auth code for tokens
    const { accessToken, idToken } = await provider.exchangeCode({
      code,
      codeVerifier: oauthState.codeVerifier,
    });

    // Fetch user profile from the provider
    const profile = await provider.getProfile(accessToken, idToken);

    if (!profile.email) {
      throw new AppError(
        'Unable to retrieve verified email address from provider',
        400,
        'OAUTH_EMAIL_REQUIRED',
      );
    }

    const providerEnum = providerName.toUpperCase() as OAuthProviderEnum;

    // Check if OAuth account already exists
    const oauthAccount = await this.oauthRepository.findByProviderAccount(
      providerEnum,
      profile.providerAccountId,
    );

    let user: {
      id: string;
      email: string;
      username: string;
      displayName: string | null;
      role: string;
    };
    let isNewUser = false;

    if (oauthAccount) {
      // Existing user via OAuth account
      user = oauthAccount.user;
      await this.oauthRepository.updateAccountTokens(oauthAccount.id, {
        accessToken,
      });
    } else {
      // Check if user already exists by email
      const existingUser = await this.oauthRepository.findUserByEmail(
        profile.email,
      );

      if (existingUser) {
        // Link provider to existing user
        await this.oauthRepository.linkOAuthAccount({
          userId: existingUser.id,
          provider: providerEnum,
          providerAccountId: profile.providerAccountId,
          accessToken,
        });
        user = existingUser;
        isNewUser = false;
      } else {
        // Create brand new user & link OAuth account
        const username = await generateUniqueUsername(
          profile.email,
          profile.name,
        );

        const created = await this.oauthRepository.createUserWithOAuth({
          email: profile.email,
          username,
          displayName: profile.name,
          provider: providerEnum,
          providerAccountId: profile.providerAccountId,
          accessToken,
        });

        user = created.user;
        isNewUser = true;
      }
    }

    // Issue session & JWT tokens
    const sessionId = randomUUID();
    const refreshToken = await signRefreshToken(user.id, sessionId);

    await this.authRepository.createSession({
      id: sessionId,
      userId: user.id,
      refreshTokenHash: hashRefreshToken(refreshToken),
      userAgent: metadata.userAgent ?? null,
      ipAddress: metadata.ipAddress ?? null,
      expiresAt: getRefreshExpiration(),
    });

    const jwtAccessToken = await signAccessToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      },
      tokens: {
        accessToken: jwtAccessToken,
        refreshToken,
      },
      isNewUser,
    };
  }
}

export const oauthService = new OAuthService();
