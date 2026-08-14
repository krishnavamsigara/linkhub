import dotenv from 'dotenv';
import path from 'node:path';
import { z } from 'zod';



// Load .env from current dir or fallback to monorepo root
dotenv.config(); // tries apps/api/.env
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') }); // tries root .env

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'staging', 'production'])
    .default('development'),

  PORT: z.coerce.number().int().positive().default(5000),

  APP_NAME: z.string().min(1).default('linkhub-api'),

  CORS_ORIGIN: z.string().min(1).default('http://localhost:3000'),

  FRONTEND_URL: z.string().url().default('http://localhost:3000'),

  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),

  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .refine(
      (val) => val.startsWith('postgres://') || val.startsWith('postgresql://'),
      { message: 'DATABASE_URL must be a valid PostgreSQL connection string' },
    ),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32),

  JWT_REFRESH_SECRET: z
    .string()
    .min(32),

  JWT_ACCESS_EXPIRES_IN: z
    .string()
    .default('15m'),

  JWT_REFRESH_EXPIRES_IN: z
    .string()
    .default('7d'),

  AUTH_REFRESH_COOKIE_NAME: z
    .string()
    .default('linkhub_refresh_token'),

  AUTH_REFRESH_COOKIE_SECURE: z
    .union([z.boolean(), z.string()])
    .transform((val) =>
      typeof val === 'boolean'
        ? val
        : val.trim().toLowerCase() === 'true' || val.trim() === '1',
    )
    .default(false),

  AUTH_REFRESH_COOKIE_SAME_SITE: z
    .enum(['strict', 'lax', 'none'])
    .default('lax'),

  REDIS_URL: z
    .string()
    .url(),

  GOOGLE_CLIENT_ID: z
    .string()
    .min(1),

  GOOGLE_CLIENT_SECRET: z
    .string()
    .min(1),

  GOOGLE_REDIRECT_URI: z
    .string()
    .url(),

  GITHUB_CLIENT_ID: z
    .string()
    .min(1),

  GITHUB_CLIENT_SECRET: z
    .string()
    .min(1),

  GITHUB_REDIRECT_URI: z
    .string()
    .url(),

  STORAGE_PROVIDER: z
    .enum(['minio', 's3', 'cloudinary'])
    .default('minio'),

  MINIO_ENDPOINT: z
    .string()
    .default('localhost'),

  MINIO_PORT: z
    .coerce
    .number()
    .int()
    .default(9000),

  MINIO_USE_SSL: z
    .union([z.boolean(), z.string()])
    .transform((val) =>
      typeof val === 'boolean'
        ? val
        : val.trim().toLowerCase() === 'true' || val.trim() === '1',
    )
    .default(false),

  MINIO_ACCESS_KEY: z
    .string()
    .default('minioadmin'),

  MINIO_SECRET_KEY: z
    .string()
    .default('minioadminpassword'),

  MINIO_BUCKET: z
    .string()
    .default('linkhub-avatars'),

  AWS_REGION: z
    .string()
    .optional(),

  AWS_ACCESS_KEY_ID: z
    .string()
    .optional(),

  AWS_SECRET_ACCESS_KEY: z
    .string()
    .optional(),

  AWS_S3_BUCKET: z
    .string()
    .optional(),

  CLOUDINARY_CLOUD_NAME: z
    .string()
    .optional(),

  CLOUDINARY_API_KEY: z
    .string()
    .optional(),

  CLOUDINARY_API_SECRET: z
    .string()
    .optional(),

  RAZORPAY_KEY_ID: z
    .string()
    .default('rzp_test_dummy_key_id'),

  RAZORPAY_KEY_SECRET: z
    .string()
    .default('rzp_test_dummy_key_secret'),

  RAZORPAY_WEBHOOK_SECRET: z
    .string()
    .default('rzp_test_webhook_secret'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(JSON.stringify(parsedEnv.error.format(), null, 2));

  // Throw error in test environment instead of exiting process silently
  if (process.env.NODE_ENV === 'test') {
    throw new Error('Invalid environment variables for testing.');
  }

  process.exit(1);
}

export const env = parsedEnv.data;
