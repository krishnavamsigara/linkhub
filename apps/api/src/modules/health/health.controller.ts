import type { RequestHandler } from 'express';

import { env } from '../../config/index.js';
import { checkDatabaseHealth } from '../../infrastructure/database/database-health.js';

export const healthController: RequestHandler = async (_req, res, next) => {
  try {
    const databaseHealthy = await checkDatabaseHealth();

    const status = databaseHealthy ? 'ok' : 'degraded';

    res.status(databaseHealthy ? 200 : 503).json({
      success: databaseHealthy,
      data: {
        status,
        service: env.APP_NAME,
        environment: env.NODE_ENV,
        timestamp: new Date().toISOString(),
        dependencies: {
          database: databaseHealthy ? 'up' : 'down',
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
