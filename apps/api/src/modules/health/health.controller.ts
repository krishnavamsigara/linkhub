import type { RequestHandler } from 'express';
import { env } from '../../config/index.js';

export const healthController: RequestHandler = (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      service: env.APP_NAME,
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    },
  });
};
