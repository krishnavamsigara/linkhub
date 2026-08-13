import { prisma } from '../../infrastructure/database/index.js';
import type { UserRole } from '../../shared/constants/roles.js';
import type { CreatePermissionDto } from './permissions.types.js';

export class PermissionsRepository {
  async findAllPermissions() {
    return prisma.permission.findMany({
      orderBy: [
        { module: 'asc' },
        { code: 'asc' },
      ],
    });
  }

  async findPermissionByCode(code: string) {
    return prisma.permission.findUnique({
      where: { code },
    });
  }

  async findPermissionsByCodes(codes: string[]) {
    return prisma.permission.findMany({
      where: {
        code: { in: codes },
      },
    });
  }

  async createPermission(data: CreatePermissionDto) {
    return prisma.permission.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description ?? null,
        module: data.module,
      },
    });
  }

  async getRolePermissions(role: UserRole) {
    const rolePerms = await prisma.rolePermission.findMany({
      where: { role },
      include: {
        permission: true,
      },
      orderBy: {
        permission: {
          code: 'asc',
        },
      },
    });

    return rolePerms.map((rp) => rp.permission);
  }

  async setRolePermissions(role: UserRole, permissionIds: string[]) {
    return prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({
        where: { role },
      });

      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            role,
            permissionId,
          })),
        });
      }

      const updated = await tx.rolePermission.findMany({
        where: { role },
        include: {
          permission: true,
        },
      });

      return updated.map((rp) => rp.permission);
    });
  }

  async getUserPermissionOverrides(userId: string) {
    return prisma.userPermission.findMany({
      where: { userId },
      include: {
        permission: true,
      },
    });
  }

  async setUserPermissionOverride(
    userId: string,
    permissionId: string,
    granted: boolean,
  ) {
    return prisma.userPermission.upsert({
      where: {
        userId_permissionId: {
          userId,
          permissionId,
        },
      },
      update: {
        granted,
      },
      create: {
        userId,
        permissionId,
        granted,
      },
      include: {
        permission: true,
      },
    });
  }

  async removeUserPermissionOverride(userId: string, permissionId: string) {
    return prisma.userPermission.deleteMany({
      where: {
        userId,
        permissionId,
      },
    });
  }
}

export const permissionsRepository = new PermissionsRepository();
