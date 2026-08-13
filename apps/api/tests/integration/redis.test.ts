import {
  describe,
  expect,
  it,
} from 'vitest';

import { redis } from '../../src/infrastructure/redis/index.js';

describe('Redis', () => {
  it('should connect to Redis', async () => {
    if (redis.status === 'wait') {
      await redis.connect();
    }

    const response =
      await redis.ping();

    expect(response).toBe('PONG');
  });

  it('should set and get a value', async () => {
    const key =
      'test:linkhub:redis';

    await redis.set(
      key,
      'hello',
      'EX',
      30,
    );

    const value =
      await redis.get(key);

    expect(value).toBe('hello');

    await redis.del(key);
  });
});
