import { AppError } from '../../shared/errors/app-error.js';
import { getStorageProvider } from '../../infrastructure/storage/index.js';
import { avatarQueue } from '../../infrastructure/queue/index.js';
import { userRepository } from '../users/user.repository.js';
import { profileRepository } from './profile.repository.js';
import type { ProfileResponse, UpdateProfileInput } from './profile.types.js';

export class ProfileService {
  async getProfileByUserId(userId: string): Promise<ProfileResponse> {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    let profile = await profileRepository.findByUserId(userId);

    if (!profile) {
      profile = await profileRepository.createOrUpdateProfile(userId, {});
    }

    return this.toResponse(profile, user);
  }

  async getProfileByUsername(username: string): Promise<ProfileResponse> {
    const user = await userRepository.findByUsername(username);

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    let profile = await profileRepository.findByUserId(user.id);

    if (!profile) {
      profile = await profileRepository.createOrUpdateProfile(user.id, {});
    }

    return this.toResponse(profile, user);
  }

  async updateProfile(
    userId: string,
    data: UpdateProfileInput,
  ): Promise<ProfileResponse> {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const updatedProfile = await profileRepository.createOrUpdateProfile(
      userId,
      data,
    );

    const updatedUser = await userRepository.findById(userId);

    return this.toResponse(updatedProfile, updatedUser || user);
  }

  async uploadAvatar(
    userId: string,
    file?: Express.Multer.File,
  ): Promise<{ message: string; avatarStatus: string }> {
    if (!file) {
      throw new AppError('No image file provided', 400, 'AVATAR_MISSING_FILE');
    }

    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new AppError(
        'Invalid image format. Allowed formats: JPEG, PNG, WEBP, GIF',
        400,
        'AVATAR_INVALID_FORMAT',
      );
    }

    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new AppError(
        'Image file size exceeds limit of 5MB',
        400,
        'AVATAR_FILE_TOO_LARGE',
      );
    }

    await profileRepository.updateAvatarStatus(userId, 'PROCESSING');

    await avatarQueue.add('process-avatar', {
      userId,
      fileBufferBase64: file.buffer.toString('base64'),
      filename: file.originalname,
      mimeType: file.mimetype,
    });

    return {
      message: 'Avatar upload accepted and is being processed in background',
      avatarStatus: 'PROCESSING',
    };
  }

  async deleteAvatar(userId: string): Promise<ProfileResponse> {
    const profile = await profileRepository.findByUserId(userId);

    if (profile?.avatarKey) {
      try {
        const storage = getStorageProvider();
        await storage.delete(profile.avatarKey);
      } catch (err) {
        // Ignored
      }
    }

    const updatedProfile = await profileRepository.removeAvatar(userId);
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    return this.toResponse(updatedProfile, user);
  }

  async getAvatarStream(userId: string) {
    const profile = await profileRepository.findByUserId(userId);

    if (!profile || !profile.avatarKey) {
      throw new AppError('Avatar not found', 404, 'AVATAR_NOT_FOUND');
    }

    const storage = getStorageProvider();
    return storage.getStream(profile.avatarKey);
  }

  private toResponse(
    profile: {
      id: string;
      userId: string;
      bio: string | null;
      website: string | null;
      location: string | null;
      avatarKey: string | null;
      avatarStatus: string;
      createdAt: Date;
      updatedAt: Date;
    },
    user: {
      id: string;
      username: string;
      displayName: string | null;
    },
  ): ProfileResponse {
    const avatarUrl = profile.avatarKey
      ? `/api/v1/profile/${user.id}/avatar`
      : null;

    return {
      id: profile.id,
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      bio: profile.bio,
      website: profile.website,
      location: profile.location,
      avatarUrl,
      avatarStatus: profile.avatarStatus as ProfileResponse['avatarStatus'],
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }
}

export const profileService = new ProfileService();
