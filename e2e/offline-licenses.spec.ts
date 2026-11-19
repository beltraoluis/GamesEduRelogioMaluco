// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { requiresF3Composition } from './helpers/composition.ts';
import { homeHeading, offlineReadyBadge } from './helpers/locators.ts';
import { F2C_DIST, F2C_SHA, REPO_ROOT, RUNTIME_DIST, SUBPATH } from './helpers/paths.ts';
import {
  cacheHasUrl,
  listCacheNames,
  waitForServiceWorkerControl,
} from './helpers/preferences.ts';
import { startSwitchableServer } from './helpers/static-server.ts';
import { waitForWorkboxPrecache } from './helpers/sw.ts';

test.describe('Offline + licenças', () => {
  test('LICENSE.txt no runtime-dist isolado responde 200 (G1)', async ({ page }) => {
    await page.goto('/');
    await expect(homeHeading(page)).toBeVisible();

    const licenseOnline = await page.request.get('/LICENSE.txt');
    expect(licenseOnline.status()).toBe(200);
    expect(licenseOnline.headers()['content-type'] ?? '').toMatch(/text\/plain/);
    expect(await licenseOnline.text()).toMatch(/GNU AFFERO GENERAL PUBLIC LICENSE/i);
    expect(existsSync(path.join(RUNTIME_DIST, 'LICENSE.txt'))).toBe(true);
  });

  test('composição F2c: LICENSE + THIRD_PARTY offline (ignoreSearch)', async ({ browser }) => {
    test.skip(!F2C_SHA, 'requer E2E_F2C_SHA explícito');
    const distDir = F2C_DIST;
    expect(existsSync(path.join(distDir, 'THIRD_PARTY_LICENSES.txt'))).toBe(true);

    const server = await startSwitchableServer({ distDir });
    server.setRoot('dist');
    const context = await browser.newContext({ baseURL: server.origin, serviceWorkers: 'allow' });
    const page = await context.newPage();

    try {
      await page.goto('/');
      await expect(homeHeading(page)).toBeVisible();
      await waitForServiceWorkerControl(page);
      await waitForWorkboxPrecache(page);

      // Workbox revisiona com ?__WB_REVISION__= — match exige ignoreSearch.
      expect(await cacheHasUrl(page, './index.html')).toBe(true);
      expect(await cacheHasUrl(page, './LICENSE.txt')).toBe(true);
      expect(await cacheHasUrl(page, './THIRD_PARTY_LICENSES.txt')).toBe(true);

      // Confirma escopo: recurso no cache da mesma origem do SW.
      const scopeOk = await page.evaluate(async () => {
        const reg = await navigator.serviceWorker.getRegistration();
        const controller = navigator.serviceWorker.controller;
        return {
          scope: reg?.scope ?? null,
          script: controller?.scriptURL ?? null,
          origin: location.origin,
        };
      });
      expect(scopeOk.scope).toBe(`${scopeOk.origin}/`);
      expect(scopeOk.script).toBe(`${scopeOk.origin}/sw.js`);

      await context.setOffline(true);
      const licenses = await page.evaluate(async () => {
        const [agpl, third] = await Promise.all([
          fetch('./LICENSE.txt'),
          fetch('./THIRD_PARTY_LICENSES.txt'),
        ]);
        return {
          agpl: { status: agpl.status, text: await agpl.text() },
          third: { status: third.status, text: await third.text() },
        };
      });
      expect(licenses.agpl.status).toBe(200);
      expect(licenses.agpl.text).toMatch(/GNU AFFERO/i);
      expect(licenses.third.status).toBe(200);
      expect(licenses.third.text).toMatch(/react/i);
    } finally {
      await context.close();
      await server.close();
    }
  });

  test('composição F2c: licenças offline no subpath GitHub Pages', async ({ browser }) => {
    test.skip(!F2C_SHA, 'requer E2E_F2C_SHA explícito');
    const distDir = F2C_DIST;
    const server = await startSwitchableServer({ distDir });
    server.setRoot('dist');
    server.setSubpath(SUBPATH);

    const context = await browser.newContext({
      baseURL: `${server.origin}${SUBPATH}/`,
      serviceWorkers: 'allow',
    });
    const page = await context.newPage();

    try {
      await page.goto('./');
      await expect(homeHeading(page)).toBeVisible();
      const controller = await waitForServiceWorkerControl(page, 20_000);
      expect(controller).toContain(`${SUBPATH}/sw.js`);
      await waitForWorkboxPrecache(page);
      expect(await cacheHasUrl(page, './LICENSE.txt')).toBe(true);
      expect(await cacheHasUrl(page, './THIRD_PARTY_LICENSES.txt')).toBe(true);

      await context.setOffline(true);
      expect((await page.reload())?.fromServiceWorker()).toBe(true);
      await expect(homeHeading(page)).toBeVisible();

      const licenses = await page.evaluate(async () => {
        const [agpl, third] = await Promise.all([
          fetch('./LICENSE.txt'),
          fetch('./THIRD_PARTY_LICENSES.txt'),
        ]);
        return { agpl: agpl.status, third: third.status, thirdText: await third.text() };
      });
      expect(licenses.agpl).toBe(200);
      expect(licenses.third).toBe(200);
      expect(licenses.thirdText.length).toBeGreaterThan(20);
    } finally {
      await context.close();
      await server.close();
    }
  });

  test('[F3] selo offlineReady na UI após precache válido', async ({ page }, testInfo) => {
    requiresF3Composition(testInfo, 'PwaApi.offlineReady + badge no menu (F2b/F2c)');

    await page.goto('/');
    await expect(homeHeading(page)).toBeVisible();
    const controller = await waitForServiceWorkerControl(page, 20_000);
    expect(controller).toMatch(/sw\.js/);
    const caches = await listCacheNames(page);
    expect(caches.some((name) => name.startsWith('workbox-precache-v2-'))).toBe(true);
    await expect(offlineReadyBadge(page)).toBeVisible({ timeout: 20_000 });
    expect(existsSync(path.join(REPO_ROOT, 'public', 'LICENSE.txt'))).toBe(true);
  });
});
