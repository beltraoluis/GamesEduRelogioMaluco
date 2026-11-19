// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import type { Page } from '@playwright/test';

import { PREFERENCES_STORAGE_KEY } from '../../src/contracts/index.ts';

export { PREFERENCES_STORAGE_KEY };

export interface SeedPreferences {
  readonly level?: 1 | 2 | 3 | 4;
  readonly sound?: boolean;
  readonly voice?: boolean;
  readonly stars?: Readonly<Record<string, 1 | 2 | 3>>;
  readonly passthrough?: Readonly<Record<string, unknown>>;
}

/** Preferências legadas típicas a preservar na migração v6 → React. */
export const LEGACY_SEEDED_PREFS = {
  level: 3 as const,
  sound: false,
  voice: true,
  stars: { 'numbers-1': 3, 'words-2': 2, 'hands-3': 1 } as const,
  themeHint: 'keep-me',
};

export async function seedPreferences(page: Page, prefs: SeedPreferences): Promise<void> {
  const payload = {
    level: prefs.level ?? 1,
    sound: prefs.sound ?? true,
    voice: prefs.voice ?? true,
    stars: prefs.stars ?? {},
    ...(prefs.passthrough ?? {}),
  };
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, JSON.stringify(value));
    },
    { key: PREFERENCES_STORAGE_KEY, value: payload },
  );
}

export async function readPreferences(page: Page): Promise<Record<string, unknown> | null> {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return { __parseError: raw };
    }
  }, PREFERENCES_STORAGE_KEY);
}

export async function waitForServiceWorkerControl(page: Page, timeoutMs = 20_000): Promise<string | null> {
  return page.evaluate(async (timeout) => {
    if (!('serviceWorker' in navigator)) return null;
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const reg = await navigator.serviceWorker.getRegistration();
      const controller = navigator.serviceWorker.controller;
      if (controller?.scriptURL) return controller.scriptURL;
      if (reg?.active?.scriptURL && !controller) {
        // clientsClaim may still be racing
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    return navigator.serviceWorker.controller?.scriptURL ?? null;
  }, timeoutMs);
}

export async function listCacheNames(page: Page): Promise<string[]> {
  return page.evaluate(async () => (await caches.keys()).slice().sort());
}
