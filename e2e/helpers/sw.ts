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

/**
 * Dispara `registration.update()` e espera ativação/controllerchange sem sleep fixo.
 * Resolve quando o controller ativo serve um SW Workbox (ou o script deixa de ser o legado v6 puro).
 */
export async function updateAndWaitForWorkboxControl(page: Page, timeoutMs = 25_000): Promise<string> {
  const scriptURL = await page.evaluate(async (timeout) => {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) throw new Error('no service worker registration');

    const isWorkbox = async (url: string | undefined): Promise<boolean> => {
      if (!url) return false;
      try {
        const text = await fetch(url, { cache: 'no-store' }).then((r) => r.text());
        return /workbox|precacheAndRoute|importScripts\(["']sw-legacy-cleanup/.test(text);
      } catch {
        return false;
      }
    };

    const waitControllerChange = new Promise<void>((resolve) => {
      navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true });
    });

    const waitActiveWorkbox = (async () => {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        const current = await navigator.serviceWorker.getRegistration();
        const candidate =
          current?.active?.scriptURL ??
          navigator.serviceWorker.controller?.scriptURL ??
          current?.waiting?.scriptURL ??
          current?.installing?.scriptURL;
        if (await isWorkbox(candidate)) {
          // Garante claim: se ainda não há controller, espera o evento.
          if (!navigator.serviceWorker.controller) {
            await waitControllerChange;
          }
          return navigator.serviceWorker.controller?.scriptURL ?? candidate ?? '';
        }
        await new Promise((r) => setTimeout(r, 50));
      }
      throw new Error('timed out waiting for Workbox SW');
    })();

    await reg.update();
    return waitActiveWorkbox;
  }, timeoutMs);

  expect(scriptURL).toMatch(/sw\.js/);
  return scriptURL;
}

/** Espera o cache legado `relogio-maluco-v*` desaparecer após o cleanup. */
export async function waitForLegacyCachesGone(page: Page, timeoutMs = 20_000): Promise<string[]> {
  await page.waitForFunction(
    async () => {
      const keys = await caches.keys();
      return !keys.some((k) => /^relogio-maluco-v\d+$/.test(k));
    },
    undefined,
    { timeout: timeoutMs },
  );
  return page.evaluate(async () => (await caches.keys()).slice().sort());
}

export async function waitForWorkboxPrecache(page: Page, timeoutMs = 20_000): Promise<string[]> {
  await page.waitForFunction(
    async () => {
      const keys = await caches.keys();
      return keys.some((k) => k.startsWith('workbox-precache-v2-'));
    },
    undefined,
    { timeout: timeoutMs },
  );
  return page.evaluate(async () => (await caches.keys()).slice().sort());
}

export async function registerServiceWorker(page: Page, script = './sw.js'): Promise<string | null> {
  await page.evaluate(async (sw) => {
    await navigator.serviceWorker.register(sw);
    await navigator.serviceWorker.ready;
  }, script);
  return page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? null);
}
