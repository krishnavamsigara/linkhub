import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';

import {
  ADMIN_ROLES,
  USER_ROLES,
} from '../../shared/constants/roles.js';

import { requireRole } from '../../middleware/authorization.middleware.js';

import {
  getUsersController,
  updateUserRoleController,
} from './admin.controller.js';

export const adminRouter : Router =
  Router();

adminRouter.get(
  '/users',
  requireAuth,
  requireRole(...ADMIN_ROLES),
  getUsersController,
);

adminRouter.patch(
  '/users/:id/role',
  requireAuth,
  requireRole(USER_ROLES.SUPER_ADMIN),
  updateUserRoleController,
);
