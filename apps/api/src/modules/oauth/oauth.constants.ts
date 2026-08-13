export const OAUTH_PROVIDERS = {
  GOOGLE: 'google',
  GITHUB: 'github',
} as const;

export const OAUTH_STATE_TTL_SECONDS = 600;

export const OAUTH_SCOPES = {
  GOOGLE: [
    'openid',
    'email',
    'profile',
  ],

  GITHUB: [
    'read:user',
    'user:email',
  ],
} as const;
