export const PERMISSIONS = {
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  USERS_DELETE: 'users:delete',
  ROLES_MANAGE: 'roles:manage',
  PERMISSIONS_MANAGE: 'permissions:manage',
  LINKS_CREATE: 'links:create',
  LINKS_READ: 'links:read',
  LINKS_UPDATE: 'links:update',
  LINKS_DELETE: 'links:delete',
  ANALYTICS_READ: 'analytics:read',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
