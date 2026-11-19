// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { expect, test } from '@playwright/test';

import { openHome, openTeachersDialog } from './helpers/app.ts';
import { requiresF3Composition } from './helpers/composition.ts';
import {
  APP_COPY,
  menuButton,
  resetCancelButton,
  resetConfirmButton,
  resetProgressButton,
  teachersDialog,
  teachersMenuItem,
} from './helpers/locators.ts';
import {
  LEGACY_SEEDED_PREFS,
  PREFERENCES_STORAGE_KEY,
  listLocalStorageKeys,
  readPreferences,
  seedPreferencesOnPage,
} from './helpers/preferences.ts';

test.describe('TeachersDialog confirmação [F3]', () => {
  test('[F3] diálogo nativo: foco inicial, Esc fecha, foco retorna, sem overflow hidden no root', async ({
    page,
  }, testInfo) => {
    requiresF3Composition(testInfo, 'TeachersDialog + AppMenu + useModalDialog (F2b/F1b)');

    await openHome(page);
    await menuButton(page).click();
    const opener = teachersMenuItem(page);
    await opener.click();

    const dialog = teachersDialog(page);
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveJSProperty('open', true);
    await expect(dialog).toHaveAttribute('closedby', 'any');

    // Foco preso no diálogo nativo.
    const focusInside = await page.evaluate(() => {
      const active = document.activeElement;
      const dlg = document.querySelector('dialog[open]');
      return Boolean(dlg && active && dlg.contains(active));
    });
    expect(focusInside).toBe(true);

    const rootOverflow = await page.evaluate(() => ({
      root: getComputedStyle(document.documentElement).overflow,
      body: getComputedStyle(document.body).overflow,
    }));
    expect(rootOverflow.root).not.toBe('hidden');
    expect(rootOverflow.body).not.toBe('hidden');

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    await expect(menuButton(page)).toBeFocused();
  });

  test('[F3] apagar progresso exige confirmação em 2 etapas e preserva nível/som/voz', async ({
    page,
  }, testInfo) => {
    requiresF3Composition(testInfo, 'TeachersDialog reset + preferencesStore (F2b/F1a)');

    await openHome(page);
    await seedPreferencesOnPage(page, {
      level: LEGACY_SEEDED_PREFS.level,
      sound: LEGACY_SEEDED_PREFS.sound,
      voice: LEGACY_SEEDED_PREFS.voice,
      stars: LEGACY_SEEDED_PREFS.stars,
      passthrough: { themeHint: LEGACY_SEEDED_PREFS.themeHint },
    });
    await openTeachersDialog(page);

    await resetProgressButton(page).click();
    await expect(page.getByText(APP_COPY.resetProgress.confirm)).toBeVisible();
    await expect(resetConfirmButton(page)).toBeFocused();

    await resetCancelButton(page).click();
    let prefs = await readPreferences(page);
    expect(prefs?.stars).toMatchObject(LEGACY_SEEDED_PREFS.stars);

    await resetProgressButton(page).click();
    await resetConfirmButton(page).click();

    await expect(page.getByText(APP_COPY.resetProgress.liveMessage)).toBeVisible();
    prefs = await readPreferences(page);
    expect(prefs).not.toBeNull();
    expect(prefs?.stars).toEqual({});
    expect(prefs?.level).toBe(LEGACY_SEEDED_PREFS.level);
    expect(prefs?.sound).toBe(LEGACY_SEEDED_PREFS.sound);
    expect(prefs?.voice).toBe(LEGACY_SEEDED_PREFS.voice);
    expect(prefs?.themeHint).toBe(LEGACY_SEEDED_PREFS.themeHint);
    const keys = await listLocalStorageKeys(page);
    expect(keys.filter((k) => k.startsWith('relogio-maluco'))).toEqual([PREFERENCES_STORAGE_KEY]);
  });
});

