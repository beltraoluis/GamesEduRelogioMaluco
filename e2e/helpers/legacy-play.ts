// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { expect, type Page } from '@playwright/test';

/**
 * Smoke jogável no UI legado ainda em memória (pós-`clientsClaim`, pré-reload).
 * Espelha o ensaio F0a: abre Números e encaixa a ficha correta da lacuna de horas.
 */
export async function playLegacyNumbersOnce(page: Page): Promise<{ readonly hourValue: string }> {
  const numbers = page.locator('.mode-numbers, button.mode-numbers, .mode.mode-numbers').or(
    page.getByRole('button', { name: /Números/i }),
  );
  await expect(numbers.first()).toBeVisible({ timeout: 10_000 });
  await numbers.first().click();

  const hourSlot = page.locator('#answer .slot.slot-hour, #answer .slot[data-group="hour"]').first();
  await expect(hourSlot).toBeVisible({ timeout: 10_000 });
  const answer = await hourSlot.getAttribute('data-answer');
  expect(answer, 'lacuna de horas do legado deve expor data-answer').toBeTruthy();

  const tile = page.locator(
    `#banks .tile[data-group="hour"][data-value="${answer}"], button.tile[data-group="hour"][data-value="${answer}"]`,
  ).first();
  await expect(tile).toBeVisible();
  await tile.click();

  await expect(hourSlot).toHaveClass(/filled/);
  await expect(tile).toBeDisabled();
  return { hourValue: answer as string };
}
