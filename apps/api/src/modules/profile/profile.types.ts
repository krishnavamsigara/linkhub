import type { AvatarStatus } from '../../generated/prisma/client.js';

export interface UpdateProfileInput {
  bio?: string | null | undefined;
  website?: string | null | undefined;
  location?: string | null | undefined;
  displayName?: string | null | undefined;
}

export interface ProfileResponse {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  website: string | null;
  location: string | null;
  avatarUrl: string | null;
  avatarStatus: AvatarStatus;
  createdAt: Date;
  updatedAt: Date;
}
