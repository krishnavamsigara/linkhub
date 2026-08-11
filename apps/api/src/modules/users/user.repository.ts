import { prisma } from '../../infrastructure/database/index.js';

import type {
  CreateUserInput,
  UpdateUserInput,
} from './user.types.js';

export class UserRepository {
  async create(data: CreateUserInput) {
    return prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        displayName: data.displayName ?? null,
      },
    });
  }

  async findById(id: string) {
    return prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findFirst({
      where: {
        email,
        deletedAt: null,
      },
    });
  }

  async findByUsername(username: string) {
    return prisma.user.findFirst({
      where: {
        username,
        deletedAt: null,
      },
    });
  }

  async update(id: string, data: UpdateUserInput) {
    return prisma.user.update({
      where: { id },
      data: {
        ...(data.email !== undefined && { email: data.email }),
        ...(data.username !== undefined && { username: data.username }),
        ...(data.displayName !== undefined && { displayName: data.displayName }),
      },
    });
  }

  async softDelete(id: string) {
    return prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}

export const userRepository = new UserRepository();
