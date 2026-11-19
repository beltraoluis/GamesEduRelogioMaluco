// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { expect, test, type Page } from '@playwright/test';

import { ensureRuntimeDist } from './helpers/build.ts';
import { requiresF3Composition } from './helpers/composition.ts';
import { playLegacyNumbersOnce } from './helpers/legacy-play.ts';
import { homeHeading, modeCard } from './helpers/locators.ts';
import {
  LEGACY_SEEDED_PREFS,
  PREFERENCES_STORAGE_KEY,
  assertPreferencesPreserved,
  listLocalStorageKeys,
  readPreferences,
  seedPreferencesOnPage,
  waitForServiceWorkerControl,
} from './helpers/preferences.ts';
import { startSwitchableServer } from './helpers/static-server.ts';
import {
  trackMainFrameNavigations,
  updateAndWaitForWorkboxControl,
  waitForLegacyCachesGone,
  waitForWorkboxPrecache,
} from './helpers/sw.ts';

async function openLegacyControlled(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => document.title.includes('Relógio Maluco'));
  const script = await waitForServiceWorkerControl(page, 25_000);
  expect(script).toMatch(/sw\.js/);
  await page.waitForFunction(async () => (await caches.keys()).includes('relogio-maluco-v6'));
}

test.describe('Migração legado v6 → React', () => {
  test.beforeAll(() => {
    ensureRuntimeDist();
  });

  test('1 aba: seed evaluate uma vez, sync SW, prefs reais, cleanup', async ({ browser }) => {
    const migrationToken = `mig-1tab-${Date.now()}`;
    const server = await startSwitchableServer();
    server.setRoot('legacy');
    const context = await browser.newContext({ baseURL: server.origin, serviceWorkers: 'allow' });
    const page = await context.newPage();
    const nav = trackMainFrameNavigations(page);

    try {
      await openLegacyControlled(page);
      // Seed UMA vez após o goto — não sobrevive a clear() no reload (anti-tautologia Opus).
      // Prova de sensibilidade: mutante localStorage.clear() pós-update → FALHOU (prefs ausentes).
      const expected = await seedPreferencesOnPage(page, LEGACY_SEEDED_PREFS, {
        themeHint: LEGACY_SEEDED_PREFS.themeHint,
        migrationToken,
      });
      assertPreferencesPreserved(await readPreferences(page), expected);

      const navBeforeUpdate = nav.count();
      server.setRoot('dist');
      await updateAndWaitForWorkboxControl(page);
      expect(nav.count(), 'zero navegação automática após clientsClaim').toBe(navBeforeUpdate);

      await playLegacyNumbersOnce(page);
      expect(nav.count()).toBe(navBeforeUpdate);

      const navBeforeReload = nav.count();
      await page.reload();
      expect(nav.count()).toBe(navBeforeReload + 1);
      await expect(homeHeading(page)).toBeVisible();

      const afterReload = await readPreferences(page);
      assertPreferencesPreserved(afterReload, expected);
      expect(await listLocalStorageKeys(page)).toContain(PREFERENCES_STORAGE_KEY);

      const caches = await waitForLegacyCachesGone(page);
      await waitForWorkboxPrecache(page);
      expect(caches.some((name) => /^relogio-maluco-v\d+$/.test(name))).toBe(false);
      expect(caches.some((name) => name.startsWith('workbox-precache-v2-'))).toBe(true);
    } finally {
      await context.close();
      await server.close();
    }
  });

  test('2 abas: seed uma vez na origem, jogáveis antes do reload, prefs/cleanup depois', async ({
    browser,
  }) => {
    const migrationToken = `mig-2tab-${Date.now()}`;
    const server = await startSwitchableServer();
    server.setRoot('legacy');
    const context = await browser.newContext({ baseURL: server.origin, serviceWorkers: 'allow' });
    const pageA = await context.newPage();
    const pageB = await context.newPage();
    const navA = trackMainFrameNavigations(pageA);
    const navB = trackMainFrameNavigations(pageB);

    try {
      await openLegacyControlled(pageA);
      await openLegacyControlled(pageB);
      const expected = await seedPreferencesOnPage(pageA, LEGACY_SEEDED_PREFS, {
        themeHint: LEGACY_SEEDED_PREFS.themeHint,
        migrationToken,
      });
      assertPreferencesPreserved(await readPreferences(pageB), expected);

      const baseline = navA.count() + navB.count();
      server.setRoot('dist');
      await Promise.all([updateAndWaitForWorkboxControl(pageA), updateAndWaitForWorkboxControl(pageB)]);
      expect(navA.count() + navB.count()).toBe(baseline);

      await playLegacyNumbersOnce(pageA);
      await playLegacyNumbersOnce(pageB);
      expect(navA.count() + navB.count()).toBe(baseline);

      await pageA.reload();
      await pageB.reload();
      await expect(homeHeading(pageA)).toBeVisible();
      await expect(homeHeading(pageB)).toBeVisible();

      for (const page of [pageA, pageB]) {
        assertPreferencesPreserved(await readPreferences(page), expected);
        const caches = await waitForLegacyCachesGone(page);
        expect(caches.some((name) => name.startsWith('workbox-precache-v2-'))).toBe(true);
      }
    } finally {
      await context.close();
      await server.close();
    }
  });

  test('[F3] após reload React, ModeCard Números jogável nas 2 abas', async ({ browser }, testInfo) => {
    requiresF3Composition(testInfo, 'ModeCard/GameScreen React pós-migração (F2a+F2b+F3)');
    ensureRuntimeDist();

    const server = await startSwitchableServer();
    server.setRoot('legacy');
    const context = await browser.newContext({ baseURL: server.origin, serviceWorkers: 'allow' });
    const pageA = await context.newPage();
    const pageB = await context.newPage();
    try {
      await openLegacyControlled(pageA);
      await openLegacyControlled(pageB);
      await seedPreferencesOnPage(pageA, LEGACY_SEEDED_PREFS, { themeHint: LEGACY_SEEDED_PREFS.themeHint });
      server.setRoot('dist');
      await Promise.all([updateAndWaitForWorkboxControl(pageA), updateAndWaitForWorkboxControl(pageB)]);
      await pageA.reload();
      await pageB.reload();

      for (const page of [pageA, pageB]) {
        await expect(homeHeading(page)).toBeVisible();
        await modeCard(page, 'numbers').click();
        await expect(page.getByRole('group', { name: /Relógio digital/i })).toBeVisible();
        await page.getByRole('button', { name: /^Horas:/ }).first().click();
        await expect(page.locator('[data-slot-id][data-filled]').first()).toBeVisible();
      }
    } finally {
      await context.close();
      await server.close();
    }
  });

  test('rollback v7: SW legado v7 remove Workbox e volta offline (spike F0a / F5.1.9)', async ({
    browser,
  }) => {
    ensureRuntimeDist();
    const server = await startSwitchableServer();
    server.setRoot('dist');
    const context = await browser.newContext({ baseURL: server.origin, serviceWorkers: 'allow' });
    const page = await context.newPage();

    try {
      await page.goto('/');
      await expect(homeHeading(page)).toBeVisible();
      await page.evaluate(async () => {
        await navigator.serviceWorker.register('./sw.js');
        await navigator.serviceWorker.ready;
      });
      await waitForWorkboxPrecache(page);

      server.setRoot('legacy');
      server.setLegacyCacheVersion('v7');
      await page.evaluate(async () => {
        const reg = await navigator.serviceWorker.getRegistration();
        const changed = new Promise<void>((resolve) => {
          navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true });
        });
        await reg?.update();
        await Promise.race([changed, new Promise<void>((r) => setTimeout(r, 8_000))]);
      });

      await page.waitForFunction(
        async () => {
          const keys = await caches.keys();
          return keys.includes('relogio-maluco-v7') && !keys.some((k) => k.startsWith('workbox-precache-v2-'));
        },
        undefined,
        { timeout: 25_000 },
      );

      await page.reload();
      await page.waitForFunction(() => document.title.includes('Relógio Maluco'));
      expect(await page.evaluate(async () => (await caches.keys()).slice().sort())).toEqual([
        'relogio-maluco-v7',
      ]);

      await context.setOffline(true);
      await page.reload();
      expect(await page.evaluate(() => navigator.onLine)).toBe(false);
      await playLegacyNumbersOnce(page);
    } finally {
      await context.close();
      await server.close();
    }
  });
});
