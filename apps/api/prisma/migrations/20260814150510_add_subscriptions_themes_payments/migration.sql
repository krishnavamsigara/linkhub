-- Migration: add_subscriptions_themes_payments
-- This migration adds: Plan/SubscriptionStatus/OrderStatus enums, 
-- subscriptions, payment_orders, themes tables, and updates profiles for theme_id

-- ─── Enums ───────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED', 'PAST_DUE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "OrderStatus" AS ENUM ('CREATED', 'PAID', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ─── Themes Table ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "themes" (
  "id"           UUID          NOT NULL DEFAULT gen_random_uuid(),
  "name"         VARCHAR(100)  NOT NULL,
  "description"  TEXT,
  "background"   VARCHAR(255)  NOT NULL,
  "button_style" VARCHAR(50)   NOT NULL,
  "button_color" VARCHAR(50)   NOT NULL,
  "text_color"   VARCHAR(50)   NOT NULL,
  "font_family"  VARCHAR(50)   NOT NULL,
  "is_pro"       BOOLEAN       NOT NULL DEFAULT false,
  "created_at"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "themes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "themes_name_key" ON "themes"("name");

-- ─── Profiles: Add theme_id column ───────────────────────────────────────────

ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "theme_id" UUID;

-- Add FK if not exists
DO $$ BEGIN
  ALTER TABLE "profiles" ADD CONSTRAINT "profiles_theme_id_fkey"
    FOREIGN KEY ("theme_id") REFERENCES "themes"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ─── Subscriptions Table ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id"                      UUID                NOT NULL DEFAULT gen_random_uuid(),
  "user_id"                 UUID                NOT NULL,
  "plan"                    "Plan"              NOT NULL DEFAULT 'FREE',
  "status"                  "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "razorpay_subscription_id" VARCHAR(255),
  "razorpay_customer_id"    VARCHAR(255),
  "current_period_start"    TIMESTAMP(3),
  "current_period_end"      TIMESTAMP(3),
  "cancelled_at"            TIMESTAMP(3),
  "created_at"              TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"              TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_user_id_key" ON "subscriptions"("user_id");

DO $$ BEGIN
  ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ─── Payment Orders Table ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "payment_orders" (
  "id"                   UUID          NOT NULL DEFAULT gen_random_uuid(),
  "user_id"              UUID          NOT NULL,
  "razorpay_order_id"    VARCHAR(255)  NOT NULL,
  "razorpay_payment_id"  VARCHAR(255),
  "razorpay_signature"   VARCHAR(255),
  "amount"               INTEGER       NOT NULL,
  "currency"             VARCHAR(10)   NOT NULL DEFAULT 'INR',
  "status"               "OrderStatus" NOT NULL DEFAULT 'CREATED',
  "notes"                TEXT,
  "created_at"           TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"           TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "payment_orders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "payment_orders_razorpay_order_id_key" ON "payment_orders"("razorpay_order_id");
CREATE INDEX IF NOT EXISTS "payment_orders_user_id_idx" ON "payment_orders"("user_id");

DO $$ BEGIN
  ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
