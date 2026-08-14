import crypto from 'node:crypto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { paymentService } from '../../src/modules/payments/payment.service.js';
import { paymentRepository } from '../../src/modules/payments/payment.repository.js';
import { env } from '../../src/config/index.js';
import { AppError } from '../../src/shared/errors/app-error.js';

vi.mock('../../src/modules/payments/payment.repository.js');

describe('PaymentService', () => {
  const mockUserId = '11111111-1111-1111-1111-111111111111';
  const mockOrderId = 'order_test_123';
  const mockPaymentId = 'pay_test_456';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('verifyPayment', () => {
    it('should successfully verify payment with valid HMAC signature and upgrade user to PRO', async () => {
      // Calculate valid signature using test secret
      const validSignature = crypto
        .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
        .update(`${mockOrderId}|${mockPaymentId}`)
        .digest('hex');

      vi.mocked(paymentRepository.findPaymentOrderByRazorpayOrderId).mockResolvedValue({
        id: 'order-db-id',
        userId: mockUserId,
        razorpayOrderId: mockOrderId,
        razorpayPaymentId: null,
        razorpaySignature: null,
        amount: 49900,
        currency: 'INR',
        status: 'CREATED',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(paymentRepository.updatePaymentOrder).mockResolvedValue({
        id: 'order-db-id',
        userId: mockUserId,
        razorpayOrderId: mockOrderId,
        razorpayPaymentId: mockPaymentId,
        razorpaySignature: validSignature,
        amount: 49900,
        currency: 'INR',
        status: 'PAID',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(paymentRepository.upgradeToPro).mockResolvedValue({
        id: 'sub-pro-id',
        userId: mockUserId,
        plan: 'PRO',
        status: 'ACTIVE',
        razorpaySubscriptionId: null,
        razorpayCustomerId: null,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 86400000),
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await paymentService.verifyPayment(mockUserId, {
        razorpayOrderId: mockOrderId,
        razorpayPaymentId: mockPaymentId,
        razorpaySignature: validSignature,
      });

      expect(result.success).toBe(true);
      expect(paymentRepository.updatePaymentOrder).toHaveBeenCalledWith(
        mockOrderId,
        expect.objectContaining({ status: 'PAID' }),
      );
      expect(paymentRepository.upgradeToPro).toHaveBeenCalledWith(
        mockUserId,
        expect.any(Date),
      );
    });

    it('should throw AppError 400 when HMAC signature is invalid', async () => {
      vi.mocked(paymentRepository.findPaymentOrderByRazorpayOrderId).mockResolvedValue({
        id: 'order-db-id',
        userId: mockUserId,
        razorpayOrderId: mockOrderId,
        razorpayPaymentId: null,
        razorpaySignature: null,
        amount: 49900,
        currency: 'INR',
        status: 'CREATED',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        paymentService.verifyPayment(mockUserId, {
          razorpayOrderId: mockOrderId,
          razorpayPaymentId: mockPaymentId,
          razorpaySignature: 'invalid_forged_signature',
        }),
      ).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 400,
          code: 'PAYMENT_SIGNATURE_INVALID',
        }),
      );

      expect(paymentRepository.updatePaymentOrder).toHaveBeenCalledWith(
        mockOrderId,
        expect.objectContaining({ status: 'FAILED' }),
      );
      expect(paymentRepository.upgradeToPro).not.toHaveBeenCalled();
    });

    it('should throw AppError 403 if order belongs to another user', async () => {
      vi.mocked(paymentRepository.findPaymentOrderByRazorpayOrderId).mockResolvedValue({
        id: 'order-db-id',
        userId: 'other-user-id',
        razorpayOrderId: mockOrderId,
        razorpayPaymentId: null,
        razorpaySignature: null,
        amount: 49900,
        currency: 'INR',
        status: 'CREATED',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        paymentService.verifyPayment(mockUserId, {
          razorpayOrderId: mockOrderId,
          razorpayPaymentId: mockPaymentId,
          razorpaySignature: 'sig',
        }),
      ).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 403,
          code: 'FORBIDDEN',
        }),
      );
    });
  });

  describe('handleWebhook', () => {
    it('should verify webhook signature and upgrade subscription asynchronously on payment.captured event', async () => {
      const payload = {
        entity: 'event',
        account_id: 'acc_123',
        event: 'payment.captured' as const,
        contains: ['payment'],
        payload: {
          payment: {
            entity: {
              id: mockPaymentId,
              order_id: mockOrderId,
              status: 'captured',
              amount: 49900,
              currency: 'INR',
              notes: {
                userId: mockUserId,
              },
            },
          },
        },
      };

      const rawBody = Buffer.from(JSON.stringify(payload));
      const validWebhookSignature = crypto
        .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');

      vi.mocked(paymentRepository.findPaymentOrderByRazorpayOrderId).mockResolvedValue({
        id: 'order-db-id',
        userId: mockUserId,
        razorpayOrderId: mockOrderId,
        razorpayPaymentId: null,
        razorpaySignature: null,
        amount: 49900,
        currency: 'INR',
        status: 'CREATED',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await paymentService.handleWebhook(rawBody, validWebhookSignature);

      expect(result.processed).toBe(true);
      expect(result.event).toBe('payment.captured');
      expect(paymentRepository.updatePaymentOrder).toHaveBeenCalledWith(
        mockOrderId,
        expect.objectContaining({ status: 'PAID' }),
      );
      expect(paymentRepository.upgradeToPro).toHaveBeenCalledWith(
        mockUserId,
        expect.any(Date),
      );
    });

    it('should reject webhook with invalid signature', async () => {
      const rawBody = Buffer.from(JSON.stringify({ event: 'payment.captured' }));

      await expect(
        paymentService.handleWebhook(rawBody, 'invalid_sig'),
      ).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 400,
          code: 'WEBHOOK_SIGNATURE_INVALID',
        }),
      );
    });
  });

  describe('getSubscriptionStatus', () => {
    it('should return FREE limits and usage for free plan user', async () => {
      vi.mocked(paymentRepository.ensureFreeSubscription).mockResolvedValue({
        id: 'sub-1',
        userId: mockUserId,
        plan: 'FREE',
        status: 'ACTIVE',
        razorpaySubscriptionId: null,
        razorpayCustomerId: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(paymentRepository.countUserLinks).mockResolvedValue(3);

      const status = await paymentService.getSubscriptionStatus(mockUserId);

      expect(status.plan).toBe('FREE');
      expect(status.features.maxLinks).toBe(5);
      expect(status.features.analyticsAccess).toBe(false);
      expect(status.features.customThemes).toBe(false);
      expect(status.usage.linksUsed).toBe(3);
    });

    it('should return PRO unlimited features for pro plan user', async () => {
      vi.mocked(paymentRepository.ensureFreeSubscription).mockResolvedValue({
        id: 'sub-1',
        userId: mockUserId,
        plan: 'PRO',
        status: 'ACTIVE',
        razorpaySubscriptionId: 'sub_123',
        razorpayCustomerId: 'cust_123',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 86400000),
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(paymentRepository.countUserLinks).mockResolvedValue(12);

      const status = await paymentService.getSubscriptionStatus(mockUserId);

      expect(status.plan).toBe('PRO');
      expect(status.features.maxLinks).toBeNull();
      expect(status.features.analyticsAccess).toBe(true);
      expect(status.features.customThemes).toBe(true);
      expect(status.usage.linksUsed).toBe(12);
    });
  });
});
