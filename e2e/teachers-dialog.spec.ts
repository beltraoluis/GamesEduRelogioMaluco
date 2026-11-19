// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { expect, test } from '@playwright/test';

import { openHome, openTeachersDialog } from './helpers/app.ts';
import { requiresF3Composition } from './helpers/composition.ts';
import {
  APP_COPY,
  resetCancelButton,
  resetConfirmButton,
  resetProgressButton,
  teachersDialog,
} from './helpers/locators.ts';
import {
  LEGACY_SEEDED_PREFS,
  PREFERENCES_STORAGE_KEY,
  readPreferences,
  seedPreferences,
} from './helpers/preferences.ts';

test.describe('TeachersDialog confirmação [F3]', () => {
  test('[F3] diálogo nativo abre, Esc fecha e não trava overflow no root', async ({ page }, testInfo) => {
    requiresF3Composition(testInfo, 'TeachersDialog + AppMenu (F2b)');

    await openHome(page);
    await openTeachersDialog(page);

    const dialog = teachersDialog(page);
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveJSProperty('open', true);
    // closedby="any" (com fallback) — atributo esperado no contrato useModalDialog.
    await expect(dialog).toHaveAttribute('closedby', 'any');

    const rootOverflow = await page.evaluate(() => {
      const root = document.documentElement;
      const body = document.body;
      return {
        root: getComputedStyle(root).overflow,
        body: getComputedStyle(body).overflow,
      };
    });
    expect(rootOverflow.root).not.toBe('hidden');
    expect(rootOverflow.body).not.toBe('hidden');

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('[F3] apagar progresso exige confirmação em 2 etapas e preserva nível/som/voz', async ({
    page,
  }, testInfo) => {
    requiresF3Composition(testInfo, 'TeachersDialog reset + preferencesStore (F2b/F1a)');

    await seedPreferences(page, {
      level: LEGACY_SEEDED_PREFS.level,
      sound: LEGACY_SEEDED_PREFS.sound,
      voice: LEGACY_SEEDED_PREFS.voice,
      stars: LEGACY_SEEDED_PREFS.stars,
      passthrough: { themeHint: LEGACY_SEEDED_PREFS.themeHint },
    });
    await openHome(page);
    await openTeachersDialog(page);

    await resetProgressButton(page).click();
    await expect(page.getByText(APP_COPY.resetProgress.confirm)).toBeVisible();

    // Cancelar na 2ª etapa não apaga estrelas.
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
    expect(PREFERENCES_STORAGE_KEY).toBe('relogio-maluco-v1');
  });
});
