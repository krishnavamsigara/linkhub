import { createServer } from 'node:http';
import { promisify } from 'node:util';
import pino from 'pino';

import { createApp } from './app.js';
import { env } from './config/index.js';
import {
  connectDatabase,
  disconnectDatabase,
} from './infrastructure/database/prisma.js';
import { redis } from './infrastructure/redis/index.js';
import { initializeLinkCronJob } from './infrastructure/queue/index.js';

const logger = pino({ level: env.LOG_LEVEL || 'info' });

const app = createApp();
const server = createServer(app);

const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Shutdown started');

  try {
    // 1. Stop receiving new HTTP requests
    await promisify(server.close.bind(server))();
    logger.info('HTTP server closed');

    // 2. Disconnect Redis
    await redis.quit();
    logger.info('Redis connection closed');

    // 3. Disconnect PostgreSQL/Prisma
    await disconnectDatabase();
    logger.info('Database connection closed');

    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, 'Error during graceful shutdown');
    process.exit(1);
  }
};

const startServer = async () => {
  try {
    await connectDatabase();
    logger.info('PostgreSQL connected');

    // Connect Redis (required if lazyConnect: true was set in Redis options)
    await redis.connect();

    // Initialize repeatable link cleanup cron job
    await initializeLinkCronJob();

    server.listen(env.PORT, () => {
      logger.info(
        {
          appName: env.APP_NAME,
          port: env.PORT,
          environment: env.NODE_ENV,
        },
        `${env.APP_NAME} running on http://localhost:${env.PORT}`,
      );
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to start application');

    await disconnectDatabase();
    process.exit(1);
  }
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

void startServer();
