import { describe, it, expect } from 'vitest';
import { oauthService } from '../../src/modules/oauth/oauth.service.js';
import { generateUniqueUsername, generateOAuthState, generateCodeVerifier, generateCodeChallenge } from '../../src/modules/oauth/oauth.utils.js';
//import { AppError } from '../../src/shared/errors/app-error.js';

describe('OAuth Utilities', () => {
  it('should generate random OAuth state', () => {
    const state1 = generateOAuthState();
    const state2 = generateOAuthState();
    expect(state1).toBeDefined();
    expect(typeof state1).toBe('string');
    expect(state1).not.toBe(state2);
  });

  it('should generate PKCE code verifier and challenge', () => {
    const verifier = generateCodeVerifier();
    const challenge = generateCodeChallenge(verifier);
    expect(verifier).toBeDefined();
    expect(challenge).toBeDefined();
    expect(verifier).not.toBe(challenge);
  });

  it('should generate unique username from email', async () => {
    const username = await generateUniqueUsername('john.doe@example.com', 'John Doe');
    expect(username).toBe('johndoe');
  });
});

describe('OAuthService', () => {
  it('should generate authorization URL for Google', async () => {
    const url = await oauthService.start('google');
    expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url).toContain('response_type=code');
    expect(url).toContain('client_id');
  });

  it('should generate authorization URL for GitHub', async () => {
    const url = await oauthService.start('github');
    expect(url).toContain('https://github.com/login/oauth/authorize');
    expect(url).toContain('client_id');
    expect(url).toContain('scope=read%3Auser+user%3Aemail');
  });

  it('should throw error for unsupported provider', async () => {
    await expect(oauthService.start('invalid' as any)).rejects.toThrow('Unsupported OAuth provider');
  });

  it('should throw error on handleCallback when state is invalid or expired', async () => {
    await expect(
      oauthService.handleCallback('google', 'test_code', 'non_existent_state')
    ).rejects.toThrow('Invalid or expired OAuth state parameter');
  });
});
