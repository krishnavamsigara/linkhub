import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';

import {
  disconnectDatabase,
  prisma,
} from '../../infrastructure/database/index.js';

import { userRepository } from '../../modules/users/user.repository.js';

describe('UserRepository', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: {
          startsWith: 'test-',
        },
      },
    });

    await disconnectDatabase();
  });

  it('should create a user', async () => {
    const user = await userRepository.create({
      email: `test-${randomUUID()}@example.com`,
      username: `test_${randomUUID().slice(0, 8)}`,
      displayName: 'Test User',
    });

    expect(user.id).toBeDefined();
    expect(user.email).toContain('test-');
    expect(user.displayName).toBe('Test User');
  });

  it('should find an active user by id', async () => {
    const created = await userRepository.create({
      email: `test-${randomUUID()}@example.com`,
      username: `test_${randomUUID().slice(0, 8)}`,
    });

    const found = await userRepository.findById(created.id);

    expect(found).not.toBeNull();
    expect(found?.id).toBe(created.id);
  });

  it('should not return a soft-deleted user', async () => {
    const created = await userRepository.create({
      email: `test-${randomUUID()}@example.com`,
      username: `test_${randomUUID().slice(0, 8)}`,
    });

    await userRepository.softDelete(created.id);

    const found = await userRepository.findById(created.id);

    expect(found).toBeNull();
  });
});
