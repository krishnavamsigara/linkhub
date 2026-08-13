export type OAuthProviderName = 'google' | 'github';

export interface OAuthState {
  provider: OAuthProviderName;
  codeVerifier: string;
  redirectUri: string;
  createdAt: number;
}

export interface OAuthProfile {
  providerAccountId: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  avatarUrl: string | null;
}

export interface OAuthCallbackInput {
  code?: string | undefined;
  state?: string | undefined;
  error?: string | undefined;
  error_description?: string | undefined;
}

export interface OAuthTokenResponse {
  accessToken: string;
  idToken?: string | undefined;
}

export interface OAuthAuthorizationParams {
  state: string;
  codeChallenge: string;
}

export interface OAuthResultUser {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  role: string;
}

export interface OAuthResult {
  user: OAuthResultUser;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  isNewUser: boolean;
}
