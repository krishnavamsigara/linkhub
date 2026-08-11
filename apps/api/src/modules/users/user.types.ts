import type { User } from '../../generated/prisma/client.js';
import type { CreateUserInput, UpdateUserInput } from './user.schema.js';

// Re-export Zod inferred types to stay synchronized with validation rules
export type { CreateUserInput, UpdateUserInput };

export type UserEntity = User;

export type UserResponse = {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  createdAt: Date;
  updatedAt: Date;
};
