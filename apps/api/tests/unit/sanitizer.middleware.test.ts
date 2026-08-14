import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { sanitizeInputs } from '../../src/middleware/sanitizer.middleware.js';

describe('SanitizerMiddleware', () => {
  it('should strip XSS script tags from request body', () => {
    const req = {
      body: {
        bio: 'Hello <script>alert("xss")</script> World',
        title: 'Safe Title',
      },
    } as unknown as Request;

    const res = {} as Response;
    const next: NextFunction = vi.fn();

    sanitizeInputs(req, res, next);

    expect(req.body.bio).toBe('Hello  World');
    expect(req.body.title).toBe('Safe Title');
    expect(next).toHaveBeenCalled();
  });

  it('should strip SQL injection keywords from query parameters', () => {
    const req = {
      query: {
        search: "admin' UNION SELECT * FROM users--",
      },
    } as unknown as Request;

    const res = {} as Response;
    const next: NextFunction = vi.fn();

    sanitizeInputs(req, res, next);

    expect(req.query.search).toBe("admin'  * FROM users--");
    expect(next).toHaveBeenCalled();
  });

  it('should prevent prototype pollution in request body', () => {
    const req = {
      body: {
        __proto__: { admin: true },
        normal: 'data',
      },
    } as unknown as Request;

    const res = {} as Response;
    const next: NextFunction = vi.fn();

    sanitizeInputs(req, res, next);

    expect(req.body.__proto__).not.toHaveProperty('admin');
    expect(req.body.normal).toBe('data');
    expect(next).toHaveBeenCalled();
  });
});
