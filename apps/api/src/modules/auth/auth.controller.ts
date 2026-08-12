import type { Request, RequestHandler } from 'express';

import {
  loginSchema,
  registerSchema,
} from './auth.schema.js';
import { authService } from './auth.service.js';
import {
  clearRefreshCookie,
  getRefreshCookieName,
  setRefreshCookie,
} from './auth.cookies.js';

/**
 * Extracts request metadata while stripping out undefined fields
 * to comply with exactOptionalPropertyTypes.
 */
function getAuthContext(req: Request) {
  const userAgent = req.get('user-agent');
  const ipAddress = req.ip;

  return {
    ...(userAgent && { userAgent }),
    ...(ipAddress && { ipAddress }),
  };
}

export const registerController: RequestHandler = async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);

    const result = await authService.register(input, getAuthContext(req));

    setRefreshCookie(res, result.refreshToken);

    res.status(201).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const loginController: RequestHandler = async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);

    const result = await authService.login(input, getAuthContext(req));

    setRefreshCookie(res, result.refreshToken);

    res.status(200).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refreshController: RequestHandler = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.[getRefreshCookieName()];

    if (!refreshToken) {
      res.status(401).json({
        success: false,
        error: {
          code: 'REFRESH_TOKEN_MISSING',
          message: 'Refresh token is missing',
        },
      });

      return;
    }

    const result = await authService.refresh(refreshToken, getAuthContext(req));

    setRefreshCookie(res, result.refreshToken);

    res.status(200).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logoutController: RequestHandler = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.[getRefreshCookieName()];

    if (refreshToken) {
      try {
        const payload = await import(
          '../../infrastructure/security/jwt.js'
        ).then((module) => module.verifyRefreshToken(refreshToken));

        await authService.logout(payload.sid);
      } catch {
        // Logout remains idempotent.
      }
    }

    clearRefreshCookie(res);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const logoutAllController: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required',
        },
      });

      return;
    }

    await authService.logoutAll(req.user.id);

    clearRefreshCookie(res);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const meController: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required',
        },
      });

      return;
    }

    const user = await authService.getCurrentUser(req.user.id);

    res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};
