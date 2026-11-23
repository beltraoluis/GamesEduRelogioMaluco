// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { expect, type Locator, type Page } from '@playwright/test';
import { answerRegion, nextButton } from './locators.ts';

export async function handAngle(clock: Locator, hand: 'hour' | 'minute'): Promise<number> {
  const degrees = await clock.locator(`[data-hand="${hand}"]`).evaluate(
    (node) => (node as SVGGElement).style.transform,
  );
  const rotation = /^rotate\((-?[\d.]+)deg\)$/.exec(degrees);
  expect(rotation, `Rotação da mão ${hand}`).not.toBeNull();
  return Number(rotation?.[1]);
}

export const normalizeAngle = (angle: number): number => ((angle % 360) + 360) % 360;

/** Lê o mostrador do nível 1 (horas inteiras) e seleciona as fichas correspondentes. */
export async function levelOneAnswer(page: Page): Promise<{ hour: string; minute: string }> {
  const clock = page.locator('svg[role="group"]');
  await expect(clock).toBeVisible();
  const hourAngle = normalizeAngle(await handAngle(clock, 'hour'));
  const minuteAngle = normalizeAngle(await handAngle(clock, 'minute'));
  expect(hourAngle % 30).toBe(0);
  expect(minuteAngle).toBe(0);
  return { hour: String(hourAngle / 30 || 12).padStart(2, '0'), minute: '00' };
}

export async function solveLevelOneNumbers(page: Page): Promise<void> {
  const { hour, minute } = await levelOneAnswer(page);
  const region = answerRegion(page, 'numbers');
  const slots = region.locator('[data-slot-id]');
  await expect(slots).toHaveCount(2);
  await expect(region.locator('[data-slot-id][data-filled]')).toHaveCount(0);
  for (const [group, label, value] of [['hour', 'Horas', hour], ['minute', 'Minutos', minute]]) {
    await page.getByRole('button', { name: `${label}: ${value}`, exact: true }).click();
    const slot = region.locator(`[data-slot-id][data-group="${group}"]`);
    await expect(slot).toHaveAttribute('data-filled', '');
    await expect(slot).toHaveText(value);
  }
  await expect(nextButton(page)).toBeEnabled();
}
