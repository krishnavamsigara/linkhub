import type { Request, Response, NextFunction } from 'express';

import { AppError } from '../../shared/errors/app-error.js';
import { updateProfileSchema } from './profile.schema.js';
import { profileService } from './profile.service.js';

export class ProfileController {
  async getProfile(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const profile = await profileService.getProfileByUserId(userId);
      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPublicProfile(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const usernameParam = req.params.username;
      const username = Array.isArray(usernameParam)
        ? usernameParam[0]
        : usernameParam;

      if (!username) {
        throw new AppError('Username is required', 400, 'BAD_REQUEST');
      }

      const profile = await profileService.getProfileByUsername(username);
      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const validatedBody = updateProfileSchema.parse(req.body);
      const profile = await profileService.updateProfile(userId, validatedBody);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  async uploadAvatar(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const result = await profileService.uploadAvatar(userId, req.file);

      res.status(202).json({
        success: true,
        message: result.message,
        data: {
          avatarStatus: result.avatarStatus,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteAvatar(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const profile = await profileService.deleteAvatar(userId);

      res.json({
        success: true,
        message: 'Avatar deleted successfully',
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAvatarStream(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userIdParam = req.params.userId;
      const userId = Array.isArray(userIdParam)
        ? userIdParam[0]
        : userIdParam;

      if (!userId) {
        throw new AppError('User ID is required', 400, 'BAD_REQUEST');
      }

      const { stream, contentType, contentLength } =
        await profileService.getAvatarStream(userId);

      res.setHeader('Content-Type', contentType || 'image/png');
      if (contentLength) {
        res.setHeader('Content-Length', contentLength.toString());
      }
      res.setHeader(
        'Cache-Control',
        'public, max-age=86400, stale-while-revalidate=3600',
      );

      stream.pipe(res);
    } catch (error) {
      next(error);
    }
  }
}

export const profileController = new ProfileController();
