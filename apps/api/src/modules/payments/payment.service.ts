import crypto from 'node:crypto';

import Razorpay from 'razorpay';

import { env } from '../../config/index.js';
import { AppError } from '../../shared/errors/app-error.js';
import { cacheService, redisKeys, CACHE_TTL } from '../../infrastructure/redis/index.js';
import { paymentRepository } from './payment.repository.js';
import type {
  CreateOrderInput,
  CreateOrderResponse,
  SubscriptionStatusResponse,
  VerifyPaymentInput,
  RazorpayWebhookPayload,
} from './payment.types.js';

const FREE_PLAN_LINK_LIMIT = 5;
const PRO_SUBSCRIPTION_AMOUNT = 4900; // ₹49 in paise
const PRO_SUBSCRIPTION_PERIOD_DAYS = 365; // 1 year

// Lazy-init Razorpay instance
let _razorpay: Razorpay | null = null;

function getRazorpay(): Razorpay {
  if (!_razorpay) {
    _razorpay = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }
  return _razorpay;
}

export class PaymentService {
  // ─── Create Razorpay Order ──────────────────────────────────────────────

  async createOrder(
    userId: string,
    input: CreateOrderInput = {},
  ): Promise<CreateOrderResponse> {
    const amount = input.amount ?? PRO_SUBSCRIPTION_AMOUNT;
    const currency = input.currency ?? 'INR';

    const razorpay = getRazorpay();

    const rzpOrder = await razorpay.orders.create({
      amount,
      currency,
      notes: {
        userId,
        purpose: 'PRO_SUBSCRIPTION',
        ...(input.notes ? { notes: input.notes } : {}),
      },
    });

    const order = await paymentRepository.createPaymentOrder({
      userId,
      razorpayOrderId: rzpOrder.id,
      amount,
      currency,
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    });

    return {
      orderId: order.id,
      razorpayOrderId: rzpOrder.id,
      amount,
      currency,
      keyId: env.RAZORPAY_KEY_ID,
    };
  }

  // ─── Verify Payment Signature (Client-Side Checkout) ───────────────────

  async verifyPayment(
    userId: string,
    input: VerifyPaymentInput,
  ): Promise<{ success: boolean; message: string }> {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = input;

    // 1. Validate the order belongs to this user
    const order =
      await paymentRepository.findPaymentOrderByRazorpayOrderId(razorpayOrderId);

    if (!order) {
      throw new AppError('Payment order not found', 404, 'ORDER_NOT_FOUND');
    }

    if (order.userId !== userId) {
      throw new AppError('Forbidden', 403, 'FORBIDDEN');
    }

    if (order.status === 'PAID') {
      throw new AppError(
        'Payment already processed',
        409,
        'PAYMENT_ALREADY_PROCESSED',
      );
    }

    // 2. Verify HMAC SHA256 signature
    const expectedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      // Mark order as failed
      await paymentRepository.updatePaymentOrder(razorpayOrderId, {
        status: 'FAILED',
        razorpayPaymentId,
        razorpaySignature,
      });

      throw new AppError(
        'Payment signature verification failed',
        400,
        'PAYMENT_SIGNATURE_INVALID',
      );
    }

    // 3. Mark order as PAID
    await paymentRepository.updatePaymentOrder(razorpayOrderId, {
      status: 'PAID',
      razorpayPaymentId,
      razorpaySignature,
    });

    // 4. Upgrade subscription to PRO (1 year from now)
    const periodEnd = new Date(
      Date.now() + PRO_SUBSCRIPTION_PERIOD_DAYS * 24 * 60 * 60 * 1000,
    );
    await paymentRepository.upgradeToPro(userId, periodEnd);

    // Invalidate cached subscription status
    await cacheService.del(redisKeys.userSubscription(userId));

    return {
      success: true,
      message:
        'Payment verified successfully. Your subscription has been upgraded to PRO!',
    };
  }

  // ─── Webhook Handler (Production-Grade) ────────────────────────────────

  async handleWebhook(
    rawBody: Buffer,
    signature: string,
  ): Promise<{ processed: boolean; event: string }> {
    // 1. Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new AppError(
        'Invalid webhook signature',
        400,
        'WEBHOOK_SIGNATURE_INVALID',
      );
    }

    const payload: RazorpayWebhookPayload = JSON.parse(rawBody.toString());
    const event = payload.event;

    // 2. Handle events
    switch (event) {
      case 'payment.captured':
      case 'order.paid': {
        const paymentEntity = payload.payload?.payment?.entity;

        if (!paymentEntity) break;

        const { order_id: orderId, id: paymentId } = paymentEntity;
        const userId = paymentEntity.notes?.userId;

        if (!userId || !orderId) break;

        // Idempotency: check if already processed
        const existingOrder =
          await paymentRepository.findPaymentOrderByRazorpayOrderId(orderId);

        if (existingOrder && existingOrder.status !== 'PAID') {
          await paymentRepository.updatePaymentOrder(orderId, {
            status: 'PAID',
            razorpayPaymentId: paymentId,
          });

          const periodEnd = new Date(
            Date.now() + PRO_SUBSCRIPTION_PERIOD_DAYS * 24 * 60 * 60 * 1000,
          );
          await paymentRepository.upgradeToPro(userId, periodEnd);

          // Invalidate cached subscription status
          await cacheService.del(redisKeys.userSubscription(userId));
        }
        break;
      }

      case 'payment.failed': {
        const paymentEntity = payload.payload?.payment?.entity;

        if (!paymentEntity) break;

        const { order_id: orderId, id: paymentId } = paymentEntity;

        if (!orderId) break;

        await paymentRepository.updatePaymentOrder(orderId, {
          status: 'FAILED',
          razorpayPaymentId: paymentId,
        });
        break;
      }

      default:
        // Unhandled event — log and acknowledge
        break;
    }

    return { processed: true, event };
  }

  // ─── Subscription Status ────────────────────────────────────────────────

  async getSubscriptionStatus(
    userId: string,
  ): Promise<SubscriptionStatusResponse> {
    const cacheKey = redisKeys.userSubscription(userId);

    return cacheService.getOrSet<SubscriptionStatusResponse>(
      cacheKey,
      async () => {
        // Ensure the user has a subscription row (lazily create FREE)
        const subscription =
          await paymentRepository.ensureFreeSubscription(userId);

        const linksUsed = await paymentRepository.countUserLinks(userId);
        const isPro = subscription.plan === 'PRO';

        return {
          plan: subscription.plan,
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelledAt: subscription.cancelledAt,
          features: {
            maxLinks: isPro ? null : FREE_PLAN_LINK_LIMIT,
            analyticsAccess: isPro,
            customThemes: isPro,
          },
          usage: {
            linksUsed,
          },
        };
      },
      CACHE_TTL.USER_SUBSCRIPTION,
    );
  }
}

export const paymentService = new PaymentService();

// Export limit constant for use in guards
export { FREE_PLAN_LINK_LIMIT };

