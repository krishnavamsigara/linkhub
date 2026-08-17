import dotenv from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient } from '../../generated/prisma/client.js';

import { env } from '../../config/env.js';

dotenv.config();

// 1. Create a tuned pg Pool instance (optimized for PgBouncer transaction pooling or direct Postgres)
export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
  min: env.DB_POOL_MIN,
  idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: env.DB_CONN_TIMEOUT_MS,
  statement_timeout: env.DB_STATEMENT_TIMEOUT_MS,
});

// 2. Wrap the pool with Prisma's driver adapter
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// 3. Pass the adapter into PrismaClient
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// src/infrastructure/database/prisma.ts

export const connectDatabase = async (): Promise<void> => {
  await prisma.$connect();
};

export const disconnectDatabase = async (): Promise<void> => {
  await prisma.$disconnect();
};
