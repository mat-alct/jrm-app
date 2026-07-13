import { defineConfig, devices } from '@playwright/test';

// O Playwright habilita cores nos processos filhos. Evita o warning do Node
// quando o ambiente do terminal também define NO_COLOR.
delete process.env.NO_COLOR;

const emulatorEnv = {
  NEXT_DIST_DIR: '.next-emulator',
  NEXT_PUBLIC_USE_FIREBASE_EMULATORS: '1',
  USE_FIREBASE_EMULATORS: '1',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-jrm',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'demo-jrm.appspot.com',
  NEXT_PUBLIC_FIREBASE_API_KEY: 'fake-api-key',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'demo-jrm.firebaseapp.com',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '0',
  NEXT_PUBLIC_FIREBASE_APP_ID: 'demo',
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
  FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
  FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199',
  CLIENT_ACCESS_SECRET: 'test-client-access-secret',
};

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  // O emulador é estado compartilhado: uma suíte por vez.
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'emulator',
      testMatch: /.*\/real\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://127.0.0.1:3101',
      },
    },
  ],
  webServer: [
    {
      command: 'npm run dev -- --hostname 127.0.0.1 --port 3101',
      url: 'http://127.0.0.1:3101',
      reuseExistingServer: false,
      timeout: 120_000,
      env: emulatorEnv,
    },
  ],
});
