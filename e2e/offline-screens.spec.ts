// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { expect, test } from '@playwright/test';
import { openHome, openMode, openTeachersDialog, returnHome } from './helpers/app';
import { solveLevelOneNumbers } from './helpers/clock';
import { nextButton } from './helpers/locators';
import { waitForServiceWorkerControl } from './helpers/preferences';

test('todas as telas usam o HTML, CSS e sprite do precache', async ({ page, context }, testInfo) => {
  await openHome(page);
  await waitForServiceWorkerControl(page);
  await context.setOffline(true);
  expect((await page.reload())?.fromServiceWorker()).toBe(true);

  const capture = async (name: string) => {
    const emptySpriteLayers = () => page.locator('svg:visible use[href*="sprite.svg"]').evaluateAll(nodes =>
      nodes.filter(node => {
        const bounds = (node as SVGGraphicsElement).getBBox();
        return !bounds.width && !bounds.height;
      }).map(node => node.getAttribute('href')),
    );
    await expect.poll(emptySpriteLayers).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(name + '.png'), fullPage: true });
  };
  const card = page.locator('[data-mode-card="numbers"]');
  await expect(card).toHaveCSS('display', 'flex');
  for (const img of await page.locator('[data-mode-illustration]').all()) {
    expect(await img.evaluate(node => (node as HTMLImageElement).naturalWidth)).toBe(384);
  }
  const hand = page.locator('[data-mascot] use[href$="#tic-hand"]').first();
  await expect.poll(() => hand.evaluate(node => (node as SVGGraphicsElement).getBBox().height)).toBeGreaterThan(0);
  await expect(hand.locator('..')).toHaveCSS('animation-duration', '12s');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(hand.locator('..')).toHaveCSS('animation-name', 'none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await capture('home');
  await openTeachersDialog(page);
  await expect(page.locator('[data-bncc-row]')).toHaveCount(6);
  await capture('educators');
  await page.keyboard.press('Escape');

  for (const mode of ['explore', 'hands', 'words', 'numbers'] as const) {
    await openMode(page, mode);
    if (mode === 'explore') {
      for (const id of ['clock-ticks', 'clock-numbers', 'clock-minutes']) {
        const layer = page.locator('use[href$="#' + id + '"]');
        await expect.poll(() => layer.evaluate(node => (node as SVGGraphicsElement).getBBox().width)).toBeGreaterThan(100);
      }
    }
    await capture(mode);
    if (mode !== 'numbers') await returnHome(page);
  }
  for (let i = 0; i < 8; i++) {
    await solveLevelOneNumbers(page);
    await nextButton(page).click();
  }
  await expect(page.locator('[data-screen="result"]')).toBeVisible();
  await capture('result');
  await returnHome(page);
});

test('mantém a mensagem de recuperação se os dados da página não chegam', async ({ page }) => {
  await page.route('**/', async route => {
    const response = await route.fetch();
    const html = (await response.text()).replace('id="rm-data"', 'id="missing-data"');
    await route.fulfill({ response, body: html });
  });
  const error = page.waitForEvent('pageerror');
  await page.goto('/');
  await error;
  await expect(page.locator('#root')).toContainText('Se não abrir, conecte-se à internet');
});
