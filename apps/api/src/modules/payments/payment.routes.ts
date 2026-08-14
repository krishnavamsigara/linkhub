import { Router, type RequestHandler } from 'express';
import express from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';
import { paymentController } from './payment.controller.js';

export const paymentRouter: Router = Router();
export const subscriptionRouter: Router = Router();

// ─── Payment Routes (/api/v1/payments) ──────────────────────────────────────

paymentRouter.post(
  '/create-order',
  requireAuth,
  (req, res, next) => paymentController.createOrder(req, res, next),
);

paymentRouter.post(
  '/verify-payment',
  requireAuth,
  (req, res, next) => paymentController.verifyPayment(req, res, next),
);

// Webhook uses raw body parsing — bypasses JSON middleware
// express.raw() is applied per-route so it doesn't affect other routes
paymentRouter.post(
  '/webhook',
  express.raw({ type: 'application/json' }) as RequestHandler,
  (req, res, next) => paymentController.handleWebhook(req, res, next),
);

// ─── Subscription Routes (/api/v1/subscription) ──────────────────────────────

subscriptionRouter.get(
  '/me',
  requireAuth,
  (req, res, next) => paymentController.getSubscriptionStatus(req, res, next),
);
