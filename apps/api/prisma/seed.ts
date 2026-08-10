import { prisma, disconnectDatabase } from '../src/infrastructure/database/prisma';

const seed = async () => {
  await prisma.systemMetadata.upsert({
    where: {
      key: 'application_name',
    },
    update: {
      value: 'LinkHub',
    },
    create: {
      key: 'application_name',
      value: 'LinkHub',
    },
  });

  console.log('Database seed completed.');
};

seed()
  .catch((error) => {
    console.error('Database seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
