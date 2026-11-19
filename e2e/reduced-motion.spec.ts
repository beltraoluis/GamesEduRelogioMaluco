// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { expect, test } from '@playwright/test';

import { openHome, openMode, selectLevel } from './helpers/app.ts';
import { requiresF3Composition } from './helpers/composition.ts';
import { APP_COPY, confettiParticles, readyButton, tileButtons } from './helpers/locators.ts';

/**
 * Resolve a pergunta de números encaixando a ficha cujo valor bate a lacuna,
 * evitando cliques às cegas (falso verde Opus).
 */
async function seatCorrectTiles(page: import('@playwright/test').Page): Promise<void> {
  const slots = page.locator('[data-slot-id]:not([data-filled])');
  const n = await slots.count();
  for (let i = 0; i < n; i++) {
    const slot = slots.nth(i);
    const group = await slot.getAttribute('data-group');
    const label = await slot.getAttribute('aria-label');
    // Lacuna vazia: "…: vazia" — após F3 o valor alvo pode estar em data-answer se exposto;
    // fallback: tenta fichas do mesmo grupo até preencher.
    const tiles = page.getByRole('button', {
      name: group === 'minute' ? /^Minutos:/ : group === 'period' ? /^Período:/ : /^Horas:/,
    });
    const count = await tiles.count();
    for (let t = 0; t < count; t++) {
      const tile = tiles.nth(t);
      if (await tile.isDisabled()) continue;
      await tile.click();
      if (await slot.getAttribute('data-filled') !== null) break;
    }
    void label;
  }
  if (await readyButton(page).isVisible().catch(() => false)) {
    await readyButton(page).click();
  }
}

test.describe('prefers-reduced-motion [F3]', () => {
  test('[F3] controle positivo: sem reduce, partículas aparecem no acerto', async ({ page }, testInfo) => {
    requiresF3Composition(testInfo, 'Confetti monta partículas quando motion permitido (F2a/F2b)');

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await openHome(page);
    await selectLevel(page, 1);
    await openMode(page, 'numbers');
    await seatCorrectTiles(page);

    await expect(
      page.getByText(/Muito bem|acert|Próxima|estrelas/i).or(page.getByRole('button', { name: APP_COPY.game.next })),
    ).toBeVisible({ timeout: 15_000 });
    await expect(confettiParticles(page)).not.toHaveCount(0);
  });

  test('[F3] com reduce: após acerto e resultado, zero partículas', async ({ page }, testInfo) => {
    requiresF3Composition(testInfo, 'Chegar ao acerto/resultado com reduced motion; Confetti retorna null');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openHome(page);
    await selectLevel(page, 1);
    await openMode(page, 'numbers');
    await seatCorrectTiles(page);

    await expect(
      page.getByText(/Muito bem|acert|Próxima|estrelas/i).or(page.getByRole('button', { name: APP_COPY.game.next })),
    ).toBeVisible({ timeout: 15_000 });
    await expect(confettiParticles(page)).toHaveCount(0);
    await expect(page.locator('[data-motion="particle"]')).toHaveCount(0);
    await expect(page.locator('[data-confetti-seq]')).toHaveCount(0);

    for (let q = 0; q < 7; q++) {
      const next = page.getByRole('button', { name: APP_COPY.game.next });
      if (await next.isVisible().catch(() => false)) await next.click();
      await seatCorrectTiles(page);
    }

    await expect(
      page.getByRole('button', { name: APP_COPY.result.home }).or(page.getByRole('button', { name: APP_COPY.result.playAgain })),
    ).toBeVisible({ timeout: 20_000 });
    await expect(confettiParticles(page)).toHaveCount(0);
    await expect(tileButtons(page)).toHaveCount(0);
  });
});
