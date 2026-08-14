import type { Request, Response, NextFunction } from 'express';

import { AppError } from '../../shared/errors/app-error.js';
import { createLinkSchema, updateLinkSchema } from './link.schema.js';
import { linkService } from './link.service.js';

export class LinkController {
  async createLink(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const validatedBody = createLinkSchema.parse(req.body);
      const link = await linkService.createLink(userId, validatedBody);

      res.status(201).json({
        success: true,
        message: 'Link created successfully',
        data: link,
      });
    } catch (error) {
      next(error);
    }
  }

  async getLinks(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const links = await linkService.getLinksByUser(userId);

      res.json({
        success: true,
        data: links,
      });
    } catch (error) {
      next(error);
    }
  }

  async getLinkById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const linkIdParam = req.params.id;
      const linkId = Array.isArray(linkIdParam) ? linkIdParam[0] : linkIdParam;

      if (!linkId) {
        throw new AppError('Link ID is required', 400, 'BAD_REQUEST');
      }

      const link = await linkService.getLinkById(userId, linkId);

      res.json({
        success: true,
        data: link,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateLink(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const linkIdParam = req.params.id;
      const linkId = Array.isArray(linkIdParam) ? linkIdParam[0] : linkIdParam;

      if (!linkId) {
        throw new AppError('Link ID is required', 400, 'BAD_REQUEST');
      }

      const validatedBody = updateLinkSchema.parse(req.body);
      const link = await linkService.updateLink(userId, linkId, validatedBody);

      res.json({
        success: true,
        message: 'Link updated successfully',
        data: link,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteLink(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const linkIdParam = req.params.id;
      const linkId = Array.isArray(linkIdParam) ? linkIdParam[0] : linkIdParam;

      if (!linkId) {
        throw new AppError('Link ID is required', 400, 'BAD_REQUEST');
      }

      await linkService.deleteLink(userId, linkId);

      res.json({
        success: true,
        message: 'Link deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getLinkAnalytics(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const linkIdParam = req.params.id;
      const linkId = Array.isArray(linkIdParam) ? linkIdParam[0] : linkIdParam;

      if (!linkId) {
        throw new AppError('Link ID is required', 400, 'BAD_REQUEST');
      }

      const analytics = await linkService.getLinkAnalytics(userId, linkId);

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }

  async handleRedirect(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const shortCodeParam = req.params.shortCode;
      const shortCode = Array.isArray(shortCodeParam)
        ? shortCodeParam[0]
        : shortCodeParam;

      if (!shortCode) {
        throw new AppError('Shortcode is required', 400, 'BAD_REQUEST');
      }

      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip || null;
      const userAgent = req.get('user-agent') || null;
      const referrer = req.get('referrer') || req.get('referer') || null;

      const targetUrl = await linkService.handleRedirect(shortCode, {
        ipAddress,
        userAgent,
        referrer,
      });

      res.redirect(302, targetUrl);
    } catch (error) {
      next(error);
    }
  }
}

export const linkController = new LinkController();
