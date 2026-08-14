import { prisma } from '../../infrastructure/database/prisma.js';
import type { Plan, SubscriptionStatus, OrderStatus } from './payment.types.js';
import type {
  CreatePaymentOrderData,
  UpdatePaymentOrderData,
} from './payment.types.js';

// ─── Raw DB row types ─────────────────────────────────────────────────────────

interface SubscriptionRow {
  id: string;
  user_id: string;
  plan: Plan;
  status: SubscriptionStatus;
  razorpay_subscription_id: string | null;
  razorpay_customer_id: string | null;
  current_period_start: Date | null;
  current_period_end: Date | null;
  cancelled_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface PaymentOrderRow {
  id: string;
  user_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  amount: number;
  currency: string;
  status: OrderStatus;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

function mapSubscription(row: SubscriptionRow) {
  return {
    id: row.id,
    userId: row.user_id,
    plan: row.plan,
    status: row.status,
    razorpaySubscriptionId: row.razorpay_subscription_id,
    razorpayCustomerId: row.razorpay_customer_id,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    cancelledAt: row.cancelled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPaymentOrder(row: PaymentOrderRow) {
  return {
    id: row.id,
    userId: row.user_id,
    razorpayOrderId: row.razorpay_order_id,
    razorpayPaymentId: row.razorpay_payment_id,
    razorpaySignature: row.razorpay_signature,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PaymentRepository {
  // ─── Subscription ────────────────────────────────────────────────────────

  async findSubscriptionByUserId(userId: string) {
    const rows = await prisma.$queryRaw<SubscriptionRow[]>`
      SELECT * FROM subscriptions WHERE user_id = ${userId}::uuid LIMIT 1
    `;
    return rows.length > 0 ? mapSubscription(rows[0]!) : null;
  }

  async upgradeToPro(userId: string, periodEnd: Date) {
    const now = new Date();
    await prisma.$executeRaw`
      INSERT INTO subscriptions (user_id, plan, status, current_period_start, current_period_end, updated_at)
      VALUES (${userId}::uuid, 'PRO'::"Plan", 'ACTIVE'::"SubscriptionStatus", ${now}, ${periodEnd}, ${now})
      ON CONFLICT (user_id) DO UPDATE SET
        plan = 'PRO'::"Plan",
        status = 'ACTIVE'::"SubscriptionStatus",
        current_period_start = ${now},
        current_period_end = ${periodEnd},
        cancelled_at = NULL,
        updated_at = ${now}
    `;
    const rows = await prisma.$queryRaw<SubscriptionRow[]>`
      SELECT * FROM subscriptions WHERE user_id = ${userId}::uuid LIMIT 1
    `;
    return rows.length > 0 ? mapSubscription(rows[0]!) : null;
  }

  async ensureFreeSubscription(userId: string) {
    const now = new Date();
    await prisma.$executeRaw`
      INSERT INTO subscriptions (user_id, plan, status, updated_at)
      VALUES (${userId}::uuid, 'FREE'::"Plan", 'ACTIVE'::"SubscriptionStatus", ${now})
      ON CONFLICT (user_id) DO NOTHING
    `;
    const rows = await prisma.$queryRaw<SubscriptionRow[]>`
      SELECT * FROM subscriptions WHERE user_id = ${userId}::uuid LIMIT 1
    `;
    return mapSubscription(rows[0]!);
  }

  // ─── Payment Orders ──────────────────────────────────────────────────────

  async createPaymentOrder(data: CreatePaymentOrderData) {
    const now = new Date();
    const id = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO payment_orders (user_id, razorpay_order_id, amount, currency, notes, status, updated_at)
      VALUES (
        ${data.userId}::uuid,
        ${data.razorpayOrderId},
        ${data.amount},
        ${data.currency},
        ${data.notes ?? null},
        'CREATED'::"OrderStatus",
        ${now}
      )
      RETURNING id
    `;
    const rows = await prisma.$queryRaw<PaymentOrderRow[]>`
      SELECT * FROM payment_orders WHERE id = ${id[0]!.id}::uuid LIMIT 1
    `;
    return mapPaymentOrder(rows[0]!);
  }

  async findPaymentOrderByRazorpayOrderId(razorpayOrderId: string) {
    const rows = await prisma.$queryRaw<PaymentOrderRow[]>`
      SELECT * FROM payment_orders WHERE razorpay_order_id = ${razorpayOrderId} LIMIT 1
    `;
    return rows.length > 0 ? mapPaymentOrder(rows[0]!) : null;
  }

  async updatePaymentOrder(
    razorpayOrderId: string,
    data: UpdatePaymentOrderData,
  ) {
    const now = new Date();

    if (data.razorpayPaymentId && data.razorpaySignature) {
      await prisma.$executeRaw`
        UPDATE payment_orders SET
          status = ${data.status}::"OrderStatus",
          razorpay_payment_id = ${data.razorpayPaymentId},
          razorpay_signature = ${data.razorpaySignature},
          updated_at = ${now}
        WHERE razorpay_order_id = ${razorpayOrderId}
      `;
    } else if (data.razorpayPaymentId) {
      await prisma.$executeRaw`
        UPDATE payment_orders SET
          status = ${data.status}::"OrderStatus",
          razorpay_payment_id = ${data.razorpayPaymentId},
          updated_at = ${now}
        WHERE razorpay_order_id = ${razorpayOrderId}
      `;
    } else {
      await prisma.$executeRaw`
        UPDATE payment_orders SET
          status = ${data.status}::"OrderStatus",
          updated_at = ${now}
        WHERE razorpay_order_id = ${razorpayOrderId}
      `;
    }

    const rows = await prisma.$queryRaw<PaymentOrderRow[]>`
      SELECT * FROM payment_orders WHERE razorpay_order_id = ${razorpayOrderId} LIMIT 1
    `;
    return rows.length > 0 ? mapPaymentOrder(rows[0]!) : null;
  }

  // ─── Link Usage ──────────────────────────────────────────────────────────

  async countUserLinks(userId: string): Promise<number> {
    const rows = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM links WHERE user_id = ${userId}::uuid
    `;
    return Number(rows[0]?.count ?? 0);
  }
}

export const paymentRepository = new PaymentRepository();
