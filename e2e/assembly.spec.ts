// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { expect, test, type Page } from '@playwright/test';

const piece = (page: Page, p: number) => page.locator(`[data-piece="${p}"]`);
const target = (page: Page, p: number) => page.locator(`[data-slot-id="assembly-${p}"]`);

test.describe('Monte o relógio — toque no navegador', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test('gestos de toque, seleção, erro corrigível, conclusão e progresso persistente', async ({ page, context }) => {
    await page.goto('/');
    await page.locator('[data-mode-card="assemble"]').tap();
    await expect(page.getByRole('heading', { name: 'Monte o relógio: horas' })).toBeVisible();
    // Eventos enviados ao motor de entrada do Chromium, não dispatchEvent no DOM.
    const cdp = await context.newCDPSession(page);
    await piece(page, 0).scrollIntoViewIfNeeded();
    const from = await piece(page, 0).boundingBox();
    const to = await target(page, 0).boundingBox();
    expect(from).not.toBeNull(); expect(to).not.toBeNull();
    if (!from || !to) throw new Error('Peça e alvo devem estar visíveis');
    const start = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
    const end = { x: to.x + to.width / 2, y: to.y + to.height / 2 };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [end] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await expect(piece(page, 0)).toBeEnabled();
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [end] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(target(page, 0)).toHaveText('12');
    await expect(piece(page, 0)).toBeDisabled();

    await piece(page, 1).tap();
    await expect(piece(page, 1)).toHaveAttribute('aria-pressed', 'true');
    await target(page, 2).tap();
    await expect(page.getByRole('status')).toContainText('Tente outro encaixe');
    await target(page, 1).tap();
    for (let p = 2; p < 12; p++) { await piece(page, p).tap(); await target(page, p).tap(); }
    await page.getByRole('button', { name: 'Montar os minutos' }).tap();
    await expect(page.locator('[data-fixed-hour]')).toHaveCount(12);
    for (let p = 0; p < 11; p++) { await piece(page, p).tap(); await target(page, p).tap(); }
    await expect(page.getByRole('button', { name: 'Ver resultado' })).toHaveCount(0);
    await piece(page, 11).tap(); await target(page, 11).tap();
    await expect(target(page, 0)).toHaveText('00');
    await expect(target(page, 3)).toHaveText('15');
    // Em 320px, todos os alvos permanecem dentro do mostrador, sem sobrepor as horas.
    await page.setViewportSize({ width: 320, height: 740 });
    const geometry = await page.evaluate(() => {
      const outer = document.querySelector('[data-slot-id="assembly-0"]')!.getBoundingClientRect();
      const inner = document.querySelector('[data-fixed-hour="0"]')!.getBoundingClientRect();
      return { width: innerWidth, scroll: document.documentElement.scrollWidth,
        gap: inner.top - outer.bottom, targetWidth: outer.width };
    });
    expect(geometry.scroll).toBe(geometry.width); expect(geometry.gap).toBeGreaterThan(0);
    expect(geometry.targetWidth).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: 'test-results/assembly-mobile-complete.png', fullPage: true });
    await page.getByRole('button', { name: 'Ver resultado' }).tap();
    await expect(page.getByRole('heading', { name: 'Você montou o relógio!' })).toBeVisible();
    await page.getByRole('button', { name: 'Jogar de novo' }).tap();
    await expect(piece(page, 0)).toBeEnabled();
    await page.getByRole('button', { name: 'Voltar ao início' }).tap();
    await page.reload();
    await expect(page.locator('[data-mode-card="assemble"]').getByRole('img', { name: '3 de 3 estrelas' })).toBeVisible();
  });
});
