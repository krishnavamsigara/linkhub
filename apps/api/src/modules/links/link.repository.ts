import { prisma } from '../../infrastructure/database/prisma.js';

export class LinkRepository {
  async create(data: {
    userId: string;
    title: string;
    originalUrl: string;
    shortCode: string;
    description?: string | null | undefined;
    icon?: string | null | undefined;
    isActive?: boolean | undefined;
    expiresAt?: Date | null | undefined;
  }) {
    return prisma.link.create({
      data: {
        userId: data.userId,
        title: data.title,
        originalUrl: data.originalUrl,
        shortCode: data.shortCode,
        description: data.description ?? null,
        icon: data.icon ?? null,
        isActive: data.isActive ?? true,
        expiresAt: data.expiresAt ?? null,
      },
    });
  }

  async findById(id: string) {
    return prisma.link.findUnique({
      where: { id },
    });
  }

  async findByShortCode(shortCode: string) {
    return prisma.link.findUnique({
      where: { shortCode },
    });
  }

  async findAllByUserId(userId: string) {
    return prisma.link.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(
    id: string,
    data: {
      title?: string | undefined;
      originalUrl?: string | undefined;
      shortCode?: string | undefined;
      description?: string | null | undefined;
      icon?: string | null | undefined;
      isActive?: boolean | undefined;
      expiresAt?: Date | null | undefined;
    },
  ) {
    const updateData: {
      title?: string;
      originalUrl?: string;
      shortCode?: string;
      description?: string | null;
      icon?: string | null;
      isActive?: boolean;
      expiresAt?: Date | null;
    } = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.originalUrl !== undefined) updateData.originalUrl = data.originalUrl;
    if (data.shortCode !== undefined) updateData.shortCode = data.shortCode;
    if (data.description !== undefined) updateData.description = data.description ?? null;
    if (data.icon !== undefined) updateData.icon = data.icon ?? null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt ?? null;

    return prisma.link.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string) {
    return prisma.link.delete({
      where: { id },
    });
  }

  async incrementClicks(id: string) {
    return prisma.link.update({
      where: { id },
      data: {
        clicksCount: {
          increment: 1,
        },
      },
    });
  }

  async deleteExpiredLinks(): Promise<number> {
    const result = await prisma.link.deleteMany({
      where: {
        expiresAt: {
          not: null,
          lte: new Date(),
        },
      },
    });

    return result.count;
  }
}

export const linkRepository = new LinkRepository();
