import crypto from 'node:crypto';

import { env } from '../../config/index.js';
import { AppError } from '../../shared/errors/app-error.js';
import { analyticsQueue } from '../../infrastructure/queue/index.js';
import { cacheService, redisKeys, CACHE_TTL } from '../../infrastructure/redis/index.js';
import { paymentRepository } from '../payments/payment.repository.js';
import { linkRepository } from './link.repository.js';
import type {
  CreateLinkInput,
  LinkResponse,
  UpdateLinkInput,
} from './link.types.js';

const FREE_PLAN_LINK_LIMIT = 5;

export interface LinkAnalyticsResponse {
  linkId: string;
  shortCode: string;
  totalClicks: number;
  deviceBreakdown: Record<string, number>;
  browserBreakdown: Record<string, number>;
  osBreakdown: Record<string, number>;
  topReferrers: Record<string, number>;
  clicksOverTime: Record<string, number>;
  recentClicks: Array<{
    id: string;
    ipAddress: string | null;
    deviceType: string | null;
    browser: string | null;
    os: string | null;
    referrer: string | null;
    clickedAt: Date;
  }>;
}

export class LinkService {
  async createLink(
    userId: string,
    input: CreateLinkInput,
  ): Promise<LinkResponse> {
    // ─── FREE Plan Link Limit Guard ─────────────────────────────────────────
    const subscription = await paymentRepository.ensureFreeSubscription(userId);
    if (subscription.plan === 'FREE') {
      const linkCount = await paymentRepository.countUserLinks(userId);
      if (linkCount >= FREE_PLAN_LINK_LIMIT) {
        throw new AppError(
          `FREE plan is limited to ${FREE_PLAN_LINK_LIMIT} links. Please upgrade to PRO for unlimited links.`,
          403,
          'FREE_PLAN_LINK_LIMIT_EXCEEDED',
        );
      }
    }

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

    // Invalidate Redis caches for both old and new shortcodes
    await cacheService.del([
      redisKeys.linkShortCode(existing.shortCode),
      ...(input.shortCode ? [redisKeys.linkShortCode(input.shortCode)] : []),
    ]);

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

    // Invalidate cached shortcode
    await cacheService.del(redisKeys.linkShortCode(existing.shortCode));
  }

  async handleRedirect(
    shortCode: string,
    reqMeta?: {
      ipAddress?: string | null;
      userAgent?: string | null;
      referrer?: string | null;
    },
  ): Promise<string> {
    const cacheKey = redisKeys.linkShortCode(shortCode);

    // ─── Fast-Path: Check Redis Cache First ─────────────────────────────────
    interface CachedLink {
      id: string;
      originalUrl: string;
      isActive: boolean;
      expiresAt: string | null;
    }

    let link = await cacheService.get<CachedLink>(cacheKey);

    if (!link) {
      // ─── Cache Miss: Query PostgreSQL and populate cache ───────────────────
      const dbLink = await linkRepository.findByShortCode(shortCode);

      if (!dbLink || !dbLink.isActive) {
        throw new AppError('Link not found or inactive', 404, 'LINK_NOT_FOUND');
      }

      link = {
        id: dbLink.id,
        originalUrl: dbLink.originalUrl,
        isActive: dbLink.isActive,
        expiresAt: dbLink.expiresAt ? dbLink.expiresAt.toISOString() : null,
      };

      // Store in Redis (24-hour TTL)
      await cacheService.set(cacheKey, link, CACHE_TTL.SHORTCODE_REDIRECT);
    }

    if (!link.isActive) {
      throw new AppError('Link not found or inactive', 404, 'LINK_NOT_FOUND');
    }

    if (link.expiresAt && new Date(link.expiresAt) <= new Date()) {
      // Evict expired link from cache
      await cacheService.del(cacheKey);
      throw new AppError('Link has expired', 410, 'LINK_EXPIRED');
    }

    // Enqueue background analytics click job (non-blocking)
    try {
      await analyticsQueue.add('record-link-click', {
        linkId: link.id,
        ipAddress: reqMeta?.ipAddress || null,
        userAgent: reqMeta?.userAgent || null,
        referrer: reqMeta?.referrer || null,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Fallback: direct click increment if queue error occurs
      await linkRepository.incrementClicks(link.id);
    }

    return link.originalUrl;
  }

  async getLinkAnalytics(
    userId: string,
    linkId: string,
  ): Promise<LinkAnalyticsResponse> {
    // ─── PRO Plan Analytics Guard ───────────────────────────────────────────
    const subscription = await paymentRepository.findSubscriptionByUserId(userId);
    if (!subscription || subscription.plan === 'FREE') {
      throw new AppError(
        'Analytics is a PRO feature. Please upgrade to access detailed click analytics.',
        403,
        'PRO_PLAN_REQUIRED_FOR_ANALYTICS',
      );
    }

    const link = await linkRepository.findById(linkId);

    if (!link) {
      throw new AppError('Link not found', 404, 'LINK_NOT_FOUND');
    }

    if (link.userId !== userId) {
      throw new AppError('Forbidden', 403, 'FORBIDDEN');
    }

    const clicks = await linkRepository.getRawClicks(linkId);

    const deviceBreakdown: Record<string, number> = {};
    const browserBreakdown: Record<string, number> = {};
    const osBreakdown: Record<string, number> = {};
    const topReferrers: Record<string, number> = {};
    const clicksOverTime: Record<string, number> = {};

    for (const click of clicks) {
      const device = click.deviceType || 'unknown';
      deviceBreakdown[device] = (deviceBreakdown[device] || 0) + 1;

      const browser = click.browser || 'Other';
      browserBreakdown[browser] = (browserBreakdown[browser] || 0) + 1;

      const os = click.os || 'Other';
      osBreakdown[os] = (osBreakdown[os] || 0) + 1;

      const ref = click.referrer || 'Direct';
      topReferrers[ref] = (topReferrers[ref] || 0) + 1;

      const dateStr = click.clickedAt.toISOString().split('T')[0]!;
      clicksOverTime[dateStr] = (clicksOverTime[dateStr] || 0) + 1;
    }

    const recentClicks = clicks.slice(0, 20).map((c) => ({
      id: c.id,
      ipAddress: c.ipAddress,
      deviceType: c.deviceType,
      browser: c.browser,
      os: c.os,
      referrer: c.referrer,
      clickedAt: c.clickedAt,
    }));

    return {
      linkId: link.id,
      shortCode: link.shortCode,
      totalClicks: link.clicksCount,
      deviceBreakdown,
      browserBreakdown,
      osBreakdown,
      topReferrers,
      clicksOverTime,
      recentClicks,
    };
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
