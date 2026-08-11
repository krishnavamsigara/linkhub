import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import { env } from '../config/index.js';
import { AppError } from '../shared/errors/app-error.js';

export const errorMiddleware: ErrorRequestHandler = (
  error,
  req,
  res,
  _next,
) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.issues,
        requestId: req.requestId,
      },
    });

    return;
  }

  const isAppError = error instanceof AppError;

  const statusCode = isAppError
    ? error.statusCode
    : 500;

  const code = isAppError
    ? error.code
    : 'INTERNAL_SERVER_ERROR';

  const message =
    isAppError || env.NODE_ENV !== 'production'
      ? error.message
      : 'Internal server error';

  req.log?.error(
    {
      err: error,
      requestId: req.requestId,
    },
    'Request failed',
  );

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      requestId: req.requestId,
    },
  });
};
