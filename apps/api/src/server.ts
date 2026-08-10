import { createServer } from 'node:http';

import { createApp } from './app.js';
import { env } from './config/index.js';
import {
  connectDatabase,
  disconnectDatabase,
} from './infrastructure/database/prisma.js';

const app = createApp();

const server = createServer(app);

const shutdown = async (signal: string) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);

  server.close(async (error) => {
    if (error) {
      console.error('Error while shutting down HTTP server:', error);

      await disconnectDatabase();

      process.exit(1);
    }

    console.log('HTTP server closed.');

    await disconnectDatabase();

    console.log('Database connection closed.');

    process.exit(0);
  });
};

const startServer = async () => {
  try {
    await connectDatabase();

    console.log('PostgreSQL connected.');

    server.listen(env.PORT, () => {
      console.log(
        `${env.APP_NAME} running on http://localhost:${env.PORT}`,
      );

      console.log(`Environment: ${env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('Failed to start application:', error);

    await disconnectDatabase();

    process.exit(1);
  }
};

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

void startServer();
