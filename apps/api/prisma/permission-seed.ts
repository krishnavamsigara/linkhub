import { prisma, disconnectDatabase } from '../src/infrastructure/database/prisma.js';
import type { PrismaClient } from '../src/generated/prisma/client.js';

export const DEFAULT_PERMISSIONS = [
  {
    code: 'users:read',
    name: 'Read Users',
    description: 'Ability to view user details and list users',
    module: 'users',
  },
  {
    code: 'users:write',
    name: 'Write Users',
    description: 'Ability to update user details',
    module: 'users',
  },
  {
    code: 'users:delete',
    name: 'Delete Users',
    description: 'Ability to delete user accounts',
    module: 'users',
  },
  {
    code: 'roles:manage',
    name: 'Manage Roles',
    description: 'Ability to assign and change user roles',
    module: 'roles',
  },
  {
    code: 'permissions:manage',
    name: 'Manage Permissions',
    description: 'Ability to manage role and user permissions',
    module: 'permissions',
  },
  {
    code: 'links:create',
    name: 'Create Links',
    description: 'Ability to create short links',
    module: 'links',
  },
  {
    code: 'links:read',
    name: 'Read Links',
    description: 'Ability to view link details',
    module: 'links',
  },
  {
    code: 'links:update',
    name: 'Update Links',
    description: 'Ability to update link details',
    module: 'links',
  },
  {
    code: 'links:delete',
    name: 'Delete Links',
    description: 'Ability to delete links',
    module: 'links',
  },
  {
    code: 'analytics:read',
    name: 'Read Analytics',
    description: 'Ability to view link analytics',
    module: 'analytics',
  },
] as const;

export const DEFAULT_ROLE_PERMISSIONS = {
  SUPER_ADMIN: [
    'users:read',
    'users:write',
    'users:delete',
    'roles:manage',
    'permissions:manage',
    'links:create',
    'links:read',
    'links:update',
    'links:delete',
    'analytics:read',
  ],
  ADMIN: [
    'users:read',
    'users:write',
    'links:create',
    'links:read',
    'links:update',
    'links:delete',
    'analytics:read',
  ],
  USER: [
    'links:create',
    'links:read',
    'links:update',
    'links:delete',
  ],
} as const;

export async function seedPermissions(client: PrismaClient = prisma) {
  console.log('Seeding default permissions...');

  const createdPermissionsMap = new Map<string, string>();

  for (const perm of DEFAULT_PERMISSIONS) {
    const record = await client.permission.upsert({
      where: { code: perm.code },
      update: {
        name: perm.name,
        description: perm.description,
        module: perm.module,
      },
      create: {
        code: perm.code,
        name: perm.name,
        description: perm.description,
        module: perm.module,
      },
    });
    createdPermissionsMap.set(record.code, record.id);
  }

  for (const [role, permCodes] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    const roleEnum = role as 'SUPER_ADMIN' | 'ADMIN' | 'USER';

    for (const code of permCodes) {
      const permissionId = createdPermissionsMap.get(code);
      if (!permissionId) continue;

      await client.rolePermission.upsert({
        where: {
          role_permissionId: {
            role: roleEnum,
            permissionId,
          },
        },
        update: {},
        create: {
          role: roleEnum,
          permissionId,
        },
      });
    }
  }

  console.log('Default permissions seeded successfully.');
}

if (process.argv[1]?.includes('permission-seed.ts')) {
  seedPermissions()
    .catch((err) => {
      console.error('Failed to seed permissions:', err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await disconnectDatabase();
    });
}
