import type { Response } from 'express';

const COOKIE_NAME =
  'linkhub_refresh_token';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:
    process.env.NODE_ENV ===
    'production',
  sameSite: 'lax' as const,
  path: '/api/v1/auth',
  maxAge:
    7 * 24 * 60 * 60 * 1000,
};

export function setRefreshCookie(
  res: Response,
  token: string,
) {
  res.cookie(
    COOKIE_NAME,
    token,
    COOKIE_OPTIONS,
  );
}

export function clearRefreshCookie(
  res: Response,
) {
  res.clearCookie(
    COOKIE_NAME,
    COOKIE_OPTIONS,
  );
}

export function getRefreshCookieName() {
  return COOKIE_NAME;
}
