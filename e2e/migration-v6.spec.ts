// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { expect, test, type Page } from '@playwright/test';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { requiresF3Composition } from './helpers/composition.ts';
import { homeHeading, modeCard } from './helpers/locators.ts';
import {
  LEGACY_SEEDED_PREFS,
  PREFERENCES_STORAGE_KEY,
  listCacheNames,
  readPreferences,
  waitForServiceWorkerControl,
} from './helpers/preferences.ts';
import { startSwitchableServer } from './helpers/static-server.ts';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function seedLegacyPrefs(page: Page): Promise<void> {
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, JSON.stringify(value));
    },
    {
      key: PREFERENCES_STORAGE_KEY,
      value: {
        level: LEGACY_SEEDED_PREFS.level,
        sound: LEGACY_SEEDED_PREFS.sound,
        voice: LEGACY_SEEDED_PREFS.voice,
        stars: LEGACY_SEEDED_PREFS.stars,
        themeHint: LEGACY_SEEDED_PREFS.themeHint,
      },
    },
  );
}

async function awaitLegacyControl(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => document.title.includes('Relógio Maluco'));
  const script = await waitForServiceWorkerControl(page, 25_000);
  expect(script).toMatch(/sw\.js/);
  await page.waitForFunction(async () => (await caches.keys()).includes('relogio-maluco-v6'));
}

test.describe('Migração legado v6 → React', () => {
  test('1 aba: prefs sobrevivem à troca SW e caches v6 são limpos', async ({ browser }) => {
    expect(existsSync(path.join(REPO_ROOT, 'dist', 'index.html'))).toBe(true);

    const server = await startSwitchableServer();
    server.setRoot('legacy');
    const context = await browser.newContext({ baseURL: server.origin, serviceWorkers: 'allow' });
    const page = await context.newPage();
    const navigations: string[] = [];
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) navigations.push(frame.url());
    });

    try {
      await seedLegacyPrefs(page);
      await awaitLegacyControl(page);

      const before = await readPreferences(page);
      expect(before?.level).toBe(3);
      expect(before?.stars).toMatchObject(LEGACY_SEEDED_PREFS.stars);
      expect(before?.themeHint).toBe('keep-me');

      const navCountBefore = navigations.length;
      server.setRoot('dist');
      await page.evaluate(async () => {
        const reg = await navigator.serviceWorker.getRegistration();
        await reg?.update();
      });

      // Política "A sem reload": zero navegação automática enquanto a aba permanece aberta.
      await page.waitForTimeout(2500);
      expect(navigations.length).toBe(navCountBefore);

      await page.reload();
      await expect(homeHeading(page)).toBeVisible();

      const prefs = await readPreferences(page);
      expect(prefs?.level).toBe(LEGACY_SEEDED_PREFS.level);
      expect(prefs?.sound).toBe(LEGACY_SEEDED_PREFS.sound);
      expect(prefs?.voice).toBe(LEGACY_SEEDED_PREFS.voice);
      expect(prefs?.stars).toMatchObject(LEGACY_SEEDED_PREFS.stars);
      expect(prefs?.themeHint).toBe(LEGACY_SEEDED_PREFS.themeHint);

      // Segundo reload para o Workbox/clientsClaim + cleanup legado estabilizarem.
      await page.reload();
      await page.waitForTimeout(500);
      const caches = await listCacheNames(page);
      expect(caches.some((name) => /^relogio-maluco-v\d+$/.test(name))).toBe(false);
      expect(caches.some((name) => name.startsWith('workbox-precache-v2-'))).toBe(true);
    } finally {
      await context.close();
      await server.close();
    }
  });

  test('[F3] 2 abas: zero reload automático e ambas jogáveis após ativação', async ({
    browser,
  }, testInfo) => {
    requiresF3Composition(testInfo, 'Jogabilidade pós-migração exige ModeCard/GameScreen compostos (F3)');
    expect(existsSync(path.join(REPO_ROOT, 'dist', 'index.html'))).toBe(true);

    const server = await startSwitchableServer();
    server.setRoot('legacy');
    const context = await browser.newContext({ baseURL: server.origin, serviceWorkers: 'allow' });

    try {
      const pageA = await context.newPage();
      const pageB = await context.newPage();
      await seedLegacyPrefs(pageA);
      await seedLegacyPrefs(pageB);

      let autoNav = 0;
      const bump = (page: Page) => {
        page.on('framenavigated', (frame) => {
          if (frame === page.mainFrame()) autoNav += 1;
        });
      };
      bump(pageA);
      bump(pageB);

      await awaitLegacyControl(pageA);
      await awaitLegacyControl(pageB);
      const baseline = autoNav;

      server.setRoot('dist');
      await Promise.all([
        pageA.evaluate(async () => {
          const reg = await navigator.serviceWorker.getRegistration();
          await reg?.update();
        }),
        pageB.evaluate(async () => {
          const reg = await navigator.serviceWorker.getRegistration();
          await reg?.update();
        }),
      ]);

      await pageA.waitForTimeout(2500);
      expect(autoNav).toBe(baseline);

      await pageA.reload();
      await pageB.reload();
      await expect(homeHeading(pageA)).toBeVisible();
      await expect(homeHeading(pageB)).toBeVisible();

      for (const page of [pageA, pageB]) {
        const prefs = await readPreferences(page);
        expect(prefs?.stars).toMatchObject(LEGACY_SEEDED_PREFS.stars);
        await modeCard(page, 'numbers').click();
        await expect(page.getByRole('group', { name: /Relógio digital/i })).toBeVisible();
        const tile = page.getByRole('button', { name: /^Horas:/ }).first();
        await tile.click();
        await expect(page.locator('[data-slot-id][data-filled]').first()).toBeVisible();
      }
    } finally {
      await context.close();
      await server.close();
    }
  });
});
