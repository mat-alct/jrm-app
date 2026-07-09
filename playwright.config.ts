import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev -- --hostname 127.0.0.1 --port 3100',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_E2E_USE_MOCKS: '1',
      NEXT_PUBLIC_FIREBASE_API_KEY: 'e2e-api-key',
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'e2e.firebaseapp.com',
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'jrm-e2e',
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'jrm-e2e.appspot.com',
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456',
      NEXT_PUBLIC_FIREBASE_APP_ID: '1:123456:web:e2e',
    },
  },
});
