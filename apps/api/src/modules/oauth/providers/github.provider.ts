import { env } from '../../../config/env.js';
import { AppError } from '../../../shared/errors/app-error.js';
import type { OAuthProvider } from './oauth.provider.js';
import type { OAuthProfile, OAuthTokenResponse } from '../oauth.types.js';

export class GitHubOAuthProvider implements OAuthProvider {
  getAuthorizationUrl({
    state,
    codeChallenge,
  }: {
    state: string;
    codeChallenge: string;
  }): string {
    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      redirect_uri: env.GITHUB_REDIRECT_URI,
      scope: 'read:user user:email',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async exchangeCode({
    code,
    codeVerifier,
  }: {
    code: string;
    codeVerifier: string;
  }): Promise<OAuthTokenResponse> {
    try {
      const response = await fetch(
        'https://github.com/login/oauth/access_token',
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'LinkHub-API',
          },
          body: JSON.stringify({
            client_id: env.GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET,
            code,
            redirect_uri: env.GITHUB_REDIRECT_URI,
            code_verifier: codeVerifier,
          }),
        },
      );

      if (!response.ok) {
        throw new AppError(
          'GitHub token exchange failed',
          400,
          'GITHUB_TOKEN_EXCHANGE_FAILED',
        );
      }

      const data = (await response.json()) as {
        access_token?: string;
        error?: string;
        error_description?: string;
      };

      if (!data.access_token) {
        throw new AppError(
          data.error_description ?? data.error ?? 'GitHub access token missing',
          400,
          'GITHUB_ACCESS_TOKEN_MISSING',
        );
      }

      return {
        accessToken: data.access_token,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to exchange authorization code with GitHub',
        400,
        'GITHUB_CODE_EXCHANGE_FAILED',
      );
    }
  }

  async getProfile(accessToken: string): Promise<OAuthProfile> {
    try {
      const headers = {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'LinkHub-API',
      };

      const userResponse = await fetch('https://api.github.com/user', {
        headers,
      });

      if (!userResponse.ok) {
        throw new AppError(
          'GitHub profile request failed',
          401,
          'GITHUB_PROFILE_FAILED',
        );
      }

      const user = (await userResponse.json()) as {
        id: number;
        login: string;
        name?: string | null;
        avatar_url?: string | null;
        email?: string | null;
      };

      let email = user.email ?? null;
      let emailVerified = false;

      if (!email) {
        const emailResponse = await fetch(
          'https://api.github.com/user/emails',
          { headers },
        );

        if (emailResponse.ok) {
          const emails = (await emailResponse.json()) as Array<{
            email: string;
            primary: boolean;
            verified: boolean;
          }>;

          const primary = emails.find(
            (item) => item.primary && item.verified,
          );

          if (primary) {
            email = primary.email;
            emailVerified = true;
          } else {
            const anyVerified = emails.find((item) => item.verified);
            if (anyVerified) {
              email = anyVerified.email;
              emailVerified = true;
            }
          }
        }
      } else {
        emailVerified = true;
      }

      return {
        providerAccountId: String(user.id),
        email,
        emailVerified,
        name: user.name ?? user.login ?? null,
        avatarUrl: user.avatar_url ?? null,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to fetch user profile from GitHub',
        401,
        'GITHUB_AUTHENTICATION_FAILED',
      );
    }
  }
}
