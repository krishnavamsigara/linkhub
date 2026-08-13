import type { UserRole } from '../../shared/constants/roles.js';

export interface PermissionDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  module: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePermissionDto {
  code: string;
  name: string;
  description?: string | undefined;
  module: string;
}

export interface UpdateRolePermissionsDto {
  permissionCodes: string[];
}

export interface AssignUserPermissionDto {
  permissionCode: string;
  granted?: boolean;
}

export interface UserPermissionOverrideDto {
  permissionId: string;
  code: string;
  name: string;
  granted: boolean;
}

export interface EffectivePermissionsResult {
  userId: string;
  role: UserRole;
  rolePermissions: string[];
  userOverrides: {
    code: string;
    granted: boolean;
  }[];
  effectivePermissions: string[];
}
