import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';

// Preload .env.test for integration/unit tests
dotenv.config({ path: '.env.test' });

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // ensure setupFiles point to any global test hooks if you have them
  },
});
