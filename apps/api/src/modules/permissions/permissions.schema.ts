import { z } from 'zod';
import { USER_ROLES } from '../../shared/constants/roles.js';

export const createPermissionSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(100)
    .regex(/^[a-z0-9_]+:[a-z0-9_]+$/, {
      message: 'Permission code must follow the format "module:action" (e.g., users:read)',
    }),
  name: z.string().min(2).max(100),
  description: z.string().max(255).optional(),
  module: z.string().min(2).max(50),
});

export const updateRolePermissionsSchema = z.object({
  permissionCodes: z.array(z.string()),
});

export const assignUserPermissionSchema = z.object({
  permissionCode: z.string(),
  granted: z.boolean().default(true),
});

export const roleParamSchema = z.object({
  role: z.enum([USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]),
});
