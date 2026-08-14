import { Router } from 'express';

import { themeController } from './theme.controller.js';

export const themeRouter: Router = Router();

// Public — no auth required to view themes
themeRouter.get('/', (req, res, next) =>
  themeController.listThemes(req, res, next),
);

themeRouter.get('/:id', (req, res, next) =>
  themeController.getTheme(req, res, next),
);
