// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { expect, test } from '@playwright/test';

import { openHome, openMode, selectLevel } from './helpers/app.ts';
import { handAngle, levelOneAnswer, normalizeAngle } from './helpers/clock.ts';
import { requiresF3Composition } from './helpers/composition.ts';
import {
  ANSWER_REGION_LABELS,
  APP_COPY,
  answerRegion,
  levelRadio,
  readyButton,
} from './helpers/locators.ts';
import { PREFERENCES_STORAGE_KEY, listLocalStorageKeys, readPreferences } from './helpers/preferences.ts';

async function tabToTile(page: import('@playwright/test').Page, label: string): Promise<void> {
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  for (let i = 0; i < 24; i++) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => ({
      label: document.activeElement?.getAttribute('aria-label'),
      slotId: document.activeElement?.getAttribute('data-slot-id'),
    }));
    expect(focused.slotId, 'Slot não deve receber foco (tile-first)').toBeNull();
    if (focused.label === label) return;
  }
  throw new Error(`Ficha ${label} não recebeu foco por Tab`);
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

  for (const key of ['Enter', 'Space'] as const) {
    test(`[F3] Tab pula lacunas e ${key} preenche apenas o slot correto`, async ({ page }, testInfo) => {
      requiresF3Composition(testInfo, 'GameScreen + Tile/Slot tile-first (F2a/F2b/F1b)');

      await openHome(page);
      await selectLevel(page, 1);
      await openMode(page, 'numbers');

      const region = answerRegion(page, 'numbers');
      await expect(region).toHaveAttribute('aria-label', ANSWER_REGION_LABELS.numbers);
      await expect(page.getByText(APP_COPY.game.tileFirstHint)).toBeVisible();
      const { hour, minute } = await levelOneAnswer(page);
      const group = key === 'Enter' ? 'hour' : 'minute';
      const label = key === 'Enter' ? `Horas: ${hour}` : `Minutos: ${minute}`;
      const value = key === 'Enter' ? hour : minute;
      const slots = region.locator('[data-slot-id]');
      const slot = region.locator(`[data-slot-id][data-group="${group}"]`);
      await expect(slots).toHaveCount(2);
      await expect(region.locator('[data-slot-id][data-filled]')).toHaveCount(0);
      await expect(slot).toHaveAttribute('aria-label', /: vazia$/);

      await tabToTile(page, label);
      await expect(page.getByRole('button', { name: label, exact: true })).toBeFocused();
      await page.keyboard.press(key);

      await expect(slot).toHaveAttribute('data-filled', '');
      await expect(slot).toHaveText(value);
      await expect(region.locator('[data-slot-id][data-filled]')).toHaveCount(1);
    });
  }

  test('[F3] modo Ponteiros: setas no relógio (cima/baixo minutos, esquerda/direita horas)', async ({
    page,
  }, testInfo) => {
    requiresF3Composition(testInfo, 'AnalogClock teclado + GameScreen hands (F1b/F2a/F2b)');

    await openHome(page);
    await selectLevel(page, 2);
    await openMode(page, 'hands');

    const clock = page.locator('svg[role="group"][tabindex="0"]');
    await expect(clock).toBeVisible();
    await clock.focus();
    await expect(clock).toBeFocused();

    // Nível 2 tem passos de 15 min (90°) e o ponteiro das horas acompanha
    // a fração da hora (7,5°). O relógio da questão começa em minuto zero.
    expect(normalizeAngle(await handAngle(clock, 'minute'))).toBe(0);
    for (const [key, hourDelta, minuteDelta] of [
      ['ArrowUp', 7.5, 90],
      ['ArrowDown', -7.5, -90],
      ['ArrowRight', 30, 0],
      ['ArrowLeft', -30, 0],
    ] as const) {
      const hourBefore = await handAngle(clock, 'hour');
      const minuteBefore = await handAngle(clock, 'minute');
      await page.keyboard.press(key);
      await expect.poll(async () => [
        normalizeAngle(await handAngle(clock, 'hour')),
        normalizeAngle(await handAngle(clock, 'minute')),
      ], { message: key }).toEqual([
        normalizeAngle(hourBefore + hourDelta),
        normalizeAngle(minuteBefore + minuteDelta),
      ]);
    }
    await expect(readyButton(page)).toBeVisible();
  });
});
