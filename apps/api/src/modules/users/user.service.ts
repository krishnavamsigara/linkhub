import { AppError } from '../../shared/errors/app-error.js';

import { userRepository } from './user.repository.js';

import type {
  CreateUserInput,
  UpdateUserInput,
  UserResponse,
} from './user.types.js';

export class UserService {
  async createUser(data: CreateUserInput): Promise<UserResponse> {
    const existingEmail = await userRepository.findByEmail(data.email);

    if (existingEmail) {
      throw new AppError(
        'Email is already registered',
        409,
        'USER_EMAIL_ALREADY_EXISTS',
      );
    }

    const existingUsername =
      await userRepository.findByUsername(data.username);

    if (existingUsername) {
      throw new AppError(
        'Username is already taken',
        409,
        'USER_USERNAME_ALREADY_EXISTS',
      );
    }

    const user = await userRepository.create(data);

    return this.toResponse(user);
  }

  async getUserById(id: string): Promise<UserResponse> {
    const user = await userRepository.findById(id);

    if (!user) {
      throw new AppError(
        'User not found',
        404,
        'USER_NOT_FOUND',
      );
    }

    return this.toResponse(user);
  }

  async updateUser(
    id: string,
    data: UpdateUserInput,
  ): Promise<UserResponse> {
    const existingUser = await userRepository.findById(id);

    if (!existingUser) {
      throw new AppError(
        'User not found',
        404,
        'USER_NOT_FOUND',
      );
    }

    if (data.email && data.email !== existingUser.email) {
      const existingEmail =
        await userRepository.findByEmail(data.email);

      if (existingEmail) {
        throw new AppError(
          'Email is already registered',
          409,
          'USER_EMAIL_ALREADY_EXISTS',
        );
      }
    }

    if (
      data.username &&
      data.username !== existingUser.username
    ) {
      const existingUsername =
        await userRepository.findByUsername(data.username);

      if (existingUsername) {
        throw new AppError(
          'Username is already taken',
          409,
          'USER_USERNAME_ALREADY_EXISTS',
        );
      }
    }

    const user = await userRepository.update(id, data);

    return this.toResponse(user);
  }

  async deleteUser(id: string): Promise<void> {
    const existingUser = await userRepository.findById(id);

    if (!existingUser) {
      throw new AppError(
        'User not found',
        404,
        'USER_NOT_FOUND',
      );
    }

    await userRepository.softDelete(id);
  }

  private toResponse(user: {
    id: string;
    email: string;
    username: string;
    displayName: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): UserResponse {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

export const userService = new UserService();
