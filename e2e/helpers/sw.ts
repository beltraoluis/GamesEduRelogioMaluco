// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { expect, type Page } from '@playwright/test';

/** Contador de navegações do main frame (reload automático vs explícito). */
export function trackMainFrameNavigations(page: Page): { readonly count: () => number } {
  let n = 0;
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) n += 1;
  });
  return { count: () => n };
}

/** Arma todas as abas enquanto a versão anterior ainda está sendo servida. */
export async function watchControllerChanges(pages: readonly Page[]): Promise<() => Promise<void>> {
  const watches = await Promise.all(pages.map((page) => page.evaluateHandle(() => {
    const workers = navigator.serviceWorker;
    const previous = workers.controller;
    if (!previous) throw new Error('A página precisa estar controlada antes da atualização');
    const changed = new Promise<ServiceWorker>((resolve) => {
      workers.addEventListener('controllerchange', () => {
        const current = workers.controller;
        if (current && current !== previous) resolve(current);
      });
    });
    return { previous, changed };
  })));

  return async () => {
    const [first] = pages;
    if (!first) throw new Error('Nenhuma página observada');
    try {
      await first.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) throw new Error('Registro do service worker ausente');
        await registration.update();
      });
      await Promise.all(watches.map(async (watch) => {
        const evidence = await watch.evaluate(async ({ previous, changed }) => {
          let timer: ReturnType<typeof setTimeout> | undefined;
          try {
            const current = await Promise.race([
              changed,
              new Promise<never>((_, reject) => {
                timer = setTimeout(() => reject(new Error('controllerchange não substituiu o controller')), 20_000);
              }),
            ]);
            const registration = await navigator.serviceWorker.getRegistration();
            return {
              changedIdentity: current !== previous,
              controlsPage: current === navigator.serviceWorker.controller,
              isActive: current === registration?.active,
              sameScriptURL: current.scriptURL === previous.scriptURL,
            };
          } finally {
            clearTimeout(timer);
          }
        });
        expect(evidence).toEqual({
          changedIdentity: true,
          controlsPage: true,
          isActive: true,
          sameScriptURL: true,
        });
      }));
    } finally {
      await Promise.all(watches.map((watch) => watch.dispose()));
    }
  };
}

export async function waitForLegacyCachesGone(page: Page): Promise<void> {
  await expect.poll(() => page.evaluate(() => caches.keys()), { timeout: 20_000 })
    .not.toEqual(expect.arrayContaining([expect.stringMatching(/^relogio-maluco-v\d+$/)]));
}

export async function waitForWorkboxPrecache(page: Page): Promise<void> {
  await expect.poll(() => page.evaluate(() => caches.keys()), { timeout: 20_000 })
    .toEqual(expect.arrayContaining([expect.stringMatching(/^workbox-precache-v2-/)]));
}

export async function registerServiceWorker(page: Page, script = './sw.js'): Promise<string | null> {
  await page.evaluate(async (sw) => {
    await navigator.serviceWorker.register(sw);
    await navigator.serviceWorker.ready;
  }, script);
  return page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? null);
}
