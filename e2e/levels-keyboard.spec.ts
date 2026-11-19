// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { expect, test } from '@playwright/test';

import { openHome, openMode, selectLevel } from './helpers/app.ts';
import { requiresF3Composition } from './helpers/composition.ts';
import { APP_COPY, answerRegion, levelRadio, tileButtons } from './helpers/locators.ts';
import { PREFERENCES_STORAGE_KEY, readPreferences } from './helpers/preferences.ts';

test.describe('Níveis (radio) e teclado tile-first [F3]', () => {
  test('[F3] LevelSelector expõe 4 radios e persiste o nível escolhido', async ({ page }, testInfo) => {
    requiresF3Composition(testInfo, 'LevelSelector + preferences wiring na Home (F2b/F2a)');

    await openHome(page);

    for (const id of [1, 2, 3, 4] as const) {
      await selectLevel(page, id);
      await expect(levelRadio(page, id)).toBeChecked();
      await expect(levelRadio(page, id)).toHaveAttribute('type', 'radio');
    }

    const prefs = await readPreferences(page);
    expect(prefs).not.toBeNull();
    expect(prefs?.level).toBe(4);
    expect(PREFERENCES_STORAGE_KEY).toBe('relogio-maluco-v1');
  });

  test('[F3] no modo Números, Tab foca fichas (tile-first) e nunca lacunas', async ({ page }, testInfo) => {
    requiresF3Composition(testInfo, 'GameScreen + Tile/Slot tile-first (F2a/F2b/F1b)');

    await openHome(page);
    await selectLevel(page, 1);
    await openMode(page, 'numbers');

    await expect(answerRegion(page, 'numbers')).toBeVisible();
    await expect(page.getByText(APP_COPY.game.tileFirstHint)).toBeVisible();

    // Slots não são focáveis: Tab a partir do corpo deve cair em fichas/botões de ação.
    await page.locator('body').click({ position: { x: 1, y: 1 } });

    let seatedTile = false;
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) {
          return { tag: 'BODY', label: '', slotId: null as string | null };
        }
        return {
          tag: el.tagName,
          label: el.getAttribute('aria-label') ?? '',
          slotId: el.getAttribute('data-slot-id'),
        };
      });
      expect(info.slotId, 'Slot não deve receber foco (tile-first)').toBeNull();
      if (/^(Horas|Minutos|Período):/.test(info.label)) {
        await page.keyboard.press('Enter');
        await expect(answerRegion(page, 'numbers').locator('[data-slot-id][data-filled]').first()).toBeVisible();
        seatedTile = true;
        break;
      }
    }

    expect(seatedTile).toBe(true);
    await expect(tileButtons(page).first()).toBeVisible();
  });
});
