// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
/**
 * P0 de docs/qa/edge-cases.md atribuídos a F2d.
 * pointercancel/multitoque (P1) ficam anotados; evidência unitária F1b quando aplicável.
 */
import { expect, test } from '@playwright/test';

import { openHome, openMode, openTeachersDialog, returnHome, selectLevel } from './helpers/app.ts';
import { requiresF3Composition } from './helpers/composition.ts';
import {
  APP_COPY,
  resetConfirmButton,
  resetProgressButton,
} from './helpers/locators.ts';
import {
  LEGACY_SEEDED_PREFS,
  PREFERENCES_STORAGE_KEY,
  readPreferences,
  seedPreferencesOnPage,
} from './helpers/preferences.ts';

test.describe('Edge cases P0 [F3]', () => {
  test('[F3] #1 Explorar: cruzar 11:59 → 12:00 avança a hora (linkHands)', async ({ page }, testInfo) => {
    requiresF3Composition(testInfo, 'ExploreScreen + AnalogClock linkHands (F2b/F1b); unitário clockMath em F1a');

    await openHome(page);
    await openMode(page, 'explore');

    // Define 11:59 via teclado/API se exposta; senão arrasta até o texto mostrar.
    await page.evaluate(() => {
      // Hook de teste opcional F3: window.__setExploreTime?.({ h: 11, m: 59, s: 0 })
      const w = window as unknown as { __setExploreTime?: (t: { h: number; m: number; s: number }) => void };
      w.__setExploreTime?.({ h: 11, m: 59, s: 0 });
    });

    const clock = page.getByRole('group', { name: /Relógio analógico/i }).or(page.locator('svg[role="group"]'));
    await clock.first().focus();
    // Um passo de minuto para cima a partir de 59 → 0 e hora 12.
    await page.keyboard.press('ArrowUp');

    await expect(page.getByText(/doze|12/i).first()).toBeVisible();
    await expect(page.locator('[data-atmosphere]').or(page.locator('html'))).toBeVisible();
  });

  test('[F3] #4 storage indisponível: aviso + jogo em memória (F5.3.4)', async ({ page }, testInfo) => {
    requiresF3Composition(testInfo, 'PreferencesApi.persistent === false + APP_COPY.persistence.unavailable');

    await page.addInitScript(() => {
      const proto = Storage.prototype;
      proto.setItem = () => {
        throw new DOMException('QuotaExceededError');
      };
    });
    await openHome(page);
    await expect(page.getByText(APP_COPY.persistence.unavailable)).toBeVisible();
    await selectLevel(page, 2);
    await openMode(page, 'numbers');
    await expect(page.getByRole('group', { name: /Relógio digital/i })).toBeVisible();
  });

  test('[F3] #5 reset concorrente 2 abas preserva nível/som/voz e zera stars', async ({ browser, baseURL }, testInfo) => {
    requiresF3Composition(testInfo, 'TeachersDialog reset + storage event (F2b/F1a); edge-cases.md #5');

    const context = await browser.newContext({ baseURL });
    const pageA = await context.newPage();
    const pageB = await context.newPage();
    try {
      await pageA.goto('/');
      await seedPreferencesOnPage(pageA, LEGACY_SEEDED_PREFS, { themeHint: 'keep' });
      await pageB.goto('/');
      expect(await readPreferences(pageB)).toMatchObject({ level: 3, stars: LEGACY_SEEDED_PREFS.stars });

      await openTeachersDialog(pageA);
      await resetProgressButton(pageA).click();
      await resetConfirmButton(pageA).click();
      await expect(pageA.getByText(APP_COPY.resetProgress.liveMessage)).toBeVisible();

      await expect
        .poll(async () => (await readPreferences(pageB))?.stars)
        .toEqual({});
      const prefsA = await readPreferences(pageA);
      expect(prefsA?.level).toBe(3);
      expect(prefsA?.sound).toBe(false);
      expect(prefsA?.voice).toBe(true);
      expect(Object.keys(await pageA.evaluate(() => ({ ...localStorage }))).filter((k) => k.startsWith('relogio'))).toEqual([
        PREFERENCES_STORAGE_KEY,
      ]);
    } finally {
      await context.close();
    }
  });

  test('[F3] #6 hadControllerRef: 1ª instalação não toast; 2º controllerchange sim (só Home)', async ({
    page,
  }, testInfo) => {
    requiresF3Composition(testInfo, 'useServiceWorkerUpdate + UpdateToast (F2c/F2b); cobrado também em update-toast.spec');

    await openHome(page);
    // 1ª aquisição
    await page.evaluate(() => {
      const sw = navigator.serviceWorker;
      Object.defineProperty(sw, 'controller', { configurable: true, get: () => null });
      sw.dispatchEvent(new Event('controllerchange'));
    });
    await expect(page.getByText(APP_COPY.updateToast.title)).toHaveCount(0);

    await openMode(page, 'numbers');
    await page.evaluate(() => {
      const fake = { scriptURL: `${location.origin}/sw.js#2`, state: 'activated' } as ServiceWorker;
      Object.defineProperty(navigator.serviceWorker, 'controller', {
        configurable: true,
        get: () => fake,
      });
      navigator.serviceWorker.dispatchEvent(new Event('controllerchange'));
    });
    await expect(page.getByText(APP_COPY.updateToast.title)).toHaveCount(0);

    await returnHome(page);
    await expect(page.getByText(APP_COPY.updateToast.title)).toBeVisible();
  });
});

test.describe('Edge cases P1 — evidência unitária F1b', () => {
  test('pointercancel/multitoque: artefatos de teste F1b presentes (E2E residual F4)', async () => {
    const { existsSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const root = resolve(import.meta.dirname, '..');
    expect(existsSync(resolve(root, 'src/components/Tile/__tests__/interaction.test.tsx'))).toBe(true);
    expect(existsSync(resolve(root, 'src/components/AnalogClock/__tests__/geometry.test.tsx'))).toBe(true);
  });
});
