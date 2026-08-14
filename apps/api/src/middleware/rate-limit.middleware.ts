import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';

import { redis } from '../infrastructure/redis/index.js';

const getRedisStore = (prefix: string): RedisStore | undefined => {
  try {
    return new RedisStore({
      sendCommand: async (...args: string[]) => {
        return (await redis.call(args[0]!, ...args.slice(1))) as any;
      },
      prefix: `linkhub:rl:${prefix}:`,
    });
  } catch {
    return undefined;
  }
};

const redisGlobalStore = getRedisStore('global');
const redisAuthStore = getRedisStore('auth');
const redisRedirectStore = getRedisStore('redirect');

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Max 100 requests per 15 min
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  ...(redisGlobalStore ? { store: redisGlobalStore } : {}),
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message:
        'Too many requests from this IP address. Please try again after 15 minutes.',
    },
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // Max 10 attempts per 15 min to prevent brute force
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  ...(redisAuthStore ? { store: redisAuthStore } : {}),
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_AUTH_ATTEMPTS',
      message:
        'Too many authentication attempts from this IP address. Please try again after 15 minutes.',
    },
  },
});

export const redirectRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 60, // Max 60 redirects per minute to prevent bot scraping / DoS
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  ...(redisRedirectStore ? { store: redisRedirectStore } : {}),
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REDIRECTS',
      message: 'Too many redirect requests. Please try again shortly.',
    },
  },
});
