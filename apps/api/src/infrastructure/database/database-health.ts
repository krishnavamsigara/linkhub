import { prisma } from './prisma.js';

export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return true;
  } catch {
    return false;
  }
};
