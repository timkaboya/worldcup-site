import { defineConfig, devices } from '@playwright/test';

// E2E against the production build served by `astro preview`.
// Note: the /api/* edge functions don't run under `astro preview`, so the app
// falls back to the static /fixtures.json and /news.json snapshots — which is
// exactly the resilience path we want to verify.
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Public test key so the Support (Paystack) button renders in e2e. Public
    // keys are safe to expose; the test never completes a real payment.
    env: {
      PUBLIC_PAYSTACK_KEY: 'pk_test_e2e_placeholder',
      PUBLIC_PAYSTACK_CURRENCY: 'NGN',
    },
  },
});
