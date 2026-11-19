// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { defineConfig, devices } from '@playwright/test';

/** Isolado por worktree: evita colidir com preview alheio na 4173. */
const PREVIEW_HOST = '127.0.0.1';
const PREVIEW_PORT = Number(process.env.E2E_PORT ?? 4177);
const PREVIEW_ORIGIN = `http://${PREVIEW_HOST}:${PREVIEW_PORT}`;

/**
 * F2d harness. Build isolado em `e2e/.runtime-dist` (não reutiliza dist alheio).
 * Projetos: chromium (SW/PWA), webkit (Safari real).
 * Ver `e2e/DEPENDENCIES.md`.
 */
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
      testMatch: /ios-tip\.spec\.ts|harness\.spec\.ts/,
    },
  ],
  webServer: {
    command: [
      'npx vite build --outDir e2e/.runtime-dist --emptyOutDir',
      `npx vite preview --outDir e2e/.runtime-dist --host ${PREVIEW_HOST} --port ${PREVIEW_PORT}`,
    ].join(' && '),
    url: PREVIEW_ORIGIN,
    // Sempre sobe o preview deste worktree (não reusa servidor alheio).
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
