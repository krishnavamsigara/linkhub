import type { ErrorRequestHandler } from 'express';
import { env } from '../config/index.js';
import { AppError } from '../shared/errors/app-error.js';

export const errorMiddleware: ErrorRequestHandler = (error, req, res, _next) => {
  const isAppError = error instanceof AppError;

  const statusCode = isAppError ? error.statusCode : 500;

  const code = isAppError ? error.code : 'INTERNAL_SERVER_ERROR';

  const message =
    isAppError || env.NODE_ENV !== 'production' ? error.message : 'Internal server error';

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
