import type { Request, Response } from 'express';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/app-error.js';
import { setRefreshCookie } from '../auth/auth.cookies.js';
import { oauthService } from './oauth.service.js';
import { oauthCallbackSchema } from './oauth.schema.js';

export async function googleLoginController(req: Request, res: Response) {
  const url = await oauthService.start('google');
  res.redirect(url);
}

export async function googleCallbackController(
  req: Request,
  res: Response,
) {
  const { code, state, error, error_description } = oauthCallbackSchema.parse(
    req.query,
  );

  if (error) {
    const errorUrl = new URL('/auth/oauth-error', env.FRONTEND_URL);
    errorUrl.searchParams.set('error', error);
    if (error_description) {
      errorUrl.searchParams.set('error_description', error_description);
    }
    return res.redirect(errorUrl.toString());
  }

  if (!code || !state) {
    throw new AppError(
      'Missing authorization code or state parameter',
      400,
      'INVALID_CALLBACK_QUERY',
    );
  }

  const { user, tokens, isNewUser } = await oauthService.handleCallback(
    'google',
    code,
    state,
    {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    },
  );

  setRefreshCookie(res, tokens.refreshToken);

  const redirectUrl = new URL('/auth/oauth-success', env.FRONTEND_URL);
  redirectUrl.searchParams.set('accessToken', tokens.accessToken);
  redirectUrl.searchParams.set('email', user.email);
  redirectUrl.searchParams.set('isNewUser', String(isNewUser));

  return res.redirect(redirectUrl.toString());
}

export async function githubLoginController(req: Request, res: Response) {
  const url = await oauthService.start('github');
  res.redirect(url);
}

export async function githubCallbackController(
  req: Request,
  res: Response,
) {
  const { code, state, error, error_description } = oauthCallbackSchema.parse(
    req.query,
  );

  if (error) {
    const errorUrl = new URL('/auth/oauth-error', env.FRONTEND_URL);
    errorUrl.searchParams.set('error', error);
    if (error_description) {
      errorUrl.searchParams.set('error_description', error_description);
    }
    return res.redirect(errorUrl.toString());
  }

  if (!code || !state) {
    throw new AppError(
      'Missing authorization code or state parameter',
      400,
      'INVALID_CALLBACK_QUERY',
    );
  }

  const { user, tokens, isNewUser } = await oauthService.handleCallback(
    'github',
    code,
    state,
    {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    },
  );

  setRefreshCookie(res, tokens.refreshToken);

  const redirectUrl = new URL('/auth/oauth-success', env.FRONTEND_URL);
  redirectUrl.searchParams.set('accessToken', tokens.accessToken);
  redirectUrl.searchParams.set('email', user.email);
  redirectUrl.searchParams.set('isNewUser', String(isNewUser));

  return res.redirect(redirectUrl.toString());
}
