import { describe, it, expect, vi, beforeEach } from 'vitest';
import { linkService } from '../../src/modules/links/link.service.js';
import { linkRepository } from '../../src/modules/links/link.repository.js';
import { paymentRepository } from '../../src/modules/payments/payment.repository.js';
import { analyticsQueue } from '../../src/infrastructure/queue/index.js';
import { AppError } from '../../src/shared/errors/app-error.js';

vi.mock('../../src/modules/links/link.repository.js');
vi.mock('../../src/modules/payments/payment.repository.js');
vi.mock('../../src/infrastructure/redis/index.js', () => ({
  cacheService: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(true),
    del: vi.fn().mockResolvedValue(1),
  },
  redisKeys: {
    linkShortCode: (code: string) => `cache:link:shortcode:${code}`,
  },
  CACHE_TTL: {
    SHORTCODE_REDIRECT: 86400,
  },
}));
vi.mock('../../src/infrastructure/queue/index.js', () => ({
  analyticsQueue: {
    add: vi.fn().mockResolvedValue({ id: 'job-analytics-1' }),
  },
  linkCronQueue: {
    add: vi.fn().mockResolvedValue({ id: 'cron-job-1' }),
  },
}));


describe('LinkService', () => {
  const mockUserId = '11111111-1111-1111-1111-111111111111';
  const mockLinkId = '33333333-3333-3333-3333-333333333333';

  const mockLink = {
    id: mockLinkId,
    userId: mockUserId,
    title: 'My Portfolio',
    originalUrl: 'https://example.com/portfolio',
    shortCode: 'portfolio',
    description: 'Personal portfolio website',
    icon: 'globe',
    isActive: true,
    clicksCount: 15,
    expiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProSubscription = {
    id: 'sub-1',
    userId: mockUserId,
    plan: 'PRO' as const,
    status: 'ACTIVE' as const,
    razorpaySubscriptionId: null,
    razorpayCustomerId: null,
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 86400000),
    cancelledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockFreeSubscription = {
    id: 'sub-2',
    userId: mockUserId,
    plan: 'FREE' as const,
    status: 'ACTIVE' as const,
    razorpaySubscriptionId: null,
    razorpayCustomerId: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const { cacheService } = await import('../../src/infrastructure/redis/index.js');
    vi.mocked(cacheService.get).mockResolvedValue(null);
  });


  describe('createLink', () => {
    it('should create link with custom shortCode and calculated expiration in days', async () => {
      vi.mocked(paymentRepository.ensureFreeSubscription).mockResolvedValue(mockFreeSubscription);
      vi.mocked(paymentRepository.countUserLinks).mockResolvedValue(2);
      vi.mocked(linkRepository.findByShortCode).mockResolvedValue(null);
      vi.mocked(linkRepository.create).mockResolvedValue(mockLink);

      const result = await linkService.createLink(mockUserId, {
        title: 'My Portfolio',
        originalUrl: 'https://example.com/portfolio',
        shortCode: 'portfolio',
        expiresInDays: 7,
      });

      expect(result).toBeDefined();
      expect(result.shortCode).toBe('portfolio');
      expect(linkRepository.create).toHaveBeenCalled();
    });

    it('should throw AppError 409 if custom shortcode is already taken', async () => {
      vi.mocked(paymentRepository.ensureFreeSubscription).mockResolvedValue(mockFreeSubscription);
      vi.mocked(paymentRepository.countUserLinks).mockResolvedValue(2);
      vi.mocked(linkRepository.findByShortCode).mockResolvedValue(mockLink);

      await expect(
        linkService.createLink(mockUserId, {
          title: 'Duplicate',
          originalUrl: 'https://example.com',
          shortCode: 'portfolio',
        }),
      ).rejects.toThrow(AppError);
    });
  });

  describe('handleRedirect', () => {
    it('should enqueue background click analytics and return originalUrl for active valid link', async () => {
      vi.mocked(linkRepository.findByShortCode).mockResolvedValue(mockLink);

      const url = await linkService.handleRedirect('portfolio', {
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 Chrome/120.0',
        referrer: 'https://google.com',
      });

      expect(url).toBe('https://example.com/portfolio');
      expect(analyticsQueue.add).toHaveBeenCalledWith(
        'record-link-click',
        expect.objectContaining({
          linkId: mockLinkId,
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0 Chrome/120.0',
          referrer: 'https://google.com',
        }),
      );
    });

    it('should return originalUrl directly from Redis cache without querying DB when cached', async () => {
      const { cacheService } = await import('../../src/infrastructure/redis/index.js');
      vi.mocked(cacheService.get).mockResolvedValue({
        id: mockLinkId,
        originalUrl: 'https://example.com/cached-target',
        isActive: true,
        expiresAt: null,
      });

      const url = await linkService.handleRedirect('cached-code');

      expect(url).toBe('https://example.com/cached-target');
      expect(linkRepository.findByShortCode).not.toHaveBeenCalled();
    });

    it('should throw AppError 410 if link has expired', async () => {
      const expiredLink = {
        ...mockLink,
        expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
      };

      vi.mocked(linkRepository.findByShortCode).mockResolvedValue(expiredLink);

      await expect(linkService.handleRedirect('portfolio')).rejects.toThrow(
        AppError,
      );
    });
  });


  describe('getLinkAnalytics', () => {
    it('should aggregate analytics metrics correctly for PRO user', async () => {
      vi.mocked(paymentRepository.findSubscriptionByUserId).mockResolvedValue(mockProSubscription);
      vi.mocked(linkRepository.findById).mockResolvedValue(mockLink);
      vi.mocked(linkRepository.getRawClicks).mockResolvedValue([
        {
          id: 'click-1',
          linkId: mockLinkId,
          ipAddress: '127.0.0.1',
          userAgent: 'UA 1',
          referrer: 'https://google.com',
          deviceType: 'desktop',
          browser: 'Chrome',
          os: 'Windows',
          clickedAt: new Date('2026-08-14T10:00:00.000Z'),
        },
        {
          id: 'click-2',
          linkId: mockLinkId,
          ipAddress: '127.0.0.2',
          userAgent: 'UA 2',
          referrer: 'https://twitter.com',
          deviceType: 'mobile',
          browser: 'Safari',
          os: 'iOS',
          clickedAt: new Date('2026-08-14T11:00:00.000Z'),
        },
      ]);

      const analytics = await linkService.getLinkAnalytics(
        mockUserId,
        mockLinkId,
      );

      expect(analytics).toBeDefined();
      expect(analytics.totalClicks).toBe(15);
      expect(analytics.deviceBreakdown).toEqual({ desktop: 1, mobile: 1 });
      expect(analytics.browserBreakdown).toEqual({ Chrome: 1, Safari: 1 });
      expect(analytics.osBreakdown).toEqual({ Windows: 1, iOS: 1 });
      expect(analytics.recentClicks).toHaveLength(2);
    });
  });

  describe('cleanupExpiredLinks', () => {
    it('should call repository deleteExpiredLinks', async () => {
      vi.mocked(linkRepository.deleteExpiredLinks).mockResolvedValue(5);

      const count = await linkService.cleanupExpiredLinks();
      expect(count).toBe(5);
      expect(linkRepository.deleteExpiredLinks).toHaveBeenCalled();
    });
  });
});
