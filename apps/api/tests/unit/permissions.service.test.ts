import { describe, it, expect } from 'vitest';
import { permissionsService } from '../../src/modules/permissions/permissions.service.js';
import { PERMISSIONS } from '../../src/modules/permissions/permissions.constants.js';

describe('Permissions Constants & Module Definitions', () => {
  it('should define core permissions with module prefix format', () => {
    expect(PERMISSIONS.USERS_READ).toBe('users:read');
    expect(PERMISSIONS.USERS_WRITE).toBe('users:write');
    expect(PERMISSIONS.ROLES_MANAGE).toBe('roles:manage');
    expect(PERMISSIONS.PERMISSIONS_MANAGE).toBe('permissions:manage');
    expect(PERMISSIONS.LINKS_CREATE).toBe('links:create');
  });
});

describe('PermissionsService DB Integration', () => {
  it('should retrieve all seeded system permissions', async () => {
    const all = await permissionsService.getAllPermissions();
    expect(Array.isArray(all)).toBe(true);
    expect(all.length).toBeGreaterThan(0);

    const codes = all.map((p) => p.code);
    expect(codes).toContain('users:read');
    expect(codes).toContain('links:create');
    expect(codes).toContain('permissions:manage');
  });

  it('should return role permissions for default roles', async () => {
    const userPerms = await permissionsService.getRolePermissions('USER');
    const userCodes = userPerms.map((p) => p.code);
    expect(userCodes).toContain('links:create');
    expect(userCodes).not.toContain('permissions:manage');

    const adminPerms = await permissionsService.getRolePermissions('ADMIN');
    const adminCodes = adminPerms.map((p) => p.code);
    expect(adminCodes).toContain('users:read');
    expect(adminCodes).toContain('links:create');
  });
});
