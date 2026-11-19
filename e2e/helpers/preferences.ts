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
} as const;

export function buildSeedPayload(
  prefs: SeedPreferences,
  extras: Readonly<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    level: prefs.level ?? 1,
    sound: prefs.sound ?? true,
    voice: prefs.voice ?? true,
    stars: prefs.stars ?? {},
    ...(prefs.passthrough ?? {}),
    ...extras,
  };
}

/**
 * Semear UMA vez via evaluate APÓS o primeiro goto.
 * NÃO usar addInitScript aqui: ele regrava a cada navegação e torna
 * "prefs sobrevivem ao reload" tautológico (parecer Opus).
 */
export async function seedPreferencesOnPage(
  page: Page,
  prefs: SeedPreferences,
  extras: Readonly<Record<string, unknown>> = {},
): Promise<Record<string, unknown>> {
  const payload = buildSeedPayload(prefs, extras);
  await page.evaluate(
    ({ key, value }) => {
      window.localStorage.setItem(key, JSON.stringify(value));
    },
    { key: PREFERENCES_STORAGE_KEY, value: payload },
  );
  return payload;
}

/** @deprecated use seedPreferencesOnPage after goto — kept for non-migration screens that need pre-nav seed intentionally. */
export async function seedPreferences(page: Page, prefs: SeedPreferences): Promise<void> {
  const payload = buildSeedPayload(prefs);
  await page.addInitScript(
    ({ key, value }) => {
      // Guarda de execução única por documento — ainda assim preferir seedPreferencesOnPage.
      const marker = `${key}::__seeded__`;
      if (window.sessionStorage.getItem(marker) === '1') return;
      window.localStorage.setItem(key, JSON.stringify(value));
      window.sessionStorage.setItem(marker, '1');
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

export async function listLocalStorageKeys(page: Page): Promise<string[]> {
  return page.evaluate(() => Object.keys(window.localStorage).sort());
}

/**
 * Guarda anti-perda: se as estrelas/token sumissem, estas asserções falhariam.
 */
export function assertPreferencesPreserved(
  actual: Record<string, unknown> | null,
  expected: Record<string, unknown>,
): void {
  if (actual === null) {
    throw new Error('preferências ausentes após migração (perda total)');
  }
  if (JSON.stringify(actual.stars ?? null) !== JSON.stringify(expected.stars ?? null)) {
    throw new Error(
      `estrelas não preservadas: expected ${JSON.stringify(expected.stars)} got ${JSON.stringify(actual.stars)}`,
    );
  }
  if (actual.level !== expected.level) {
    throw new Error(`nível não preservado: expected ${String(expected.level)} got ${String(actual.level)}`);
  }
  if (actual.sound !== expected.sound || actual.voice !== expected.voice) {
    throw new Error('som/voz não preservados');
  }
  for (const [key, value] of Object.entries(expected)) {
    if (key === 'stars' || key === 'level' || key === 'sound' || key === 'voice') continue;
    if (actual[key] !== value) {
      throw new Error(`passthrough "${key}" perdido (demonstra que perda falharia neste assert)`);
    }
  }
}

export async function waitForServiceWorkerControl(page: Page, timeoutMs = 20_000): Promise<string | null> {
  return page.evaluate(async (timeout) => {
    if (!('serviceWorker' in navigator)) return null;
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const controller = navigator.serviceWorker.controller;
      if (controller?.scriptURL) return controller.scriptURL;
      await new Promise((r) => setTimeout(r, 50));
    }
    return navigator.serviceWorker.controller?.scriptURL ?? null;
  }, timeoutMs);
}

export async function listCacheNames(page: Page): Promise<string[]> {
  return page.evaluate(async () => (await caches.keys()).slice().sort());
}

/** Match Workbox revisioned URLs (`?__WB_REVISION__=`). */
export async function cacheHasUrl(page: Page, url: string): Promise<boolean> {
  return page.evaluate(async (target) => {
    const keys = await caches.keys();
    const wb = keys.find((k) => k.startsWith('workbox-precache-v2-'));
    if (!wb) return false;
    const cache = await caches.open(wb);
    const hit = await cache.match(target, { ignoreSearch: true });
    return Boolean(hit);
  }, url);
}
