export interface CreateLinkInput {
  title: string;
  originalUrl: string;
  shortCode?: string | null | undefined;
  description?: string | null | undefined;
  icon?: string | null | undefined;
  isActive?: boolean | undefined;
  expiresAt?: string | null | undefined;
  expiresInDays?: number | null | undefined;
  expiresInHours?: number | null | undefined;
}

export interface UpdateLinkInput {
  title?: string | undefined;
  originalUrl?: string | undefined;
  shortCode?: string | null | undefined;
  description?: string | null | undefined;
  icon?: string | null | undefined;
  isActive?: boolean | undefined;
  expiresAt?: string | null | undefined;
  expiresInDays?: number | null | undefined;
  expiresInHours?: number | null | undefined;
}

export interface LinkResponse {
  id: string;
  userId: string;
  title: string;
  originalUrl: string;
  shortCode: string;
  shortUrl: string;
  description: string | null;
  icon: string | null;
  isActive: boolean;
  isExpired: boolean;
  clicksCount: number;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
