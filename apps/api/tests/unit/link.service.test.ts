import { describe, it, expect, vi, beforeEach } from 'vitest';
import { linkService } from '../../src/modules/links/link.service.js';
import { linkRepository } from '../../src/modules/links/link.repository.js';
import { AppError } from '../../src/shared/errors/app-error.js';

vi.mock('../../src/modules/links/link.repository.js');

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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createLink', () => {
    it('should create link with custom shortCode and calculated expiration in days', async () => {
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
    it('should increment clicks and return originalUrl for active valid link', async () => {
      vi.mocked(linkRepository.findByShortCode).mockResolvedValue(mockLink);
      vi.mocked(linkRepository.incrementClicks).mockResolvedValue(mockLink);

      const url = await linkService.handleRedirect('portfolio');

      expect(url).toBe('https://example.com/portfolio');
      expect(linkRepository.incrementClicks).toHaveBeenCalledWith(mockLinkId);
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

  describe('cleanupExpiredLinks', () => {
    it('should call repository deleteExpiredLinks', async () => {
      vi.mocked(linkRepository.deleteExpiredLinks).mockResolvedValue(5);

      const count = await linkService.cleanupExpiredLinks();
      expect(count).toBe(5);
      expect(linkRepository.deleteExpiredLinks).toHaveBeenCalled();
    });
  });
});
