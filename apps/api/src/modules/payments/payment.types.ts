// ─── Plan & Subscription Enums ───────────────────────────────────────────────
export type Plan = 'FREE' | 'PRO';
export type SubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PAST_DUE';
export type OrderStatus = 'CREATED' | 'PAID' | 'FAILED';


export interface CreateOrderInput {
  /** Amount in paise. Default ₹499 = 49900 */
  amount?: number;
  currency?: string;
  notes?: string;
}

export interface VerifyPaymentInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

// ─── Service Responses ───────────────────────────────────────────────────────

export interface CreateOrderResponse {
  orderId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface SubscriptionStatusResponse {
  plan: Plan;
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  cancelledAt: Date | null;
  features: {
    maxLinks: number | null; // null = unlimited
    analyticsAccess: boolean;
    customThemes: boolean;
  };
  usage: {
    linksUsed: number;
  };
}

// ─── Webhook ─────────────────────────────────────────────────────────────────

export type RazorpayWebhookEvent =
  | 'order.paid'
  | 'payment.captured'
  | 'payment.failed'
  | 'subscription.activated'
  | 'subscription.cancelled';

export interface RazorpayWebhookPayload {
  entity: string;
  account_id: string;
  event: RazorpayWebhookEvent;
  contains: string[];
  payload: {
    payment?: {
      entity: {
        id: string;
        order_id: string;
        status: string;
        amount: number;
        currency: string;
        notes: Record<string, string>;
      };
    };
    order?: {
      entity: {
        id: string;
        status: string;
        amount: number;
        notes: Record<string, string>;
      };
    };
  };
}

// ─── Repository types ────────────────────────────────────────────────────────

export interface CreatePaymentOrderData {
  userId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  notes?: string;
}

export interface UpdatePaymentOrderData {
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  status: OrderStatus;
}
