// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { APP_COPY, homeHeading } from './helpers/locators.ts';
import { REPO_ROOT, RUNTIME_DIST } from './helpers/paths.ts';

/**
 * Provas de harness — devem passar sem composição F3.
 * Validam descoberta Playwright, preview pós-build isolado e artefatos mínimos.
 */
test.describe('F2d harness (G1)', () => {
  test('preview serve o stub React com título Relógio Maluco', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Relógio Maluco/);
    await expect(homeHeading(page)).toBeVisible();
    await expect(page.getByText(APP_COPY.home.subtitle).or(page.getByText(/aprender as horas/i))).toBeVisible();
    await expect(page.locator('#root')).not.toContainText('Carregando o Relógio Maluco');
  });

  test('LICENSE.txt do build isolado responde 200 text/plain com AGPL', async ({ request }) => {
    const response = await request.get('/LICENSE.txt');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type'] ?? '').toMatch(/text\/plain/);
    expect(await response.text()).toMatch(/GNU AFFERO GENERAL PUBLIC LICENSE/i);
  });

  test('artefatos locais do harness isolado existem', () => {
    expect(existsSync(path.join(REPO_ROOT, 'playwright.config.ts'))).toBe(true);
    expect(existsSync(path.join(REPO_ROOT, 'e2e', 'DEPENDENCIES.md'))).toBe(true);
    expect(existsSync(path.join(REPO_ROOT, 'public', 'LICENSE.txt'))).toBe(true);
    expect(existsSync(path.join(REPO_ROOT, 'legacy', 'sw.js'))).toBe(true);
    expect(existsSync(path.join(RUNTIME_DIST, 'index.html'))).toBe(true);
    expect(RUNTIME_DIST.includes(`${path.sep}e2e${path.sep}.runtime-dist`)).toBe(true);
  });
});
