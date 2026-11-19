// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { openMode, selectLevel } from './helpers/app.ts';
import { solveLevelOneNumbers } from './helpers/clock.ts';
import { requiresF3Composition } from './helpers/composition.ts';
import { homeHeading } from './helpers/locators.ts';
import { F2C_DIST, F2C_SHA, RUNTIME_DIST, SUBPATH } from './helpers/paths.ts';
import { listCacheNames, waitForServiceWorkerControl } from './helpers/preferences.ts';
import { startSwitchableServer } from './helpers/static-server.ts';
import { registerServiceWorker, waitForWorkboxPrecache } from './helpers/sw.ts';

test.describe('Subpath GitHub Pages (base: ./)', () => {
  test('runtime-dist isolado responde 200 em / e no subpath (G1)', async () => {
    const distDir = RUNTIME_DIST;
    expect(existsSync(path.join(distDir, 'index.html'))).toBe(true);
    expect(distDir).toBe(RUNTIME_DIST);

    const server = await startSwitchableServer({ distDir });
    server.setRoot('dist');

    try {
      const rootIndex = await fetch(`${server.origin}/`);
      expect(rootIndex.status).toBe(200);
      const rootHtml = await rootIndex.text();
      expect(rootHtml).toMatch(/Relógio Maluco/);

      const rootLicense = await fetch(`${server.origin}/LICENSE.txt`);
      expect(rootLicense.status).toBe(200);

      const assetMatch = rootHtml.match(/assets\/[^"']+\.js/);
      expect(assetMatch, 'index deve referenciar asset JS hashed').toBeTruthy();
      const assetUrl = `${server.origin}/${assetMatch![0]}`;
      expect((await fetch(assetUrl)).status).toBe(200);
      expect((await fetch(`${server.origin}/sw.js`)).status).toBe(200);

      server.setSubpath(SUBPATH);
      const subIndex = await fetch(`${server.origin}${SUBPATH}/`);
      expect(subIndex.status).toBe(200);
      const subHtml = await subIndex.text();
      expect(subHtml).toMatch(/Relógio Maluco/);

      const subLicense = await fetch(`${server.origin}${SUBPATH}/LICENSE.txt`);
      expect(subLicense.status).toBe(200);
      expect(await subLicense.text()).toMatch(/GNU AFFERO/i);

      const subAsset = `${server.origin}${SUBPATH}/${assetMatch![0]}`;
      expect((await fetch(subAsset)).status).toBe(200);
      expect((await fetch(`${server.origin}${SUBPATH}/sw.js`)).status).toBe(200);

      const manifest = await fetch(`${server.origin}${SUBPATH}/manifest.webmanifest`);
      expect(manifest.status).toBe(200);
      const manifestJson = (await manifest.json()) as { start_url?: string; scope?: string };
      expect(manifestJson.start_url).toBe('./');
      expect(manifestJson.scope).toBe('./');
    } finally {
      await server.close();
    }
  });

  test('[F3] subpath offline com UI completa (ModeCard etc.)', async ({ browser }, testInfo) => {
    requiresF3Composition(
      testInfo,
      'UI completa + offlineReady no subpath (F2c/F3); HTTP/SW/assets já verdes sem F3',
    );

    const distDir = RUNTIME_DIST;
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
      const caches = await listCacheNames(page);
      expect(caches.some((name) => name.includes('workbox-precache-v2-'))).toBe(true);
      await context.setOffline(true);
      const response = await page.reload();
      expect(response?.fromServiceWorker()).toBe(true);
      expect(await page.evaluate(() => navigator.onLine)).toBe(false);
      await expect(homeHeading(page)).toBeVisible();
      await selectLevel(page, 1);
      await openMode(page, 'numbers');
      await solveLevelOneNumbers(page);
    } finally {
      await context.close();
      await server.close();
    }
  });

  test('F2c composition: SW + precache no subpath (sem UI F3)', async ({ browser }) => {
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
      await registerServiceWorker(page);
      const controller = await waitForServiceWorkerControl(page, 20_000);
      expect(controller).toContain(`${SUBPATH}/sw.js`);
      await waitForWorkboxPrecache(page);
    } finally {
      await context.close();
      await server.close();
    }
  });
});
