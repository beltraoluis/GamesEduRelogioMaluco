// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright 2026 Luis Henrique Coutinho Beltrão
import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './e2e', use: { baseURL: 'http://127.0.0.1:4173' }, webServer: { command: 'npm run preview -- --host 127.0.0.1', port: 4173, reuseExistingServer: !process.env.CI } });
