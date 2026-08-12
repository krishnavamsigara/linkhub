export const USER_ROLES = {
  USER: 'USER',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const;

export type UserRole =
  (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const ADMIN_ROLES: UserRole[] = [
  USER_ROLES.ADMIN,
  USER_ROLES.SUPER_ADMIN,
];

export const ALL_ROLES: UserRole[] = [
  USER_ROLES.USER,
  USER_ROLES.ADMIN,
  USER_ROLES.SUPER_ADMIN,
];
