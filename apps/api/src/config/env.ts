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
