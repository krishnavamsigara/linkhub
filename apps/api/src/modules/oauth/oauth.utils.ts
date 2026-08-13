import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '../../infrastructure/database/index.js';

export function generateOAuthState(): string {
  return randomBytes(32).toString('base64url');
}

export function generateCodeVerifier(): string {
  return randomBytes(32).toString('base64url');
}

export function generateCodeChallenge(codeVerifier: string): string {
  return createHash('sha256').update(codeVerifier).digest('base64url');
}

export async function generateUniqueUsername(
  email: string,
  name?: string | null,
): Promise<string> {
  const rawBase = (name || email.split('@')[0] || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 30);
  const base = rawBase.length > 0 ? rawBase : 'user';

  let username = base;
  let attempt = 0;

  while (attempt < 10) {
    const existing = await prisma.user.findFirst({
      where: { username, deletedAt: null },
    });

    if (!existing) {
      return username;
    }

    attempt++;
    const randomSuffix = randomBytes(2).toString('hex');
    username = `${base.slice(0, 24)}_${randomSuffix}`;
  }

  return `user_${randomBytes(4).toString('hex')}`;
}
