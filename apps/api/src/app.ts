import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import hpp from 'hpp';
import cookieParser from 'cookie-parser';
import pinoHttpModule from 'pino-http';

const pinoHttp = pinoHttpModule.default ?? pinoHttpModule;

import { env } from './config/index.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { notFoundMiddleware } from './middleware/not-found.middleware.js';
import { requestIdMiddleware } from './middleware/request-id.middleware.js';
import { sanitizeInputs } from './middleware/sanitizer.middleware.js';
import { validateHostHeader } from './middleware/host-validation.middleware.js';
import {
  globalRateLimiter,
  redirectRateLimiter,
} from './middleware/rate-limit.middleware.js';

import { healthRouter } from './modules/health/index.js';
import { userRouter } from './modules/users/index.js';
import { adminRouter } from './modules/admin/index.js';
import { authRouter } from './modules/auth/index.js';
import { oauthRouter } from './modules/oauth/index.js';
import { permissionRouter } from './modules/permissions/index.js';
import { profileRouter } from './modules/profile/index.js';
import { linkRouter, linkController } from './modules/links/index.js';
import { paymentRouter, subscriptionRouter } from './modules/payments/payment.routes.js';
import { themeRouter } from './modules/themes/theme.routes.js';

export const createApp = (): Express => {
  const app = express();

  app.disable('x-powered-by');

  // Trust reverse proxies (nginx / cloudflare / load balancers)
  app.set('trust proxy', 1);

  app.use(
    pinoHttp({
      level: env.LOG_LEVEL,
    }),
  );

  app.use(requestIdMiddleware);
  app.use(validateHostHeader);
  app.use(cookieParser());

  // Enhanced Helmet Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      frameguard: { action: 'deny' },
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );

  // CORS Hardening
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // HTTP Parameter Pollution protection
  app.use(hpp());

  // Input Sanitization (XSS & SQLi Defense-in-depth)
  app.use(sanitizeInputs);

  // Apply Global Rate Limiter to API routes
  app.use('/api/v1', globalRateLimiter);

  app.get('/', (_req, res) => {
    res.json({
      success: true,
      message: 'LinkHub API',
    });
  });

  // Shortcode public redirect route (/r/:shortCode) with DDoS/Bot Rate Limiting
  app.get('/r/:shortCode', redirectRateLimiter, (req, res, next) =>
    linkController.handleRedirect(req, res, next),
  );

  app.use('/api/v1/health', healthRouter);
  app.use('/api/v1/users', userRouter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/admin', adminRouter);
  app.use('/api/v1/oauth', oauthRouter);
  app.use('/api/v1/permissions', permissionRouter);
  app.use('/api/v1/profile', profileRouter);
  app.use('/api/v1/links', linkRouter);
  app.use('/api/v1/payments', paymentRouter);
  app.use('/api/v1/subscription', subscriptionRouter);
  app.use('/api/v1/themes', themeRouter);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
};
