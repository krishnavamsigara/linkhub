import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';

import {
  loginController,
  logoutAllController,
  logoutController,
  meController,
  refreshController,
  registerController,
} from './auth.controller.js';

export const authRouter: Router = Router();

authRouter.post(
  '/register',
  registerController,
);

authRouter.post(
  '/login',
  loginController,
);

authRouter.post(
  '/refresh',
  refreshController,
);

authRouter.post(
  '/logout',
  logoutController,
);

authRouter.post(
  '/logout-all',
  requireAuth,
  logoutAllController,
);

authRouter.get(
  '/me',
  requireAuth,
  meController,
);
