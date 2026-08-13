import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requirePermission } from '../../src/middleware/permission.middleware.js';
import { PERMISSIONS } from '../../src/modules/permissions/permissions.constants.js';
import { AppError } from '../../src/shared/errors/app-error.js';

describe('requirePermission Middleware', () => {
  it('should pass AppError(401, UNAUTHENTICATED) to next if req.user is missing', async () => {
    const middleware = requirePermission(PERMISSIONS.USERS_READ);

    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const errorArg = (next as any).mock.calls[0][0];
    expect(errorArg).toBeInstanceOf(AppError);
    expect(errorArg.statusCode).toBe(401);
    expect(errorArg.code).toBe('UNAUTHENTICATED');
  });
});
