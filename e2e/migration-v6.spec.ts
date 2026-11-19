// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { expect, test, type Page } from '@playwright/test';

import { requiresF3Composition } from './helpers/composition.ts';
import { handAngle, normalizeAngle } from './helpers/clock.ts';
import { playLegacyNumbersOnce } from './helpers/legacy-play.ts';
import { answerRegion, homeHeading, modeCard } from './helpers/locators.ts';
import {
  LEGACY_SEEDED_PREFS,
  PREFERENCES_STORAGE_KEY,
  assertPreferencesPreserved,
  listCacheNames,
  listLocalStorageKeys,
  readPreferences,
  seedPreferencesOnPage,
  waitForServiceWorkerControl,
} from './helpers/preferences.ts';
import { startSwitchableServer } from './helpers/static-server.ts';
import {
  trackMainFrameNavigations,
  watchControllerChanges,
  waitForLegacyCachesGone,
  waitForWorkboxPrecache,
} from './helpers/sw.ts';

async function openLegacyControlled(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => document.title.includes('Relógio Maluco'));
  const script = await waitForServiceWorkerControl(page, 25_000);
  expect(script).toMatch(/sw\.js/);
  await expect.poll(() => listCacheNames(page)).toContain('relogio-maluco-v6');
}

test.describe('Migração legado v6 → React', () => {
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
      const update = await watchControllerChanges([page]);
      server.setRoot('dist');
      await update();
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

      await waitForLegacyCachesGone(page);
      await waitForWorkboxPrecache(page);
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

      const baseline = [navA.count(), navB.count()];
      const update = await watchControllerChanges([pageA, pageB]);
      server.setRoot('dist');
      await update();
      expect([navA.count(), navB.count()]).toEqual(baseline);

      await playLegacyNumbersOnce(pageA);
      await playLegacyNumbersOnce(pageB);
      expect([navA.count(), navB.count()]).toEqual(baseline);

      await pageA.reload();
      await pageB.reload();
      expect([navA.count(), navB.count()]).toEqual(baseline.map((count) => count + 1));
      await expect(homeHeading(pageA)).toBeVisible();
      await expect(homeHeading(pageB)).toBeVisible();

      for (const page of [pageA, pageB]) {
        assertPreferencesPreserved(await readPreferences(page), expected);
        await waitForLegacyCachesGone(page);
        await waitForWorkboxPrecache(page);
      }
    } finally {
      await context.close();
      await server.close();
    }
  });

  test('[F3] após reload React, ModeCard Números jogável nas 2 abas', async ({ browser }, testInfo) => {
    requiresF3Composition(testInfo, 'ModeCard/GameScreen React pós-migração (F2a+F2b+F3)');

    const server = await startSwitchableServer();
    server.setRoot('legacy');
    const context = await browser.newContext({ baseURL: server.origin, serviceWorkers: 'allow' });
    const pageA = await context.newPage();
    const pageB = await context.newPage();
    try {
      await openLegacyControlled(pageA);
      await openLegacyControlled(pageB);
      await seedPreferencesOnPage(pageA, LEGACY_SEEDED_PREFS, { themeHint: LEGACY_SEEDED_PREFS.themeHint });
      const update = await watchControllerChanges([pageA, pageB]);
      server.setRoot('dist');
      await update();
      await pageA.reload();
      await pageB.reload();

      for (const page of [pageA, pageB]) {
        await expect(homeHeading(page)).toBeVisible();
        await modeCard(page, 'numbers').click();
        const region = answerRegion(page, 'numbers');
        await expect(region).toBeVisible();
        const minutes = normalizeAngle(await handAngle(page.locator('svg[role="group"]'), 'minute')) / 6;
        const value = String(minutes).padStart(2, '0');
        await page.getByRole('button', { name: `Minutos: ${value}`, exact: true }).click();
        await expect(region.locator('[data-slot-id][data-group="minute"][data-filled]')).toHaveText(value);
      }
    } finally {
      await context.close();
      await server.close();
    }
  });

  test('rollback v7: legado volta offline e nova tentativa React remove o v7', async ({
    browser,
  }) => {
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
      await waitForServiceWorkerControl(page);
      await waitForWorkboxPrecache(page);

      const rollback = await watchControllerChanges([page]);
      server.setRoot('legacy');
      server.setLegacyCacheVersion('v7');
      await rollback();

      await expect.poll(() => listCacheNames(page)).toEqual(['relogio-maluco-v7']);

      await page.reload();
      await page.waitForFunction(() => document.title.includes('Relógio Maluco'));
      expect(await page.evaluate(async () => (await caches.keys()).slice().sort())).toEqual([
        'relogio-maluco-v7',
      ]);

      await context.setOffline(true);
      await page.reload();
      expect(await page.evaluate(() => navigator.onLine)).toBe(false);
      await playLegacyNumbersOnce(page);

      await context.setOffline(false);
      const retry = await watchControllerChanges([page]);
      server.setRoot('dist');
      await retry();
      await waitForLegacyCachesGone(page);
      await waitForWorkboxPrecache(page);
      await page.reload();
      await expect(homeHeading(page)).toBeVisible();
      await expect(page.locator('#root')).toBeVisible();
      expect(await listCacheNames(page)).not.toContain('relogio-maluco-v7');
    } finally {
      await context.close();
      await server.close();
    }
  });
});
