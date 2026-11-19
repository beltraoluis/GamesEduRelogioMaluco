// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { requiresF3Composition } from './helpers/composition.ts';
import { homeHeading } from './helpers/locators.ts';
import { listCacheNames, waitForServiceWorkerControl } from './helpers/preferences.ts';
import { startSwitchableServer } from './helpers/static-server.ts';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SUBPATH = '/GamesEduRelogioMaluco';

test.describe('Subpath GitHub Pages (base: ./)', () => {
  test('mesmo dist/ responde 200 em / e no subpath (G1)', async () => {
    expect(existsSync(path.join(REPO_ROOT, 'dist', 'index.html'))).toBe(true);

    const server = await startSwitchableServer();
    server.setRoot('dist');

    try {
      const rootIndex = await fetch(`${server.origin}/`);
      expect(rootIndex.status).toBe(200);
      expect(await rootIndex.text()).toMatch(/Relógio Maluco/);

      const rootLicense = await fetch(`${server.origin}/LICENSE.txt`);
      expect(rootLicense.status).toBe(200);

      server.setSubpath(SUBPATH);
      const subIndex = await fetch(`${server.origin}${SUBPATH}/`);
      expect(subIndex.status).toBe(200);
      expect(await subIndex.text()).toMatch(/Relógio Maluco/);

      const subLicense = await fetch(`${server.origin}${SUBPATH}/LICENSE.txt`);
      expect(subLicense.status).toBe(200);
      expect(await subLicense.text()).toMatch(/GNU AFFERO/i);

      const manifest = await fetch(`${server.origin}${SUBPATH}/manifest.webmanifest`);
      expect(manifest.status).toBe(200);
      const manifestJson = (await manifest.json()) as { start_url?: string; scope?: string };
      expect(manifestJson.start_url).toBe('./');
      expect(manifestJson.scope).toBe('./');
    } finally {
      await server.close();
    }
  });

  test('[F3] subpath offline: SW no escopo do subpath + app recarrega', async ({ browser }, testInfo) => {
    requiresF3Composition(
      testInfo,
      'UI completa + offlineReady no subpath após registro SW (F2c/F3); assets já cobertos no teste G1 acima',
    );

    expect(existsSync(path.join(REPO_ROOT, 'dist', 'index.html'))).toBe(true);
    const server = await startSwitchableServer();
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
      expect(caches.some((name) => name.includes('workbox-precache-v2-') && name.includes(SUBPATH))).toBe(true);

      const license = await page.evaluate(async () => {
        const res = await fetch('./LICENSE.txt');
        return { status: res.status, type: res.headers.get('content-type'), text: await res.text() };
      });
      expect(license.status).toBe(200);
      expect(license.text).toMatch(/GNU AFFERO/i);

      await context.setOffline(true);
      await page.reload();
      await expect(homeHeading(page)).toBeVisible();
      expect(await page.evaluate(() => navigator.onLine)).toBe(false);
    } finally {
      await context.close();
      await server.close();
    }
  });
});
