import { prisma } from '../../infrastructure/database/prisma.js';
import type { UpdateProfileInput } from './profile.types.js';

// ─── Raw row type returned from DB ───────────────────────────────────────────

interface ProfileRow {
  id: string;
  user_id: string;
  theme_id: string | null;
  bio: string | null;
  website: string | null;
  location: string | null;
  avatar_key: string | null;
  avatar_mime_type: string | null;
  avatar_status: string;
  created_at: Date;
  updated_at: Date;
}

function mapProfile(row: ProfileRow, user: { id: string; username: string; displayName: string | null }) {
  return {
    id: row.id,
    userId: row.user_id,
    themeId: row.theme_id,
    bio: row.bio,
    website: row.website,
    location: row.location,
    avatarKey: row.avatar_key,
    avatarMimeType: row.avatar_mime_type,
    avatarStatus: row.avatar_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    user,
  };
}

export class ProfileRepository {
  async findByUserId(userId: string) {
    const profileRows = await prisma.$queryRaw<ProfileRow[]>`
      SELECT * FROM profiles WHERE user_id = ${userId}::uuid LIMIT 1
    `;

    if (profileRows.length === 0) return null;

    const user = await prisma.user.findFirst({
      where: { id: userId },
      select: { id: true, username: true, displayName: true },
    });

    if (!user) return null;

    return mapProfile(profileRows[0]!, user);
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
    const { displayName, bio, website, location, themeId } = data;

    if (displayName !== undefined && displayName !== null) {
      await prisma.user.update({
        where: { id: userId },
        data: { displayName },
      });
    }

    const websiteValue = website === '' ? null : (website ?? null);
    const now = new Date();

    // Build the upsert SQL dynamically (raw SQL to handle themeId which isn't in generated Prisma types)
    await prisma.$executeRaw`
      INSERT INTO profiles (user_id, bio, website, location, theme_id, avatar_status, updated_at)
      VALUES (
        ${userId}::uuid,
        ${bio ?? null},
        ${websiteValue},
        ${location ?? null},
        ${themeId !== undefined ? (themeId ?? null) : null}::uuid,
        'COMPLETED',
        ${now}
      )
      ON CONFLICT (user_id) DO UPDATE SET
        bio = CASE WHEN ${bio !== undefined} THEN ${bio ?? null} ELSE profiles.bio END,
        website = CASE WHEN ${website !== undefined} THEN ${websiteValue} ELSE profiles.website END,
        location = CASE WHEN ${location !== undefined} THEN ${location ?? null} ELSE profiles.location END,
        theme_id = CASE WHEN ${themeId !== undefined} THEN ${themeId !== undefined ? (themeId ?? null) : null}::uuid ELSE profiles.theme_id END,
        updated_at = ${now}
    `;

    const profileRows = await prisma.$queryRaw<ProfileRow[]>`
      SELECT * FROM profiles WHERE user_id = ${userId}::uuid LIMIT 1
    `;

    const user = await prisma.user.findFirst({
      where: { id: userId },
      select: { id: true, username: true, displayName: true },
    });

    return mapProfile(profileRows[0]!, user!);
  }

  async updateAvatarStatus(
    userId: string,
    avatarStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED',
  ) {
    const now = new Date();

    await prisma.$executeRaw`
      INSERT INTO profiles (user_id, avatar_status, updated_at)
      VALUES (${userId}::uuid, ${avatarStatus}::"AvatarStatus", ${now})
      ON CONFLICT (user_id) DO UPDATE SET
        avatar_status = ${avatarStatus}::"AvatarStatus",
        updated_at = ${now}
    `;

    const profileRows = await prisma.$queryRaw<ProfileRow[]>`
      SELECT * FROM profiles WHERE user_id = ${userId}::uuid LIMIT 1
    `;

    const user = await prisma.user.findFirst({
      where: { id: userId },
      select: { id: true, username: true, displayName: true },
    });

    return mapProfile(profileRows[0]!, user!);
  }

  async removeAvatar(userId: string) {
    const now = new Date();

    await prisma.$executeRaw`
      UPDATE profiles SET
        avatar_key = NULL,
        avatar_mime_type = NULL,
        avatar_status = 'COMPLETED'::"AvatarStatus",
        updated_at = ${now}
      WHERE user_id = ${userId}::uuid
    `;

    const profileRows = await prisma.$queryRaw<ProfileRow[]>`
      SELECT * FROM profiles WHERE user_id = ${userId}::uuid LIMIT 1
    `;

    const user = await prisma.user.findFirst({
      where: { id: userId },
      select: { id: true, username: true, displayName: true },
    });

    return mapProfile(profileRows[0]!, user!);
  }
}

export const profileRepository = new ProfileRepository();
