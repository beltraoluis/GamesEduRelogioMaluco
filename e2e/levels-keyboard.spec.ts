// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { expect, test } from '@playwright/test';

import { openHome, openMode, selectLevel } from './helpers/app.ts';
import { requiresF3Composition } from './helpers/composition.ts';
import {
  ANSWER_REGION_LABELS,
  APP_COPY,
  answerRegion,
  levelRadio,
  readyButton,
  tileButtons,
} from './helpers/locators.ts';
import { PREFERENCES_STORAGE_KEY, listLocalStorageKeys, readPreferences } from './helpers/preferences.ts';

async function focusFirstTile(page: import('@playwright/test').Page): Promise<string> {
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  for (let i = 0; i < 16; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) {
        return { label: '', slotId: null as string | null, group: null as string | null };
      }
      return {
        label: el.getAttribute('aria-label') ?? '',
        slotId: el.getAttribute('data-slot-id'),
        group: el.getAttribute('data-group'),
      };
    });
    expect(info.slotId, 'Slot não deve receber foco (tile-first)').toBeNull();
    if (/^(Horas|Minutos|Período):/.test(info.label)) {
      return info.group ?? 'hour';
    }
  }
  throw new Error('nenhuma ficha recebeu foco via Tab');
}

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
    const keys = await listLocalStorageKeys(page);
    expect(keys.filter((k) => k.startsWith('relogio-maluco'))).toEqual([PREFERENCES_STORAGE_KEY]);
  });

  test('[F3] Tab nunca foca lacunas; Enter e Espaço encaixam no grupo certo', async ({ page }, testInfo) => {
    requiresF3Composition(testInfo, 'GameScreen + Tile/Slot tile-first (F2a/F2b/F1b)');

    await openHome(page);
    await selectLevel(page, 1);
    await openMode(page, 'numbers');

    const region = answerRegion(page, 'numbers');
    await expect(region).toBeVisible();
    await expect(region).toHaveAttribute('aria-label', ANSWER_REGION_LABELS.numbers);
    await expect(page.getByText(APP_COPY.game.tileFirstHint)).toBeVisible();

    // Enter
    const groupEnter = await focusFirstTile(page);
    await page.keyboard.press('Enter');
    const filledEnter = region.locator(`[data-slot-id][data-filled][data-group="${groupEnter}"]`).first();
    await expect(filledEnter).toBeVisible();
    await expect(filledEnter).toHaveAttribute('aria-label', new RegExp(groupEnter === 'hour' ? /horas/i : /minutos|período/i));

    // Nova pergunta / próxima se necessário; senão outra ficha com Espaço
    if (await page.getByRole('button', { name: APP_COPY.game.next }).isVisible().catch(() => false)) {
      await page.getByRole('button', { name: APP_COPY.game.next }).click();
    }

    const groupSpace = await focusFirstTile(page);
    await page.keyboard.press('Space');
    await expect(region.locator(`[data-slot-id][data-filled][data-group="${groupSpace}"]`).first()).toBeVisible();
    await expect(tileButtons(page).first()).toBeVisible();
  });

  test('[F3] modo Ponteiros: setas no relógio (cima/baixo minutos, esquerda/direita horas)', async ({
    page,
  }, testInfo) => {
    requiresF3Composition(testInfo, 'AnalogClock teclado + GameScreen hands (F1b/F2a/F2b)');

    await openHome(page);
    await selectLevel(page, 2);
    await openMode(page, 'hands');

    const clock = page.getByRole('group', { name: /Relógio analógico/i }).or(page.locator('svg[role="group"]'));
    await expect(clock.first()).toBeVisible();
    await clock.first().focus();

    const before = await page.evaluate(() => {
      const hour = document.querySelector('[data-hand="hour"]') as SVGGElement | null;
      const minute = document.querySelector('[data-hand="minute"]') as SVGGElement | null;
      return {
        hour: hour?.getAttribute('transform') ?? hour?.style.transform ?? '',
        minute: minute?.getAttribute('transform') ?? minute?.style.transform ?? '',
      };
    });

    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowRight');

    const after = await page.evaluate(() => {
      const hour = document.querySelector('[data-hand="hour"]') as SVGGElement | null;
      const minute = document.querySelector('[data-hand="minute"]') as SVGGElement | null;
      return {
        hour: hour?.getAttribute('transform') ?? hour?.style.transform ?? '',
        minute: minute?.getAttribute('transform') ?? minute?.style.transform ?? '',
      };
    });

    expect(after.hour !== before.hour || after.minute !== before.minute).toBe(true);
    await expect(readyButton(page)).toBeVisible();
  });
});
