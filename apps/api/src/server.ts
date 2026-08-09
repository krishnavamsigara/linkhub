import { createServer } from 'node:http';

import { env } from './config/index.js';
import { createApp } from './app.js';

const app = createApp();

const server = createServer(app);

const shutdown = (signal: string) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);

  server.close((error) => {
    if (error) {
      console.error('Error while shutting down server:', error);
      process.exit(1);
    }

    console.log('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});

process.on('SIGINT', () => {
  shutdown('SIGINT');
});

server.listen(env.PORT, () => {
  console.log(`${env.APP_NAME} running on http://localhost:${env.PORT}`);

  console.log(`Environment: ${env.NODE_ENV}`);
});
