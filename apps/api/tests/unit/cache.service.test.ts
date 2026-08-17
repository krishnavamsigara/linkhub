import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cacheService } from '../../src/infrastructure/redis/cache.service.js';
import { redis } from '../../src/infrastructure/redis/redis.js';

vi.mock('../../src/infrastructure/redis/redis.js', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    keys: vi.fn(),
  },
}));

describe('CacheService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('get', () => {
    it('should return parsed JSON object on cache hit', async () => {
      const mockData = { id: 'link-1', title: 'Test Link' };
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(mockData));

      const result = await cacheService.get<typeof mockData>('cache:test:1');
      expect(result).toEqual(mockData);
      expect(redis.get).toHaveBeenCalledWith('cache:test:1');
    });

    it('should return null on cache miss', async () => {
      vi.mocked(redis.get).mockResolvedValue(null);

      const result = await cacheService.get('cache:test:missing');
      expect(result).toBeNull();
    });

    it('should gracefully return null and not throw if Redis errors', async () => {
      vi.mocked(redis.get).mockRejectedValue(new Error('Redis connection timeout'));

      const result = await cacheService.get('cache:test:error');
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should serialize value and set key with TTL', async () => {
      const mockData = { name: 'Ocean Breeze' };
      vi.mocked(redis.set).mockResolvedValue('OK');

      const success = await cacheService.set('cache:theme:1', mockData, 300);
      expect(success).toBe(true);
      expect(redis.set).toHaveBeenCalledWith(
        'cache:theme:1',
        JSON.stringify(mockData),
        'EX',
        300,
      );
    });

    it('should return false gracefully if Redis set errors', async () => {
      vi.mocked(redis.set).mockRejectedValue(new Error('OOM command not allowed'));

      const success = await cacheService.set('cache:theme:1', { a: 1 });
      expect(success).toBe(false);
    });
  });

  describe('del and delByPattern', () => {
    it('should delete specified key(s)', async () => {
      vi.mocked(redis.del).mockResolvedValue(2);

      const count = await cacheService.del(['key:1', 'key:2']);
      expect(count).toBe(2);
      expect(redis.del).toHaveBeenCalledWith('key:1', 'key:2');
    });

    it('should find matching keys and delete them in delByPattern', async () => {
      vi.mocked(redis.keys).mockResolvedValue(['cache:profile:1', 'cache:profile:2']);
      vi.mocked(redis.del).mockResolvedValue(2);

      const count = await cacheService.delByPattern('cache:profile:*');
      expect(count).toBe(2);
      expect(redis.keys).toHaveBeenCalledWith('cache:profile:*');
      expect(redis.del).toHaveBeenCalledWith('cache:profile:1', 'cache:profile:2');
    });
  });

  describe('getOrSet (Cache-Aside with stampede guard)', () => {
    it('should return cached data immediately if present without calling fetchFn', async () => {
      const cached = { role: 'admin' };
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(cached));
      const fetchFn = vi.fn();

      const result = await cacheService.getOrSet('cache:user:1', fetchFn, 60);

      expect(result).toEqual(cached);
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('should acquire lock, call fetchFn, cache result, and release lock on cache miss', async () => {
      vi.mocked(redis.get).mockResolvedValueOnce(null); // miss
      vi.mocked(redis.set).mockResolvedValue('OK'); // lock + set
      vi.mocked(redis.del).mockResolvedValue(1); // release lock

      const fetchFn = vi.fn().mockResolvedValue({ id: 'user-100', plan: 'PRO' });

      const result = await cacheService.getOrSet('cache:user:100', fetchFn, 120);

      expect(result).toEqual({ id: 'user-100', plan: 'PRO' });
      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(redis.set).toHaveBeenCalledWith(
        'cache:user:100',
        JSON.stringify({ id: 'user-100', plan: 'PRO' }),
        'EX',
        120,
      );
      expect(redis.del).toHaveBeenCalledWith('lock:cache:user:100');
    });

    it('should gracefully execute fetchFn directly if Redis throws during getOrSet', async () => {
      vi.mocked(redis.get).mockRejectedValue(new Error('Redis disconnected'));
      vi.mocked(redis.set).mockRejectedValue(new Error('Redis disconnected'));

      const fetchFn = vi.fn().mockResolvedValue({ fallback: true });

      const result = await cacheService.getOrSet('cache:any', fetchFn);
      expect(result).toEqual({ fallback: true });
      expect(fetchFn).toHaveBeenCalled();
    });
  });
});
