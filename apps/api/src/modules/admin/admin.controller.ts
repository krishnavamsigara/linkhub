import type { RequestHandler } from 'express';

import { updateUserRoleSchema } from './admin.schema.js';
import { adminService } from './admin.service.js';

export const getUsersController: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    const users = await adminService.getUsers();

    res.status(200).json({
      success: true,
      data: {
        users,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Generic <{ id: string }> types req.params so req.params.id is known to be 'string'
export const updateUserRoleController: RequestHandler<{ id: string }> =
  async (req, res, next) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHENTICATED',
            message: 'Authentication required',
          },
        });

        return;
      }

      const { role } = updateUserRoleSchema.parse(req.body);

      const result = await adminService.updateUserRole(
        req.user.id,
        req.params.id,
        role,
        {
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
      );

      res.status(200).json({
        success: true,
        data: {
          user: result.user,
          changed: result.changed,
        },
      });
    } catch (error) {
      next(error);
    }
  };
