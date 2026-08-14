import { AppError } from '../../shared/errors/app-error.js';
import { themeRepository } from './theme.repository.js';
import { paymentRepository } from '../payments/payment.repository.js';

export class ThemeService {
  async listThemes() {
    const themes = await themeRepository.findAll();
    return themes.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      background: t.background,
      buttonStyle: t.buttonStyle,
      buttonColor: t.buttonColor,
      textColor: t.textColor,
      fontFamily: t.fontFamily,
      isPro: t.isPro,
    }));
  }

  async getThemeById(id: string) {
    const theme = await themeRepository.findById(id);
    if (!theme) {
      throw new AppError('Theme not found', 404, 'THEME_NOT_FOUND');
    }
    return theme;
  }

  /**
   * Validates that a user can select a given theme.
   * PRO themes require an active PRO subscription.
   */
  async assertCanUseTheme(userId: string, themeId: string): Promise<void> {
    const theme = await themeRepository.findById(themeId);
    if (!theme) {
      throw new AppError('Theme not found', 404, 'THEME_NOT_FOUND');
    }

    if (theme.isPro) {
      const subscription =
        await paymentRepository.findSubscriptionByUserId(userId);
      const isPro =
        subscription?.plan === 'PRO' && subscription?.status === 'ACTIVE';

      if (!isPro) {
        throw new AppError(
          'This theme requires a PRO subscription. Please upgrade to access custom themes.',
          403,
          'PRO_PLAN_REQUIRED_FOR_THEME',
        );
      }
    }
  }
}

export const themeService = new ThemeService();
