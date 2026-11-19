// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { expect, test } from '@playwright/test';

import { openHome, openMode, selectLevel } from './helpers/app.ts';
import { requiresF3Composition } from './helpers/composition.ts';
import { confettiParticles, readyButton, tileButtons } from './helpers/locators.ts';

test.describe('prefers-reduced-motion [F3]', () => {
  test('[F3] confete não monta partículas com reduced motion', async ({ page }, testInfo) => {
    requiresF3Composition(testInfo, 'GameScreen dispara Confetti no acerto; componente já respeita reduced motion');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openHome(page);
    await selectLevel(page, 1);
    await openMode(page, 'numbers');

    // Encaixa fichas até completar a pergunta (tile-first via clique).
    const tiles = tileButtons(page);
    const count = await tiles.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const tile = tiles.nth(i);
      if (await tile.isDisabled()) continue;
      await tile.click();
    }

    // Modo ponteiros usaria Pronto!; números completa ao preencher lacunas.
    if (await readyButton(page).isVisible().catch(() => false)) {
      await readyButton(page).click();
    }

    // Mesmo após acerto/fanfare, nenhum particle node.
    await expect(confettiParticles(page)).toHaveCount(0);
    await expect(page.locator('[data-motion="particle"]')).toHaveCount(0);
  });
});
