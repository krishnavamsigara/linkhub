import type { RequestHandler } from 'express';
import type { UserRole } from '../../shared/constants/roles.js';
import { AppError } from '../../shared/errors/app-error.js';
import {
  createPermissionSchema,
  updateRolePermissionsSchema,
  assignUserPermissionSchema,
  roleParamSchema,
} from './permissions.schema.js';
import { permissionsService } from './permissions.service.js';

export const getAllPermissionsController: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    const permissions = await permissionsService.getAllPermissions();
    res.status(200).json({
      success: true,
      data: { permissions },
    });
  } catch (error) {
    next(error);
  }
};

export const createPermissionController: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'UNAUTHENTICATED');
    }

    const dto = createPermissionSchema.parse(req.body);
    const permission = await permissionsService.createPermission(
      req.user.id,
      dto,
      {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    );

    res.status(201).json({
      success: true,
      data: { permission },
    });
  } catch (error) {
    next(error);
  }
};

export const getRolePermissionsController: RequestHandler<{ role: string }> =
  async (req, res, next) => {
    try {
      const { role } = roleParamSchema.parse(req.params);
      const permissions = await permissionsService.getRolePermissions(
        role as UserRole,
      );

      res.status(200).json({
        success: true,
        data: { role, permissions },
      });
    } catch (error) {
      next(error);
    }
  };

export const updateRolePermissionsController: RequestHandler<{ role: string }> =
  async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'UNAUTHENTICATED');
      }

      const { role } = roleParamSchema.parse(req.params);
      const { permissionCodes } = updateRolePermissionsSchema.parse(req.body);

      const permissions = await permissionsService.updateRolePermissions(
        req.user.id,
        role as UserRole,
        permissionCodes,
        {
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
      );

      res.status(200).json({
        success: true,
        data: { role, permissions },
      });
    } catch (error) {
      next(error);
    }
  };

export const getUserPermissionsController: RequestHandler<{ userId: string }> =
  async (req, res, next) => {
    try {
      const result = await permissionsService.getUserEffectivePermissions(
        req.params.userId,
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

export const getMePermissionsController: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'UNAUTHENTICATED');
    }

    const result = await permissionsService.getUserEffectivePermissions(
      req.user.id,
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const assignUserPermissionController: RequestHandler<{ userId: string }> =
  async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'UNAUTHENTICATED');
      }

      const { permissionCode, granted } = assignUserPermissionSchema.parse(
        req.body,
      );

      const override = await permissionsService.assignUserPermissionOverride(
        req.user.id,
        req.params.userId,
        permissionCode,
        granted,
        {
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
      );

      res.status(200).json({
        success: true,
        data: { override },
      });
    } catch (error) {
      next(error);
    }
  };

export const removeUserPermissionController: RequestHandler<{
  userId: string;
  code: string;
}> = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'UNAUTHENTICATED');
    }

    await permissionsService.removeUserPermissionOverride(
      req.user.id,
      req.params.userId,
      req.params.code,
      {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    );

    res.status(200).json({
      success: true,
      data: { message: 'Permission override removed successfully' },
    });
  } catch (error) {
    next(error);
  }
};
