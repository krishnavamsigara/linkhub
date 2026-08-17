export const CACHE_TTL = {
  SHORTCODE_REDIRECT: 60 * 60 * 24, // 24 hours
  PUBLIC_PROFILE: 60 * 15,          // 15 minutes
  THEMES_ALL: 60 * 60 * 24,         // 24 hours
  USER_SUBSCRIPTION: 60 * 60,       // 1 hour
  USER_PERMISSIONS: 60 * 30,        // 30 minutes
  LOCK_TIMEOUT: 5,                  // 5 seconds mutex lock
} as const;

export const redisKeys = {
  // ─── Auth & Security ───────────────────────────────────────────────────────
  passwordReset: (tokenHash: string) => `auth:password-reset:${tokenHash}`,
  emailVerification: (tokenHash: string) => `auth:email-verification:${tokenHash}`,
  oauthState: (state: string) => `auth:oauth-state:${state}`,
  loginAttempts: (identifier: string) => `auth:login-attempts:${identifier}`,
  rateLimit: (identifier: string) => `rate-limit:${identifier}`,

  // ─── Database Hot Path Caches ──────────────────────────────────────────────
  /** Fast lookup for shortcode redirect hot-path */
  linkShortCode: (shortCode: string) => `cache:link:shortcode:${shortCode.toLowerCase()}`,

  /** Public profile view for creator trees */
  publicProfile: (username: string) => `cache:profile:public:${username.toLowerCase()}`,

  /** Static themes catalog */
  themesAll: () => 'cache:themes:all',

  /** User subscription plan & limits */
  userSubscription: (userId: string) => `cache:user:subscription:${userId}`,

  /** User effective permissions */
  userPermissions: (userId: string) => `cache:user:permissions:${userId}`,

  // ─── Mutex Locks (Stampede Protection) ─────────────────────────────────────
  lockKey: (resource: string) => `lock:${resource}`,
};
