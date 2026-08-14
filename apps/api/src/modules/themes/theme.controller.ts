import type { Request, Response, NextFunction } from 'express';

import { AppError } from '../../shared/errors/app-error.js';
import { themeService } from './theme.service.js';

export class ThemeController {
  // GET /api/v1/themes
  async listThemes(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const themes = await themeService.listThemes();
      res.json({
        success: true,
        data: themes,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/themes/:id
  async getTheme(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const themeIdParam = req.params.id;
      const themeId = Array.isArray(themeIdParam)
        ? themeIdParam[0]
        : themeIdParam;

      if (!themeId) {
        throw new AppError('Theme ID is required', 400, 'BAD_REQUEST');
      }

      const theme = await themeService.getThemeById(themeId);
      res.json({
        success: true,
        data: theme,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const themeController = new ThemeController();
