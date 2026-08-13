import type {
  OAuthAuthorizationParams,
  OAuthProfile,
  OAuthTokenResponse,
} from '../oauth.types.js';

export interface OAuthProvider {
  getAuthorizationUrl(params: OAuthAuthorizationParams): string;

  exchangeCode(params: {
    code: string;
    codeVerifier: string;
  }): Promise<OAuthTokenResponse>;

  getProfile(
    accessToken: string,
    idToken?: string,
  ): Promise<OAuthProfile>;
}
