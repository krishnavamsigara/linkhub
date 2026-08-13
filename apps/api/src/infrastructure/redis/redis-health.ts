import { redis } from './redis.js';

export async function checkRedisHealth() {
  const startedAt = Date.now();

  try {
    const response = await redis.ping();

    return {
      status:
        response === 'PONG'
          ? 'healthy'
          : 'unhealthy',

      latencyMs:
        Date.now() - startedAt,
    };
  } catch {
    return {
      status: 'unhealthy',
      latencyMs:
        Date.now() - startedAt,
    };
  }
}
