import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),

  PORT: z.coerce.number().int().positive().default(5000),

  APP_NAME: z.string().min(1).default('linkhub-api'),

  CORS_ORIGIN: z.string().min(1),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment configuration');

  console.error(
    parsedEnv.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
  );

  process.exit(1);
}

export const env = parsedEnv.data;
