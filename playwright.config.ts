// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { defineConfig, devices } from '@playwright/test';

import { PREVIEW_ORIGIN } from './e2e/helpers/paths';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  // exactOptionalPropertyTypes: nunca passe workers: undefined (TS2769).
  ...(process.env.CI ? { workers: 2 } : {}),
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: PREVIEW_ORIGIN,
    locale: 'pt-BR',
    colorScheme: 'light',
    actionTimeout: 8_000,
    navigationTimeout: 20_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testMatch: /ios-tip\.spec\.ts|harness\.spec\.ts|offline-screens\.spec\.ts/,
    },
  ],
  webServer: {
    command: 'node e2e/build-preview.mjs',
    wait: { stdout: /^F2D_PREVIEW_READY$/m },
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
