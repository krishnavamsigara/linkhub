import { describe, it, expect, vi, beforeEach } from 'vitest';
import { profileService } from '../../src/modules/profile/profile.service.js';
import { userRepository } from '../../src/modules/users/user.repository.js';
import { profileRepository } from '../../src/modules/profile/profile.repository.js';
import { AppError } from '../../src/shared/errors/app-error.js';

vi.mock('../../src/modules/users/user.repository.js');
vi.mock('../../src/modules/profile/profile.repository.js');
vi.mock('../../src/infrastructure/storage/index.js');
vi.mock('../../src/infrastructure/queue/index.js', () => ({
  avatarQueue: {
    add: vi.fn().mockResolvedValue({ id: 'job-1' }),
  },
}));

describe('ProfileService', () => {
  const mockUserId = '11111111-1111-1111-1111-111111111111';
  const mockUser = {
    id: mockUserId,
    username: 'testuser',
    email: 'test@example.com',
    displayName: 'Test User',
    role: 'USER' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockProfile = {
    id: '22222222-2222-2222-2222-222222222222',
    userId: mockUserId,
    bio: 'Software engineer and developer',
    website: 'https://example.com',
    location: 'San Francisco, CA',
    avatarKey: 'avatars/testuser-123.png',
    avatarMimeType: 'image/png',
    avatarStatus: 'COMPLETED' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: mockUserId,
      username: 'testuser',
      displayName: 'Test User',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProfileByUserId', () => {
    it('should return profile response when user exists', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(profileRepository.findByUserId).mockResolvedValue(mockProfile);

      const result = await profileService.getProfileByUserId(mockUserId);

      expect(result).toBeDefined();
      expect(result.userId).toBe(mockUserId);
      expect(result.bio).toBe('Software engineer and developer');
      expect(result.avatarUrl).toBe(`/api/v1/profile/${mockUserId}/avatar`);
    });

    it('should throw AppError 404 when user is not found', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(null);

      await expect(profileService.getProfileByUserId('invalid-id')).rejects.toThrow(
        AppError,
      );
    });
  });

  describe('updateProfile', () => {
    it('should update bio and location successfully', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(profileRepository.createOrUpdateProfile).mockResolvedValue({
        ...mockProfile,
        bio: 'Updated bio',
        location: 'New York, NY',
      });

      const result = await profileService.updateProfile(mockUserId, {
        bio: 'Updated bio',
        location: 'New York, NY',
      });

      expect(result.bio).toBe('Updated bio');
      expect(result.location).toBe('New York, NY');
    });
  });
});
