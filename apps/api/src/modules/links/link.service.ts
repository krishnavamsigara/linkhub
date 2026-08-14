import crypto from 'node:crypto';

import { env } from '../../config/index.js';
import { AppError } from '../../shared/errors/app-error.js';
import { linkRepository } from './link.repository.js';
import type {
  CreateLinkInput,
  LinkResponse,
  UpdateLinkInput,
} from './link.types.js';

export class LinkService {
  async createLink(
    userId: string,
    input: CreateLinkInput,
  ): Promise<LinkResponse> {
    let shortCode = input.shortCode?.trim();

    if (shortCode) {
      const existing = await linkRepository.findByShortCode(shortCode);
      if (existing) {
        throw new AppError(
          'Shortcode is already taken',
          409,
          'LINK_SHORTCODE_ALREADY_EXISTS',
        );
      }
    } else {
      shortCode = await this.generateUniqueShortCode();
    }

    const expiresAt = this.calculateExpiresAt({
      expiresAt: input.expiresAt,
      expiresInDays: input.expiresInDays,
      expiresInHours: input.expiresInHours,
    });

    const link = await linkRepository.create({
      userId,
      title: input.title,
      originalUrl: input.originalUrl,
      shortCode,
      description: input.description,
      icon: input.icon,
      isActive: input.isActive ?? true,
      expiresAt,
    });

    return this.toResponse(link);
  }

  async getLinksByUser(userId: string): Promise<LinkResponse[]> {
    const links = await linkRepository.findAllByUserId(userId);
    return links.map((link) => this.toResponse(link));
  }

  async getLinkById(userId: string, linkId: string): Promise<LinkResponse> {
    const link = await linkRepository.findById(linkId);

    if (!link) {
      throw new AppError('Link not found', 404, 'LINK_NOT_FOUND');
    }

    if (link.userId !== userId) {
      throw new AppError('Forbidden', 403, 'FORBIDDEN');
    }

    return this.toResponse(link);
  }

  async updateLink(
    userId: string,
    linkId: string,
    input: UpdateLinkInput,
  ): Promise<LinkResponse> {
    const existing = await linkRepository.findById(linkId);

    if (!existing) {
      throw new AppError('Link not found', 404, 'LINK_NOT_FOUND');
    }

    if (existing.userId !== userId) {
      throw new AppError('Forbidden', 403, 'FORBIDDEN');
    }

    if (input.shortCode && input.shortCode !== existing.shortCode) {
      const duplicate = await linkRepository.findByShortCode(input.shortCode);
      if (duplicate) {
        throw new AppError(
          'Shortcode is already taken',
          409,
          'LINK_SHORTCODE_ALREADY_EXISTS',
        );
      }
    }

    let expiresAt: Date | null | undefined = undefined;
    if (
      input.expiresAt !== undefined ||
      input.expiresInDays !== undefined ||
      input.expiresInHours !== undefined
    ) {
      expiresAt = this.calculateExpiresAt({
        expiresAt: input.expiresAt,
        expiresInDays: input.expiresInDays,
        expiresInHours: input.expiresInHours,
      });
    }

    const updated = await linkRepository.update(linkId, {
      title: input.title,
      originalUrl: input.originalUrl,
      shortCode: input.shortCode ?? undefined,
      description: input.description,
      icon: input.icon,
      isActive: input.isActive,
      expiresAt,
    });

    return this.toResponse(updated);
  }

  async deleteLink(userId: string, linkId: string): Promise<void> {
    const existing = await linkRepository.findById(linkId);

    if (!existing) {
      throw new AppError('Link not found', 404, 'LINK_NOT_FOUND');
    }

    if (existing.userId !== userId) {
      throw new AppError('Forbidden', 403, 'FORBIDDEN');
    }

    await linkRepository.delete(linkId);
  }

  async handleRedirect(shortCode: string): Promise<string> {
    const link = await linkRepository.findByShortCode(shortCode);

    if (!link || !link.isActive) {
      throw new AppError('Link not found or inactive', 404, 'LINK_NOT_FOUND');
    }

    if (link.expiresAt && link.expiresAt <= new Date()) {
      throw new AppError('Link has expired', 410, 'LINK_EXPIRED');
    }

    await linkRepository.incrementClicks(link.id);

    return link.originalUrl;
  }

  async cleanupExpiredLinks(): Promise<number> {
    return linkRepository.deleteExpiredLinks();
  }

  private calculateExpiresAt(input: {
    expiresAt?: string | null | undefined;
    expiresInDays?: number | null | undefined;
    expiresInHours?: number | null | undefined;
  }): Date | null {
    if (input.expiresInDays && input.expiresInDays > 0) {
      return new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000);
    }

    if (input.expiresInHours && input.expiresInHours > 0) {
      return new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000);
    }

    if (input.expiresAt) {
      const parsedDate = new Date(input.expiresAt);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }

    return null;
  }

  private async generateUniqueShortCode(): Promise<string> {
    for (let attempts = 0; attempts < 10; attempts++) {
      const code = crypto.randomBytes(4).toString('hex');
      const existing = await linkRepository.findByShortCode(code);
      if (!existing) return code;
    }
    return crypto.randomUUID().slice(0, 8);
  }

  private toResponse(link: {
    id: string;
    userId: string;
    title: string;
    originalUrl: string;
    shortCode: string;
    description: string | null;
    icon: string | null;
    isActive: boolean;
    clicksCount: number;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): LinkResponse {
    const isExpired = link.expiresAt !== null && link.expiresAt <= new Date();
    const shortUrl = `${env.FRONTEND_URL}/r/${link.shortCode}`;

    return {
      id: link.id,
      userId: link.userId,
      title: link.title,
      originalUrl: link.originalUrl,
      shortCode: link.shortCode,
      shortUrl,
      description: link.description,
      icon: link.icon,
      isActive: link.isActive,
      isExpired,
      clicksCount: link.clicksCount,
      expiresAt: link.expiresAt,
      createdAt: link.createdAt,
      updatedAt: link.updatedAt,
    };
  }
}

export const linkService = new LinkService();
