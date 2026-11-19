// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { expect, test } from '@playwright/test';

import { openHome } from './helpers/app.ts';
import { requiresF3Composition } from './helpers/composition.ts';
import { APP_COPY, iosInstallTip, menuButton } from './helpers/locators.ts';

const IOS_SAFARI_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

test.describe('Dica iOS [F3]', () => {
  test('[F3] menu mostra tip iOS quando Safari iPhone não-standalone', async ({ browser }, testInfo) => {
    requiresF3Composition(testInfo, 'AppMenu + usePwa.showIosInstallTip (F2b/F2c)');

    const context = await browser.newContext({
      userAgent: IOS_SAFARI_UA,
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      Object.defineProperty(window.navigator, 'standalone', {
        configurable: true,
        get: () => false,
      });
      // Garante matchMedia display-mode browser.
      const originalMatchMedia = window.matchMedia.bind(window);
      window.matchMedia = ((query: string) => {
        if (query.includes('display-mode: standalone')) {
          return {
            matches: false,
            media: query,
            onchange: null,
            addListener() {},
            removeListener() {},
            addEventListener() {},
            removeEventListener() {},
            dispatchEvent() {
              return false;
            },
          } as MediaQueryList;
        }
        return originalMatchMedia(query);
      }) as typeof window.matchMedia;
    });

    try {
      await openHome(page);
      await menuButton(page).click();
      await expect(iosInstallTip(page)).toBeVisible();
      await expect(page.getByText(APP_COPY.menu.iosInstallTip)).toBeVisible();
      // Sem beforeinstallprompt no iOS: item Instalar Chromium não substitui a dica.
      await expect(page.getByRole('button', { name: APP_COPY.menu.install })).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  test('[F3] tip ausente em iOS standalone', async ({ browser }, testInfo) => {
    requiresF3Composition(testInfo, 'showIosInstallTip === false quando standalone (F2c)');

    const context = await browser.newContext({
      userAgent: IOS_SAFARI_UA,
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      Object.defineProperty(window.navigator, 'standalone', {
        configurable: true,
        get: () => true,
      });
      const originalMatchMedia = window.matchMedia.bind(window);
      window.matchMedia = ((query: string) => {
        if (query.includes('display-mode: standalone')) {
          return {
            matches: true,
            media: query,
            onchange: null,
            addListener() {},
            removeListener() {},
            addEventListener() {},
            removeEventListener() {},
            dispatchEvent() {
              return false;
            },
          } as MediaQueryList;
        }
        return originalMatchMedia(query);
      }) as typeof window.matchMedia;
    });

    try {
      await openHome(page);
      await menuButton(page).click();
      await expect(iosInstallTip(page)).toHaveCount(0);
    } finally {
      await context.close();
    }
  });
});
