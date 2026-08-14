import type { Request, Response, NextFunction } from 'express';

import { AppError } from '../../shared/errors/app-error.js';
import { paymentService } from './payment.service.js';
import type { CreateOrderInput, VerifyPaymentInput } from './payment.types.js';

export class PaymentController {
  // POST /api/v1/payments/create-order
  async createOrder(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const input: CreateOrderInput = {
        amount: req.body.amount,
        currency: req.body.currency,
        notes: req.body.notes,
      };

      const order = await paymentService.createOrder(userId, input);

      res.status(201).json({
        success: true,
        message: 'Razorpay order created successfully',
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/payments/verify-payment
  async verifyPayment(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
        req.body as Record<string, string>;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        throw new AppError(
          'razorpay_order_id, razorpay_payment_id, and razorpay_signature are required',
          400,
          'MISSING_PAYMENT_FIELDS',
        );
      }

      const input: VerifyPaymentInput = {
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
      };

      const result = await paymentService.verifyPayment(userId, input);

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/payments/webhook  (raw body required - no JSON parsing)
  async handleWebhook(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const signature = req.headers['x-razorpay-signature'] as string;

      if (!signature) {
        throw new AppError(
          'Missing X-Razorpay-Signature header',
          400,
          'WEBHOOK_MISSING_SIGNATURE',
        );
      }

      // req.body is a raw Buffer here (route uses express.raw())
      const rawBody: Buffer = req.body as Buffer;

      const result = await paymentService.handleWebhook(rawBody, signature);

      res.json({
        success: true,
        processed: result.processed,
        event: result.event,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/subscription/me
  async getSubscriptionStatus(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const status = await paymentService.getSubscriptionStatus(userId);

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const paymentController = new PaymentController();
