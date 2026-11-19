// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { APP_COPY, homeHeading } from './helpers/locators.ts';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Provas de harness na base G1 — devem passar sem composição F3.
 * Validam descoberta Playwright, preview pós-build e artefatos mínimos.
 */
test.describe('F2d harness (G1)', () => {
  test('preview serve o stub React com título Relógio Maluco', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Relógio Maluco/);
    await expect(homeHeading(page)).toBeVisible();
    await expect(page.getByText(APP_COPY.home.subtitle).or(page.getByText(/aprender as horas/i))).toBeVisible();
    // Fallback estático de boot some após o hydrate do React.
    await expect(page.locator('#root')).not.toContainText('Carregando o Relógio Maluco');
  });

  test('LICENSE.txt do build responde 200 text/plain com AGPL', async ({ request }) => {
    const response = await request.get('/LICENSE.txt');
    expect(response.status()).toBe(200);
    const contentType = response.headers()['content-type'] ?? '';
    expect(contentType).toMatch(/text\/plain/);
    const body = await response.text();
    expect(body).toMatch(/GNU AFFERO GENERAL PUBLIC LICENSE/i);
  });

  test('artefatos locais do harness existem no repositório', () => {
    expect(existsSync(path.join(REPO_ROOT, 'playwright.config.ts'))).toBe(true);
    expect(existsSync(path.join(REPO_ROOT, 'e2e', 'DEPENDENCIES.md'))).toBe(true);
    expect(existsSync(path.join(REPO_ROOT, 'public', 'LICENSE.txt'))).toBe(true);
    expect(existsSync(path.join(REPO_ROOT, 'legacy', 'sw.js'))).toBe(true);
    expect(existsSync(path.join(REPO_ROOT, 'dist', 'index.html'))).toBe(true);
  });
});
