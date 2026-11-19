// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { requiresF3Composition } from './helpers/composition.ts';
import { homeHeading, offlineReadyBadge } from './helpers/locators.ts';
import { listCacheNames, waitForServiceWorkerControl } from './helpers/preferences.ts';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test.describe('Offline + licenças', () => {
  test('LICENSE.txt responde 200 text/plain no preview (G1)', async ({ page }) => {
    await page.goto('/');
    await expect(homeHeading(page)).toBeVisible();

    const licenseOnline = await page.request.get('/LICENSE.txt');
    expect(licenseOnline.status()).toBe(200);
    const contentType = licenseOnline.headers()['content-type'] ?? '';
    expect(contentType).toMatch(/text\/plain/);
    expect(await licenseOnline.text()).toMatch(/GNU AFFERO GENERAL PUBLIC LICENSE/i);

    // Artefato presente no dist do build (cópia de public/), ainda que o precache
    // Workbox completo de licenças seja responsabilidade F2c.
    expect(existsSync(path.join(REPO_ROOT, 'dist', 'LICENSE.txt'))).toBe(true);
  });

  test('[F3] offlineReady + LICENSE/THIRD_PARTY no precache offline', async ({ page, context }, testInfo) => {
    requiresF3Composition(
      testInfo,
      'F2c deve precachear LICENSE.txt e THIRD_PARTY_LICENSES.txt e expor offlineReady; F3 compõe a UI do selo',
    );

    const thirdPartyDist = path.join(REPO_ROOT, 'dist', 'THIRD_PARTY_LICENSES.txt');
    const thirdPartyPublic = path.join(REPO_ROOT, 'public', 'THIRD_PARTY_LICENSES.txt');
    expect(
      existsSync(thirdPartyDist) || existsSync(thirdPartyPublic),
      'F2c deve publicar THIRD_PARTY_LICENSES.txt',
    ).toBe(true);

    await page.goto('/');
    await expect(homeHeading(page)).toBeVisible();

    const controller = await waitForServiceWorkerControl(page, 20_000);
    expect(controller).toMatch(/sw\.js/);

    // Espera o precache Workbox conter index.html e LICENSE.txt.
    await page.waitForFunction(async () => {
      const keys = await caches.keys();
      const wb = keys.find((k) => k.startsWith('workbox-precache-v2-'));
      if (!wb) return false;
      const cache = await caches.open(wb);
      const indexHit = await cache.match('./index.html') || await cache.match('index.html');
      const licenseHit = await cache.match('./LICENSE.txt') || await cache.match('LICENSE.txt');
      return Boolean(indexHit && licenseHit);
    }, undefined, { timeout: 20_000 });

    const cachesNames = await listCacheNames(page);
    expect(cachesNames.some((name) => name.startsWith('workbox-precache-v2-'))).toBe(true);
    expect(cachesNames.some((name) => /^relogio-maluco-v\d+$/.test(name))).toBe(false);

    await expect(offlineReadyBadge(page)).toBeVisible({ timeout: 20_000 });

    await context.setOffline(true);
    await page.reload();
    await expect(homeHeading(page)).toBeVisible();

    const licenses = await page.evaluate(async () => {
      const [agpl, third] = await Promise.all([fetch('./LICENSE.txt'), fetch('./THIRD_PARTY_LICENSES.txt')]);
      return {
        agpl: { status: agpl.status, text: await agpl.text() },
        third: { status: third.status, text: await third.text() },
      };
    });
    expect(licenses.agpl.status).toBe(200);
    expect(licenses.agpl.text).toMatch(/GNU AFFERO/i);
    expect(licenses.third.status).toBe(200);
    expect(licenses.third.text.length).toBeGreaterThan(20);
  });
});
