import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/permission.middleware.js';
import { PERMISSIONS } from './permissions.constants.js';
import {
  getAllPermissionsController,
  createPermissionController,
  getRolePermissionsController,
  updateRolePermissionsController,
  getUserPermissionsController,
  getMePermissionsController,
  assignUserPermissionController,
  removeUserPermissionController,
} from './permissions.controller.js';

export const permissionRouter: Router = Router();

permissionRouter.get(
  '/me',
  requireAuth,
  getMePermissionsController,
);

permissionRouter.get(
  '/',
  requireAuth,
  requirePermission(PERMISSIONS.PERMISSIONS_MANAGE),
  getAllPermissionsController,
);

permissionRouter.post(
  '/',
  requireAuth,
  requirePermission(PERMISSIONS.PERMISSIONS_MANAGE),
  createPermissionController,
);

permissionRouter.get(
  '/roles/:role',
  requireAuth,
  requirePermission(PERMISSIONS.PERMISSIONS_MANAGE),
  getRolePermissionsController,
);

permissionRouter.put(
  '/roles/:role',
  requireAuth,
  requirePermission(PERMISSIONS.PERMISSIONS_MANAGE),
  updateRolePermissionsController,
);

permissionRouter.get(
  '/users/:userId',
  requireAuth,
  requirePermission(PERMISSIONS.PERMISSIONS_MANAGE),
  getUserPermissionsController,
);

permissionRouter.post(
  '/users/:userId',
  requireAuth,
  requirePermission(PERMISSIONS.PERMISSIONS_MANAGE),
  assignUserPermissionController,
);

permissionRouter.delete(
  '/users/:userId/overrides/:code',
  requireAuth,
  requirePermission(PERMISSIONS.PERMISSIONS_MANAGE),
  removeUserPermissionController,
);
