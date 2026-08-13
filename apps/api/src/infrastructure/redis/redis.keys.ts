export const redisKeys = {
  passwordReset: (
    tokenHash: string,
  ) =>
    `auth:password-reset:${tokenHash}`,

  emailVerification: (
    tokenHash: string,
  ) =>
    `auth:email-verification:${tokenHash}`,

  oauthState: (
    state: string,
  ) =>
    `auth:oauth-state:${state}`,

  loginAttempts: (
    identifier: string,
  ) =>
    `auth:login-attempts:${identifier}`,

  rateLimit: (
    identifier: string,
  ) =>
    `rate-limit:${identifier}`,
};
