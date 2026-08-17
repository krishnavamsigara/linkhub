import { AppError } from '../../shared/errors/app-error.js';
import { getStorageProvider } from '../../infrastructure/storage/index.js';
import { avatarQueue } from '../../infrastructure/queue/index.js';
import { cacheService, redisKeys, CACHE_TTL } from '../../infrastructure/redis/index.js';
import { userRepository } from '../users/user.repository.js';
import { themeService } from '../themes/theme.service.js';
import { profileRepository } from './profile.repository.js';
import type { ProfileResponse, UpdateProfileInput } from './profile.types.js';

type RepoProfile = {
  id: string;
  userId: string;
  themeId: string | null;
  bio: string | null;
  website: string | null;
  location: string | null;
  avatarKey: string | null;
  avatarStatus: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    username: string;
    displayName: string | null;
  };
};

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

    return this.toResponse(profile);
  }

  async getProfileByUsername(username: string): Promise<ProfileResponse> {
    const cacheKey = redisKeys.publicProfile(username);

    return cacheService.getOrSet<ProfileResponse>(
      cacheKey,
      async () => {
        const user = await userRepository.findByUsername(username);

        if (!user) {
          throw new AppError('User not found', 404, 'USER_NOT_FOUND');
        }

        let profile = await profileRepository.findByUserId(user.id);

        if (!profile) {
          profile = await profileRepository.createOrUpdateProfile(user.id, {});
        }

        return this.toResponse(profile);
      },
      CACHE_TTL.PUBLIC_PROFILE,
    );
  }

  async updateProfile(
    userId: string,
    data: UpdateProfileInput,
  ): Promise<ProfileResponse> {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // ─── PRO Theme Guard ────────────────────────────────────────────────────
    if (data.themeId) {
      await themeService.assertCanUseTheme(userId, data.themeId);
    }

    const updatedProfile = await profileRepository.createOrUpdateProfile(
      userId,
      data,
    );

    // Invalidate public profile cache
    await cacheService.del(redisKeys.publicProfile(user.username));

    return this.toResponse(updatedProfile);
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
      } catch (_err) {
        // Ignored
      }
    }

    const updatedProfile = await profileRepository.removeAvatar(userId);

    if (!updatedProfile.user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Invalidate public profile cache
    await cacheService.del(redisKeys.publicProfile(updatedProfile.user.username));

    return this.toResponse(updatedProfile);
  }

  async getAvatarStream(userId: string) {
    const profile = await profileRepository.findByUserId(userId);

    if (!profile || !profile.avatarKey) {
      throw new AppError('Avatar not found', 404, 'AVATAR_NOT_FOUND');
    }

    const storage = getStorageProvider();
    return storage.getStream(profile.avatarKey);
  }

  private toResponse(profile: RepoProfile): ProfileResponse {
    const avatarUrl = profile.avatarKey
      ? `/api/v1/profile/${profile.user.id}/avatar`
      : null;

    return {
      id: profile.id,
      userId: profile.user.id,
      username: profile.user.username,
      displayName: profile.user.displayName,
      bio: profile.bio,
      website: profile.website,
      location: profile.location,
      themeId: profile.themeId,
      avatarUrl,
      avatarStatus: profile.avatarStatus as ProfileResponse['avatarStatus'],
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }
}

export const profileService = new ProfileService();
