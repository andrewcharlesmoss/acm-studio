import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env.STUDIO_BROWSER_URL ?? 'http://localhost:3010',
    browserName: 'chromium',
    channel: process.env.STUDIO_BROWSER_CHANNEL || undefined,
    trace: 'retain-on-failure',
  },
});
