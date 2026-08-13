import { AppError } from '../../shared/errors/app-error.js';
import type { UserRole } from '../../shared/constants/roles.js';
import { prisma } from '../../infrastructure/database/index.js';
import { permissionsRepository } from './permissions.repository.js';
import type {
  CreatePermissionDto,
  EffectivePermissionsResult,
} from './permissions.types.js';

export class PermissionsService {
  async getAllPermissions() {
    return permissionsRepository.findAllPermissions();
  }

  async createPermission(
    actorUserId: string,
    dto: CreatePermissionDto,
    metadata: { ipAddress?: string | undefined; userAgent?: string | undefined },
  ) {
    const existing = await permissionsRepository.findPermissionByCode(dto.code);
    if (existing) {
      throw new AppError(
        `Permission with code '${dto.code}' already exists`,
        409,
        'PERMISSION_ALREADY_EXISTS',
      );
    }

    const permission = await permissionsRepository.createPermission(dto);

    await prisma.auditLog.create({
      data: {
        actorUserId,
        action: 'PERMISSION_CREATED',
        ipAddress: metadata.ipAddress ?? null,
        userAgent: metadata.userAgent ?? null,
        metadata: {
          permissionId: permission.id,
          code: permission.code,
          name: permission.name,
        },
      },
    });

    return permission;
  }

  async getRolePermissions(role: UserRole) {
    return permissionsRepository.getRolePermissions(role);
  }

  async updateRolePermissions(
    actorUserId: string,
    role: UserRole,
    permissionCodes: string[],
    metadata: { ipAddress?: string | undefined; userAgent?: string | undefined },
  ) {
    const permissions = await permissionsRepository.findPermissionsByCodes(permissionCodes);
    if (permissions.length !== permissionCodes.length) {
      const foundCodes = new Set(permissions.map((p) => p.code));
      const missing = permissionCodes.filter((c) => !foundCodes.has(c));
      throw new AppError(
        `The following permissions do not exist: ${missing.join(', ')}`,
        400,
        'INVALID_PERMISSIONS',
      );
    }

    const permissionIds = permissions.map((p) => p.id);
    const updatedPermissions = await permissionsRepository.setRolePermissions(
      role,
      permissionIds,
    );

    await prisma.auditLog.create({
      data: {
        actorUserId,
        action: 'ROLE_PERMISSIONS_UPDATED',
        ipAddress: metadata.ipAddress ?? null,
        userAgent: metadata.userAgent ?? null,
        metadata: {
          targetRole: role,
          permissionCodes,
        },
      },
    });

    return updatedPermissions;
  }

  async getUserEffectivePermissions(userId: string): Promise<EffectivePermissionsResult> {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const allPermissions = await permissionsRepository.findAllPermissions();
    const rolePermissions = await permissionsRepository.getRolePermissions(user.role);
    const userOverrides = await permissionsRepository.getUserPermissionOverrides(user.id);

    let effectivePermissions: string[];

    if (user.role === 'SUPER_ADMIN') {
      effectivePermissions = allPermissions.map((p) => p.code);
    } else {
      const permSet = new Set<string>(rolePermissions.map((p) => p.code));

      for (const override of userOverrides) {
        if (override.granted) {
          permSet.add(override.permission.code);
        } else {
          permSet.delete(override.permission.code);
        }
      }

      effectivePermissions = Array.from(permSet);
    }

    return {
      userId: user.id,
      role: user.role,
      rolePermissions: rolePermissions.map((p) => p.code),
      userOverrides: userOverrides.map((o) => ({
        code: o.permission.code,
        granted: o.granted,
      })),
      effectivePermissions,
    };
  }

  async hasPermission(
    userId: string,
    userRole: UserRole,
    requiredPermissionCode: string,
  ): Promise<boolean> {
    if (userRole === 'SUPER_ADMIN') {
      return true;
    }

    const { effectivePermissions } = await this.getUserEffectivePermissions(userId);
    return effectivePermissions.includes(requiredPermissionCode);
  }

  async assignUserPermissionOverride(
    actorUserId: string,
    targetUserId: string,
    permissionCode: string,
    granted: boolean,
    metadata: { ipAddress?: string | undefined; userAgent?: string | undefined },
  ) {
    const targetUser = await prisma.user.findFirst({
      where: {
        id: targetUserId,
        deletedAt: null,
      },
    });

    if (!targetUser) {
      throw new AppError('Target user not found', 404, 'TARGET_USER_NOT_FOUND');
    }

    const permission = await permissionsRepository.findPermissionByCode(permissionCode);
    if (!permission) {
      throw new AppError(
        `Permission with code '${permissionCode}' not found`,
        404,
        'PERMISSION_NOT_FOUND',
      );
    }

    const override = await permissionsRepository.setUserPermissionOverride(
      targetUser.id,
      permission.id,
      granted,
    );

    await prisma.auditLog.create({
      data: {
        actorUserId,
        targetUserId: targetUser.id,
        action: 'USER_PERMISSION_OVERRIDDEN',
        ipAddress: metadata.ipAddress ?? null,
        userAgent: metadata.userAgent ?? null,
        metadata: {
          permissionCode,
          granted,
        },
      },
    });

    return override;
  }

  async removeUserPermissionOverride(
    actorUserId: string,
    targetUserId: string,
    permissionCode: string,
    metadata: { ipAddress?: string | undefined; userAgent?: string | undefined },
  ) {
    const permission = await permissionsRepository.findPermissionByCode(permissionCode);
    if (!permission) {
      throw new AppError(
        `Permission with code '${permissionCode}' not found`,
        404,
        'PERMISSION_NOT_FOUND',
      );
    }

    await permissionsRepository.removeUserPermissionOverride(targetUserId, permission.id);

    await prisma.auditLog.create({
      data: {
        actorUserId,
        targetUserId,
        action: 'USER_PERMISSION_OVERRIDE_REMOVED',
        ipAddress: metadata.ipAddress ?? null,
        userAgent: metadata.userAgent ?? null,
        metadata: {
          permissionCode,
        },
      },
    });

    return { success: true };
  }
}

export const permissionsService = new PermissionsService();
