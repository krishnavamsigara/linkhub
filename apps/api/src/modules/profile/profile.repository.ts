import { prisma } from '../../infrastructure/database/prisma.js';
import type { UpdateProfileInput } from './profile.types.js';

export class ProfileRepository {
  async findByUserId(userId: string) {
    return prisma.profile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });
  }

  async findByUsername(username: string) {
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!user) return null;
    return this.findByUserId(user.id);
  }

  async createOrUpdateProfile(userId: string, data: UpdateProfileInput) {
    const { displayName, bio, website, location } = data;

    if (displayName !== undefined && displayName !== null) {
      await prisma.user.update({
        where: { id: userId },
        data: { displayName },
      });
    }

    const websiteValue = website === '' ? null : website;

    const updateData: {
      bio?: string | null;
      website?: string | null;
      location?: string | null;
    } = {};

    if (bio !== undefined) updateData.bio = bio ?? null;
    if (website !== undefined) updateData.website = websiteValue ?? null;
    if (location !== undefined) updateData.location = location ?? null;

    return prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        bio: bio ?? null,
        website: websiteValue ?? null,
        location: location ?? null,
        avatarStatus: 'COMPLETED',
      },
      update: updateData,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });
  }

  async updateAvatarStatus(
    userId: string,
    avatarStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED',
  ) {
    return prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        avatarStatus,
      },
      update: {
        avatarStatus,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });
  }

  async removeAvatar(userId: string) {
    return prisma.profile.update({
      where: { userId },
      data: {
        avatarKey: null,
        avatarMimeType: null,
        avatarStatus: 'COMPLETED',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });
  }
}

export const profileRepository = new ProfileRepository();
