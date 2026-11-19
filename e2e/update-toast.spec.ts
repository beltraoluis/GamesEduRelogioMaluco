// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { expect, test } from '@playwright/test';

import { openHome, openMode, returnHome, selectLevel } from './helpers/app.ts';
import { requiresF3Composition } from './helpers/composition.ts';
import { APP_COPY } from './helpers/locators.ts';
import { waitForServiceWorkerControl } from './helpers/preferences.ts';
import { trackMainFrameNavigations } from './helpers/sw.ts';

/**
 * Simula troca de controlador depois que a aba já tinha SW (updateReady).
 * Espelha ADR-003 / useServiceWorkerUpdate: toast só na Home; reload só explícito.
 */
async function simulateControllerUpdate(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const sw = navigator.serviceWorker;
    // Garante que o app “viu” um controller prévio.
    const fake = {
      scriptURL: `${location.origin}/sw.js#updated`,
      state: 'activated',
    } as ServiceWorker;
    Object.defineProperty(sw, 'controller', {
      configurable: true,
      get: () => fake,
    });
    sw.dispatchEvent(new Event('controllerchange'));
  });
}

test.describe('Toast de atualização [F3]', () => {
  test('[F3] toast só na Home; ausente durante partida; reload só em Atualizar agora', async ({
    page,
  }, testInfo) => {
    requiresF3Composition(testInfo, 'UpdateToast + useServiceWorkerUpdate na Home (F2b/F2c)');

    const nav = trackMainFrameNavigations(page);
    await openHome(page);
    expect(await waitForServiceWorkerControl(page)).toMatch(/sw\.js$/);
    await selectLevel(page, 1);

    // Durante a partida o toast não aparece.
    await openMode(page, 'numbers');
    await simulateControllerUpdate(page);
    await expect(page.getByText(APP_COPY.updateToast.title)).toHaveCount(0);
    const midNav = nav.count();

    await returnHome(page);
    await expect(page.getByText(APP_COPY.updateToast.title)).toBeVisible();
    await expect(page.getByRole('button', { name: APP_COPY.updateToast.dismiss })).toBeVisible();
    await expect(page.getByRole('button', { name: APP_COPY.updateToast.apply })).toBeVisible();
    expect(nav.count()).toBe(midNav);

    await page.getByRole('button', { name: APP_COPY.updateToast.dismiss }).click();
    await expect(page.getByText(APP_COPY.updateToast.title)).toHaveCount(0);
    expect(nav.count()).toBe(midNav);

    // Novo sinal → toast de novo; aplicar causa exatamente um reload.
    await simulateControllerUpdate(page);
    await expect(page.getByText(APP_COPY.updateToast.title)).toBeVisible();
    const beforeApply = nav.count();
    await Promise.all([
      page.waitForEvent('domcontentloaded'),
      page.getByRole('button', { name: APP_COPY.updateToast.apply }).click(),
    ]);
    expect(nav.count()).toBe(beforeApply + 1);
  });
});
