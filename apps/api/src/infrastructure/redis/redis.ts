import { Redis } from 'ioredis';
import pino from 'pino';

import { env } from '../../config/env.js';

// Standalone Pino logger instance
const logger = pino({
  level: env.LOG_LEVEL || 'info',
});

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy(times) {
    return Math.min(times * 100, 3000);
  },
});

// Event Listeners
redis.on('connect', () => {
  logger.info({ module: 'redis' }, 'Redis connection established');
});

redis.on('ready', () => {
  logger.info({ module: 'redis' }, 'Redis is ready');
});

redis.on('error', (error) => {
  logger.error({ module: 'redis', err: error }, 'Redis error');
});

redis.on('close', () => {
  logger.warn({ module: 'redis' }, 'Redis connection closed');
});

redis.on('reconnecting', (delay: number) => {
  logger.warn({ module: 'redis', delay }, 'Redis reconnecting');
});
