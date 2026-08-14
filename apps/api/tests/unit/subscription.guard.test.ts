import { describe, it, expect, vi, beforeEach } from 'vitest';
import { linkService } from '../../src/modules/links/link.service.js';
import { linkRepository } from '../../src/modules/links/link.repository.js';
import { themeService } from '../../src/modules/themes/theme.service.js';
import { themeRepository } from '../../src/modules/themes/theme.repository.js';
import { profileService } from '../../src/modules/profile/profile.service.js';
import { userRepository } from '../../src/modules/users/user.repository.js';
import { profileRepository } from '../../src/modules/profile/profile.repository.js';
import { paymentRepository } from '../../src/modules/payments/payment.repository.js';
import { AppError } from '../../src/shared/errors/app-error.js';

vi.mock('../../src/modules/links/link.repository.js');
vi.mock('../../src/modules/themes/theme.repository.js');
vi.mock('../../src/modules/users/user.repository.js');
vi.mock('../../src/modules/profile/profile.repository.js');
vi.mock('../../src/modules/payments/payment.repository.js');

describe('Subscription Feature Guards', () => {
  const mockUserId = '11111111-1111-1111-1111-111111111111';
  const mockLinkId = '33333333-3333-3333-3333-333333333333';
  const mockProThemeId = '44444444-4444-4444-4444-444444444444';
  const mockFreeThemeId = '55555555-5555-5555-5555-555555555555';

  const mockFreeSubscription = {
    id: 'sub-free',
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

  const mockProSubscription = {
    id: 'sub-pro',
    userId: mockUserId,
    plan: 'PRO' as const,
    status: 'ACTIVE' as const,
    razorpaySubscriptionId: 'sub_rzp_123',
    razorpayCustomerId: 'cust_123',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 365 * 86400000),
    cancelledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLink = {
    id: mockLinkId,
    userId: mockUserId,
    title: 'Link Test',
    originalUrl: 'https://example.com',
    shortCode: 'testlink',
    description: null,
    icon: null,
    isActive: true,
    clicksCount: 0,
    expiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    id: mockUserId,
    username: 'testuser',
    displayName: 'Test User',
    email: 'test@example.com',
    role: 'USER' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Link Creation Limits', () => {
    it('should allow link creation when user is on FREE plan and has < 5 links', async () => {
      vi.mocked(paymentRepository.ensureFreeSubscription).mockResolvedValue(mockFreeSubscription);
      vi.mocked(paymentRepository.countUserLinks).mockResolvedValue(4);
      vi.mocked(linkRepository.findByShortCode).mockResolvedValue(null);
      vi.mocked(linkRepository.create).mockResolvedValue(mockLink);

      const link = await linkService.createLink(mockUserId, {
        title: 'Fifth Link',
        originalUrl: 'https://example.com',
      });

      expect(link).toBeDefined();
      expect(linkRepository.create).toHaveBeenCalled();
    });

    it('should throw AppError 403 FREE_PLAN_LINK_LIMIT_EXCEEDED when FREE user attempts 6th link', async () => {
      vi.mocked(paymentRepository.ensureFreeSubscription).mockResolvedValue(mockFreeSubscription);
      vi.mocked(paymentRepository.countUserLinks).mockResolvedValue(5);

      await expect(
        linkService.createLink(mockUserId, {
          title: 'Sixth Link',
          originalUrl: 'https://example.com',
        }),
      ).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 403,
          code: 'FREE_PLAN_LINK_LIMIT_EXCEEDED',
        }),
      );

      expect(linkRepository.create).not.toHaveBeenCalled();
    });

    it('should allow unlimited links when user is on PRO plan', async () => {
      vi.mocked(paymentRepository.ensureFreeSubscription).mockResolvedValue(mockProSubscription);
      vi.mocked(linkRepository.findByShortCode).mockResolvedValue(null);
      vi.mocked(linkRepository.create).mockResolvedValue(mockLink);

      const link = await linkService.createLink(mockUserId, {
        title: 'Tenth Link',
        originalUrl: 'https://example.com',
      });

      expect(link).toBeDefined();
      expect(linkRepository.create).toHaveBeenCalled();
    });
  });

  describe('Analytics Access Guard', () => {
    it('should block analytics with 403 PRO_PLAN_REQUIRED_FOR_ANALYTICS on FREE plan', async () => {
      vi.mocked(paymentRepository.findSubscriptionByUserId).mockResolvedValue(mockFreeSubscription);

      await expect(
        linkService.getLinkAnalytics(mockUserId, mockLinkId),
      ).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 403,
          code: 'PRO_PLAN_REQUIRED_FOR_ANALYTICS',
        }),
      );
    });

    it('should allow analytics access on PRO plan', async () => {
      vi.mocked(paymentRepository.findSubscriptionByUserId).mockResolvedValue(mockProSubscription);
      vi.mocked(linkRepository.findById).mockResolvedValue(mockLink);
      vi.mocked(linkRepository.getRawClicks).mockResolvedValue([]);

      const analytics = await linkService.getLinkAnalytics(mockUserId, mockLinkId);
      expect(analytics).toBeDefined();
      expect(analytics.linkId).toBe(mockLinkId);
    });
  });

  describe('Theme Selection Guard', () => {
    it('should allow selecting FREE themes on FREE plan', async () => {
      vi.mocked(themeRepository.findById).mockResolvedValue({
        id: mockFreeThemeId,
        name: 'Classic Light',
        description: 'Clean theme',
        background: '#fff',
        buttonStyle: 'rounded',
        buttonColor: '#000',
        textColor: '#000',
        fontFamily: 'Inter',
        isPro: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        themeService.assertCanUseTheme(mockUserId, mockFreeThemeId),
      ).resolves.toBeUndefined();
    });

    it('should block selecting PRO theme on FREE plan with 403 PRO_PLAN_REQUIRED_FOR_THEME', async () => {
      vi.mocked(themeRepository.findById).mockResolvedValue({
        id: mockProThemeId,
        name: 'Glassmorphism',
        description: 'Glass theme',
        background: 'glass',
        buttonStyle: 'glass',
        buttonColor: 'rgba(255,255,255,0.2)',
        textColor: '#fff',
        fontFamily: 'Inter',
        isPro: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(paymentRepository.findSubscriptionByUserId).mockResolvedValue(mockFreeSubscription);

      await expect(
        themeService.assertCanUseTheme(mockUserId, mockProThemeId),
      ).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 403,
          code: 'PRO_PLAN_REQUIRED_FOR_THEME',
        }),
      );
    });

    it('should allow selecting PRO theme when user is on PRO plan', async () => {
      vi.mocked(themeRepository.findById).mockResolvedValue({
        id: mockProThemeId,
        name: 'Glassmorphism',
        description: 'Glass theme',
        background: 'glass',
        buttonStyle: 'glass',
        buttonColor: 'rgba(255,255,255,0.2)',
        textColor: '#fff',
        fontFamily: 'Inter',
        isPro: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(paymentRepository.findSubscriptionByUserId).mockResolvedValue(mockProSubscription);

      await expect(
        themeService.assertCanUseTheme(mockUserId, mockProThemeId),
      ).resolves.toBeUndefined();
    });

    it('should enforce theme guard through profileService.updateProfile', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(themeRepository.findById).mockResolvedValue({
        id: mockProThemeId,
        name: 'Neon Sunset',
        description: 'Neon theme',
        background: 'gradient',
        buttonStyle: 'neon',
        buttonColor: '#e94560',
        textColor: '#00f5d4',
        fontFamily: 'Outfit',
        isPro: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(paymentRepository.findSubscriptionByUserId).mockResolvedValue(mockFreeSubscription);

      await expect(
        profileService.updateProfile(mockUserId, {
          themeId: mockProThemeId,
        }),
      ).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 403,
          code: 'PRO_PLAN_REQUIRED_FOR_THEME',
        }),
      );
    });
  });
});
