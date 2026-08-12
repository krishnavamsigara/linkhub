import 'dotenv/config';
import argon2 from 'argon2';

// Import your pre-configured Prisma client instance
import { prisma, disconnectDatabase } from '../src/infrastructure/database/prisma.js';

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const username = process.env.SUPER_ADMIN_USERNAME;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!email || !username || !password) {
    throw new Error(
      'SUPER_ADMIN_EMAIL, SUPER_ADMIN_USERNAME and SUPER_ADMIN_PASSWORD are required',
    );
  }

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
  });

  const existing = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existing) {
    await prisma.user.update({
      where: {
        id: existing.id,
      },
      data: {
        role: 'SUPER_ADMIN',
      },
    });

    console.log('Existing user promoted to SUPER_ADMIN');
    return;
  }

  const user = await prisma.user.create({
    data: {
      email,
      username,
      displayName: 'LinkHub Super Admin',
      role: 'SUPER_ADMIN',

      credentials: {
        create: {
          passwordHash,
        },
      },
    },
  });

  console.log(`Created SUPER_ADMIN: ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectDatabase();
  });
