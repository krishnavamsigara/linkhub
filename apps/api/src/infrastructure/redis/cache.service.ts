import pino from 'pino';
import { redis } from './redis.js';
import { CACHE_TTL, redisKeys } from './redis.keys.js';
import { env } from '../../config/env.js';

const logger = pino({
  level: env.LOG_LEVEL || 'info',
});

export class CacheService {
  /**
   * Get an item from Redis cache and parse it as JSON.
   * Returns null on cache miss or Redis error (fail-safe).
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (err) {
      logger.warn({ module: 'cache', err, key }, 'Cache get error (falling back to source)');
      return null;
    }
  }

  /**
   * Store an item in Redis cache with an optional TTL in seconds.
   * Fails silently (returns false) if Redis is down.
   */
  async set<T>(key: string, value: T, ttlSeconds: number = CACHE_TTL.PUBLIC_PROFILE): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds > 0) {
        await redis.set(key, serialized, 'EX', ttlSeconds);
      } else {
        await redis.set(key, serialized);
      }
      return true;
    } catch (err) {
      logger.warn({ module: 'cache', err, key }, 'Cache set error');
      return false;
    }
  }

  /**
   * Delete one or more keys from Redis cache.
   */
  async del(keys: string | string[]): Promise<number> {
    try {
      const keyList = Array.isArray(keys) ? keys : [keys];
      if (keyList.length === 0) return 0;
      return await redis.del(...keyList);
    } catch (err) {
      logger.warn({ module: 'cache', err, keys }, 'Cache del error');
      return 0;
    }
  }

  /**
   * Invalidate all keys matching a wildcard pattern (e.g. `cache:profile:public:*`).
   */
  async delByPattern(pattern: string): Promise<number> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length === 0) return 0;
      return await redis.del(...keys);
    } catch (err) {
      logger.warn({ module: 'cache', err, pattern }, 'Cache delByPattern error');
      return 0;
    }
  }

  /**
   * Cache-Aside Read-Through with Stampede Protection:
   * 1. Check cache first.
   * 2. On miss, acquire a lightweight mutex lock so only 1 worker hits the DB.
   * 3. Fetch data, store in cache with TTL, release lock, and return data.
   * 4. If Redis fails, gracefully executes fetchFn directly without throwing.
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds: number = CACHE_TTL.PUBLIC_PROFILE,
  ): Promise<T> {
    // 1. Try Cache Read
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const lockKey = redisKeys.lockKey(key);
    let lockAcquired = false;

    try {
      // 2. Acquire Mutex Lock (NX = Only if Not Exists, EX = 5s timeout)
      const lockRes = await redis.set(lockKey, '1', 'EX', CACHE_TTL.LOCK_TIMEOUT, 'NX');
      lockAcquired = lockRes === 'OK';
    } catch {
      // Redis offline/error: proceed directly to fetchFn
    }

    if (!lockAcquired) {
      // Another worker is fetching; wait briefly and check cache again
      await new Promise((resolve) => setTimeout(resolve, 50));
      const retryCached = await this.get<T>(key);
      if (retryCached !== null) {
        return retryCached;
      }
    }

    // 3. Cache Miss / Lock Holder: Fetch from primary data source (PostgreSQL)
    try {
      const freshData = await fetchFn();
      if (freshData !== null && freshData !== undefined) {
        await this.set(key, freshData, ttlSeconds);
      }
      return freshData;
    } finally {
      if (lockAcquired) {
        try {
          await redis.del(lockKey);
        } catch {
          // Ignore release errors
        }
      }
    }
  }
}

export const cacheService = new CacheService();
