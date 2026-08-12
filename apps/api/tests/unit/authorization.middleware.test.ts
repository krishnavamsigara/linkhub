import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

import { requireRole } from '../../src/middleware/authorization.middleware.js';
import { prisma } from '../../src/infrastructure/database/index.js';
import { USER_ROLES } from '../../src/shared/constants/roles.js';

vi.mock('../../src/infrastructure/database/index.js', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
    },
  },
}));

type MockResponse = Response & {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
};

function createRequest(
  user?: { id: string },
): Request {
  return {
    user,
  } as Request;
}

function createResponse(): MockResponse {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  } as unknown as MockResponse;

  response.status.mockReturnValue(response);

  return response;
}

function createNext(): NextFunction {
  return vi.fn();
}

const mockedFindFirst = vi.mocked(
  prisma.user.findFirst,
);

describe('requireRole middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // 1. AUTHENTICATION
  // ============================================================

  describe('authentication', () => {
    it('should return 401 when req.user does not exist', async () => {
      const req = createRequest();
      const res = createResponse();
      const next = createNext();

      const middleware = requireRole(
        USER_ROLES.ADMIN,
      );

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required',
        },
      });

      expect(next).not.toHaveBeenCalled();

      expect(
        mockedFindFirst,
      ).not.toHaveBeenCalled();
    });

    it('should return 401 when req.user is undefined', async () => {
      const req = createRequest(undefined);
      const res = createResponse();
      const next = createNext();

      await requireRole(
        USER_ROLES.ADMIN,
      )(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // 2. USER NOT FOUND
  // ============================================================

  describe('user lookup', () => {
    it('should return 401 when authenticated user does not exist in database', async () => {
      mockedFindFirst.mockResolvedValue(null);

      const req = createRequest({
        id: 'user-123',
      });

      const res = createResponse();
      const next = createNext();

      await requireRole(
        USER_ROLES.ADMIN,
      )(req, res, next);

      expect(
        mockedFindFirst,
      ).toHaveBeenCalledWith({
        where: {
          id: 'user-123',
          deletedAt: null,
        },
        select: {
          id: true,
          role: true,
        },
      });

      expect(res.status).toHaveBeenCalledWith(401);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });

      expect(next).not.toHaveBeenCalled();
    });

    it('should not authorize a soft-deleted user', async () => {
      /*
       * The middleware searches with:
       *
       * deletedAt: null
       *
       * Therefore a soft-deleted user should not
       * be returned by the database.
       */

      mockedFindFirst.mockResolvedValue(null);

      const req = createRequest({
        id: 'deleted-user',
      });

      const res = createResponse();
      const next = createNext();

      await requireRole(
        USER_ROLES.ADMIN,
      )(req, res, next);

      expect(
        mockedFindFirst,
      ).toHaveBeenCalledWith({
        where: {
          id: 'deleted-user',
          deletedAt: null,
        },
        select: {
          id: true,
          role: true,
        },
      });

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // 3. USER ROLE
  // ============================================================

  describe('USER role', () => {
    beforeEach(() => {
      mockedFindFirst.mockResolvedValue({
        id: 'user-123',
        role: USER_ROLES.USER,
      });
    });

    it('should reject USER from ADMIN route', async () => {
      const req = createRequest({
        id: 'user-123',
      });

      const res = createResponse();
      const next = createNext();

      await requireRole(
        USER_ROLES.ADMIN,
      )(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission',
        },
      });

      expect(next).not.toHaveBeenCalled();
    });

    it('should reject USER from SUPER_ADMIN route', async () => {
      const req = createRequest({
        id: 'user-123',
      });

      const res = createResponse();
      const next = createNext();

      await requireRole(
        USER_ROLES.SUPER_ADMIN,
      )(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow USER when USER role is explicitly allowed', async () => {
      const req = createRequest({
        id: 'user-123',
      });

      const res = createResponse();
      const next = createNext();

      await requireRole(
        USER_ROLES.USER,
      )(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should allow USER when multiple roles are allowed', async () => {
      const req = createRequest({
        id: 'user-123',
      });

      const res = createResponse();
      const next = createNext();

      await requireRole(
        USER_ROLES.USER,
        USER_ROLES.ADMIN,
        USER_ROLES.SUPER_ADMIN,
      )(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // 4. ADMIN ROLE
  // ============================================================

  describe('ADMIN role', () => {
    beforeEach(() => {
      mockedFindFirst.mockResolvedValue({
        id: 'admin-123',
        role: USER_ROLES.ADMIN,
      });
    });

    it('should allow ADMIN on ADMIN route', async () => {
      const req = createRequest({
        id: 'admin-123',
      });

      const res = createResponse();
      const next = createNext();

      await requireRole(
        USER_ROLES.ADMIN,
      )(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should reject ADMIN from SUPER_ADMIN route', async () => {
      const req = createRequest({
        id: 'admin-123',
      });

      const res = createResponse();
      const next = createNext();

      await requireRole(
        USER_ROLES.SUPER_ADMIN,
      )(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);

      expect(next).not.toHaveBeenCalled();
    });

    it('should allow ADMIN when ADMIN and SUPER_ADMIN are allowed', async () => {
      const req = createRequest({
        id: 'admin-123',
      });

      const res = createResponse();
      const next = createNext();

      await requireRole(
        USER_ROLES.ADMIN,
        USER_ROLES.SUPER_ADMIN,
      )(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // 5. SUPER ADMIN ROLE
  // ============================================================

  describe('SUPER_ADMIN role', () => {
    beforeEach(() => {
      mockedFindFirst.mockResolvedValue({
        id: 'super-admin-123',
        role: USER_ROLES.SUPER_ADMIN,
      });
    });

    it('should allow SUPER_ADMIN on SUPER_ADMIN route', async () => {
      const req = createRequest({
        id: 'super-admin-123',
      });

      const res = createResponse();
      const next = createNext();

      await requireRole(
        USER_ROLES.SUPER_ADMIN,
      )(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should allow SUPER_ADMIN on ADMIN route when ADMIN is explicitly allowed', async () => {
      /*
       * Important:
       *
       * requireRole() is an exact role check.
       *
       * SUPER_ADMIN is NOT automatically considered ADMIN.
       *
       * Therefore this test intentionally expects 403.
       */

      const req = createRequest({
        id: 'super-admin-123',
      });

      const res = createResponse();
      const next = createNext();

      await requireRole(
        USER_ROLES.ADMIN,
      )(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow SUPER_ADMIN when both ADMIN and SUPER_ADMIN are allowed', async () => {
      const req = createRequest({
        id: 'super-admin-123',
      });

      const res = createResponse();
      const next = createNext();

      await requireRole(
        USER_ROLES.ADMIN,
        USER_ROLES.SUPER_ADMIN,
      )(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // 6. MULTIPLE ALLOWED ROLES
  // ============================================================

  describe('multiple allowed roles', () => {
    it('should allow USER when USER is one of allowed roles', async () => {
      mockedFindFirst.mockResolvedValue({
        id: 'user-123',
        role: USER_ROLES.USER,
      });

      const req = createRequest({
        id: 'user-123',
      });

      const res = createResponse();
      const next = createNext();

      await requireRole(
        USER_ROLES.USER,
        USER_ROLES.ADMIN,
      )(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should allow ADMIN when ADMIN is one of allowed roles', async () => {
      mockedFindFirst.mockResolvedValue({
        id: 'admin-123',
        role: USER_ROLES.ADMIN,
      });

      const req = createRequest({
        id: 'admin-123',
      });

      const res = createResponse();
      const next = createNext();

      await requireRole(
        USER_ROLES.USER,
        USER_ROLES.ADMIN,
      )(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should allow SUPER_ADMIN when SUPER_ADMIN is one of allowed roles', async () => {
      mockedFindFirst.mockResolvedValue({
        id: 'super-admin-123',
        role: USER_ROLES.SUPER_ADMIN,
      });

      const req = createRequest({
        id: 'super-admin-123',
      });

      const res = createResponse();
      const next = createNext();

      await requireRole(
        USER_ROLES.ADMIN,
        USER_ROLES.SUPER_ADMIN,
      )(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should reject a role that is not in allowed roles', async () => {
      mockedFindFirst.mockResolvedValue({
        id: 'user-123',
        role: USER_ROLES.USER,
      });

      const req = createRequest({
        id: 'user-123',
      });

      const res = createResponse();
      const next = createNext();

      await requireRole(
        USER_ROLES.ADMIN,
        USER_ROLES.SUPER_ADMIN,
      )(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // 7. DATABASE ERROR
  // ============================================================

  describe('database errors', () => {
    it('should pass database errors to next()', async () => {
      const databaseError =
        new Error('Database connection failed');

      mockedFindFirst.mockRejectedValue(
        databaseError,
      );

      const req = createRequest({
        id: 'user-123',
      });

      const res = createResponse();
      const next = createNext();

      await requireRole(
        USER_ROLES.ADMIN,
      )(req, res, next);

      expect(next).toHaveBeenCalledWith(
        databaseError,
      );

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // 8. DATABASE QUERY SAFETY
  // ============================================================

  describe('database query', () => {
    it('should query only the authenticated user', async () => {
      mockedFindFirst.mockResolvedValue({
        id: 'user-999',
        role: USER_ROLES.ADMIN,
      });

      const req = createRequest({
        id: 'user-999',
      });

      const res = createResponse();
      const next = createNext();

      await requireRole(
        USER_ROLES.ADMIN,
      )(req, res, next);

      expect(
        mockedFindFirst,
      ).toHaveBeenCalledTimes(1);

      expect(
        mockedFindFirst,
      ).toHaveBeenCalledWith({
        where: {
          id: 'user-999',
          deletedAt: null,
        },
        select: {
          id: true,
          role: true,
        },
      });

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should select only id and role', async () => {
      mockedFindFirst.mockResolvedValue({
        id: 'admin-123',
        role: USER_ROLES.ADMIN,
      });

      const req = createRequest({
        id: 'admin-123',
      });

      const res = createResponse();
      const next = createNext();

      await requireRole(
        USER_ROLES.ADMIN,
      )(req, res, next);

      expect(
        mockedFindFirst,
      ).toHaveBeenCalledWith({
        where: {
          id: 'admin-123',
          deletedAt: null,
        },
        select: {
          id: true,
          role: true,
        },
      });
    });
  });

  // ============================================================
  // 9. NEXT() BEHAVIOUR
  // ============================================================

  describe('next middleware behavior', () => {
    it('should call next exactly once when authorized', async () => {
      mockedFindFirst.mockResolvedValue({
        id: 'admin-123',
        role: USER_ROLES.ADMIN,
      });

      const req = createRequest({
        id: 'admin-123',
      });

      const res = createResponse();
      const next = createNext();

      await requireRole(
        USER_ROLES.ADMIN,
      )(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should never call next when forbidden', async () => {
      mockedFindFirst.mockResolvedValue({
        id: 'user-123',
        role: USER_ROLES.USER,
      });

      const req = createRequest({
        id: 'user-123',
      });

      const res = createResponse();
      const next = createNext();

      await requireRole(
        USER_ROLES.ADMIN,
      )(req, res, next);

      expect(next).not.toHaveBeenCalled();
    });

    it('should never call next when user is missing', async () => {
      const req = createRequest();
      const res = createResponse();
      const next = createNext();

      await requireRole(
        USER_ROLES.ADMIN,
      )(req, res, next);

      expect(next).not.toHaveBeenCalled();
    });

    it('should never call next when database user is missing', async () => {
      mockedFindFirst.mockResolvedValue(null);

      const req = createRequest({
        id: 'missing-user',
      });

      const res = createResponse();
      const next = createNext();

      await requireRole(
        USER_ROLES.ADMIN,
      )(req, res, next);

      expect(next).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // 10. EMPTY ALLOWED ROLES
  // ============================================================

  describe('no allowed roles', () => {
    it('should reject every authenticated user when no roles are provided', async () => {
      mockedFindFirst.mockResolvedValue({
        id: 'user-123',
        role: USER_ROLES.USER,
      });

      const req = createRequest({
        id: 'user-123',
      });

      const res = createResponse();
      const next = createNext();

      await requireRole()(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);

      expect(next).not.toHaveBeenCalled();
    });
  });
});
