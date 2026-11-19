// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { expect, test } from '@playwright/test';

import { openHome } from './helpers/app.ts';
import { requiresF3Composition } from './helpers/composition.ts';
import { APP_COPY, iosInstallTip, menuButton } from './helpers/locators.ts';
import { PREVIEW_ORIGIN } from './helpers/paths.ts';

const IOS_SAFARI_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

function installStandaloneStub(standalone: boolean): () => void {
  return () => {
    Object.defineProperty(window.navigator, 'standalone', {
      configurable: true,
      get: () => standalone,
    });
    const originalMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = ((query: string) => {
      if (query.includes('display-mode: standalone')) {
        return {
          matches: standalone,
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
  };
}

test.describe('Dica iOS', () => {
  test.describe('simulação Chromium (UA iPhone + navigator.standalone)', () => {
    test.skip(({ browserName }) => browserName !== 'chromium', 'simulação de UA iOS no Chromium');

    test('[F3] tip visível quando não-standalone', async ({ browser }, testInfo) => {
      requiresF3Composition(testInfo, 'AppMenu + usePwa.showIosInstallTip (F2b/F2c)');

      const context = await browser.newContext({
        baseURL: PREVIEW_ORIGIN,
        userAgent: IOS_SAFARI_UA,
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      });
      const page = await context.newPage();
      await page.addInitScript(installStandaloneStub(false));

      try {
        await openHome(page);
        await menuButton(page).click();
        await expect(iosInstallTip(page)).toBeVisible();
        await expect(page.getByText(APP_COPY.menu.iosInstallTip)).toBeVisible();
        await expect(page.getByRole('button', { name: APP_COPY.menu.install })).toHaveCount(0);
      } finally {
        await context.close();
      }
    });

    test('[F3] tip ausente em standalone simulado', async ({ browser }, testInfo) => {
      requiresF3Composition(testInfo, 'showIosInstallTip === false quando standalone (F2c)');

      const context = await browser.newContext({
        baseURL: PREVIEW_ORIGIN,
        userAgent: IOS_SAFARI_UA,
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      });
      const page = await context.newPage();
      await page.addInitScript(installStandaloneStub(true));

      try {
        await openHome(page);
        await menuButton(page).click();
        await expect(iosInstallTip(page)).toHaveCount(0);
      } finally {
        await context.close();
      }
    });
  });

  test.describe('WebKit / Safari real (projeto webkit)', () => {
    test.skip(({ browserName }) => browserName !== 'webkit', 'requer projeto Playwright webkit');

    test('[F3] tip em iPhone Safari WebKit não-standalone', async ({ browser }, testInfo) => {
      requiresF3Composition(
        testInfo,
        'Mesma asserção da simulação, mas no motor WebKit (capacidade distinta do Chromium UA spoof)',
      );

      const context = await browser.newContext({
        baseURL: PREVIEW_ORIGIN,
        ...{
          userAgent: IOS_SAFARI_UA,
          viewport: { width: 390, height: 844 },
          isMobile: true,
          hasTouch: true,
        },
      });
      const page = await context.newPage();
      await page.addInitScript(installStandaloneStub(false));

      try {
        await openHome(page);
        await menuButton(page).click();
        await expect(iosInstallTip(page)).toBeVisible();
      } finally {
        await context.close();
      }
    });
  });
});
