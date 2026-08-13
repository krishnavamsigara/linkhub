import { OAuth2Client,CodeChallengeMethod } from 'google-auth-library';
import { env } from '../../../config/env.js';
import { AppError } from '../../../shared/errors/app-error.js';
import type { OAuthProvider } from './oauth.provider.js';
import type { OAuthProfile, OAuthTokenResponse } from '../oauth.types.js';

export class GoogleOAuthProvider implements OAuthProvider {
  private readonly client = new OAuth2Client(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI,
  );

  getAuthorizationUrl({
    state,
    codeChallenge,
  }: {
    state: string;
    codeChallenge: string;
  }): string {
    return this.client.generateAuthUrl({
      access_type: 'offline',
      scope: ['openid', 'email', 'profile'],
      state,
      code_challenge: codeChallenge,
      code_challenge_method:CodeChallengeMethod.S256,
    });
  }

  async exchangeCode({
    code,
    codeVerifier,
  }: {
    code: string;
    codeVerifier: string;
  }): Promise<OAuthTokenResponse> {
    try {
      const { tokens } = await this.client.getToken({
        code,
        codeVerifier,
      });

      if (!tokens.access_token) {
        throw new AppError(
          'Google access token missing',
          400,
          'GOOGLE_ACCESS_TOKEN_MISSING',
        );
      }

      return {
        accessToken: tokens.access_token,
        idToken: tokens.id_token ?? undefined,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to exchange authorization code with Google',
        400,
        'GOOGLE_CODE_EXCHANGE_FAILED',
      );
    }
  }

  async getProfile(
    _accessToken: string,
    idToken?: string,
  ): Promise<OAuthProfile> {
    if (!idToken) {
      throw new AppError(
        'Google ID token missing',
        400,
        'GOOGLE_ID_TOKEN_MISSING',
      );
    }

    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      if (!payload?.sub) {
        throw new AppError(
          'Invalid Google identity payload',
          401,
          'INVALID_GOOGLE_IDENTITY',
        );
      }

      return {
        providerAccountId: payload.sub,
        email: payload.email ?? null,
        emailVerified: payload.email_verified === true,
        name: payload.name ?? null,
        avatarUrl: payload.picture ?? null,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to verify Google identity token',
        401,
        'GOOGLE_AUTHENTICATION_FAILED',
      );
    }
  }
}
