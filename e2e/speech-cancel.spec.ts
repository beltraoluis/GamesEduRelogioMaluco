// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { expect, test } from '@playwright/test';

import { openHome, openMode, returnHome, selectLevel } from './helpers/app.ts';
import { requiresF3Composition } from './helpers/composition.ts';
import { APP_COPY, listenButton } from './helpers/locators.ts';
import { installSpeechProbe, readSpeechProbe } from './helpers/speech.ts';

async function speakViaListen(page: import('@playwright/test').Page): Promise<void> {
  await listenButton(page).click();
  await page.waitForFunction(() => (window.__speechProbe?.speakCount ?? 0) > 0);
}

test.describe('Voz cancelada nas saídas [F3]', () => {
  test.beforeEach(async ({ page }) => {
    await installSpeechProbe(page);
  });

  test('[F3] cancel() isolado ao voltar do jogo (sem misturar visibility)', async ({ page }, testInfo) => {
    requiresF3Composition(testInfo, 'rota game→home chama speech.cancel (F2a)');

    await openHome(page);
    await selectLevel(page, 1);
    await openMode(page, 'numbers');
    await speakViaListen(page);
    const before = await readSpeechProbe(page);

    await returnHome(page);
    const after = await readSpeechProbe(page);
    expect(after.cancelCount).toBeGreaterThan(before.cancelCount);
    expect(after.speaking).toBe(false);
  });

  test('[F3] cancel() isolado ao sair do Explorar', async ({ page }, testInfo) => {
    requiresF3Composition(testInfo, 'ExploreScreen unmount/voltar cancela voz (F2a/F2b)');

    await openHome(page);
    await openMode(page, 'explore');
    await speakViaListen(page);
    const before = await readSpeechProbe(page);

    await returnHome(page);
    const after = await readSpeechProbe(page);
    expect(after.cancelCount).toBeGreaterThan(before.cancelCount);
    expect(after.speaking).toBe(false);
  });

  test('[F3] cancel() ao sair do Resultado', async ({ page }, testInfo) => {
    requiresF3Composition(testInfo, 'ResultScreen → Home cancela voz (legado falhava aqui; F2a)');

    await openHome(page);
    await selectLevel(page, 1);
    await openMode(page, 'numbers');

    // Completa a rodada até a tela de resultado (8 perguntas) — F3 wiring.
    for (let i = 0; i < 8; i++) {
      const tiles = page.getByRole('button', { name: /^(Horas|Minutos|Período):/ });
      const n = await tiles.count();
      for (let t = 0; t < n; t++) {
        const tile = tiles.nth(t);
        if (!(await tile.isDisabled())) await tile.click();
      }
      const next = page.getByRole('button', { name: APP_COPY.game.next });
      if (await next.isVisible().catch(() => false)) await next.click();
    }

    await expect(page.getByRole('button', { name: APP_COPY.result.home })).toBeVisible();
    await speakViaListen(page).catch(async () => {
      // Resultado pode falar sozinho no fanfare; garante speakCount > 0.
      await page.waitForFunction(() => (window.__speechProbe?.speakCount ?? 0) > 0);
    });
    const before = await readSpeechProbe(page);
    await page.getByRole('button', { name: APP_COPY.result.home }).click();
    await expect(page.getByRole('heading', { name: APP_COPY.home.title })).toBeVisible();
    const after = await readSpeechProbe(page);
    expect(after.cancelCount).toBeGreaterThan(before.cancelCount);
    expect(after.speaking).toBe(false);
  });

  test('[F3] cancel() só por visibilitychange/pagehide (evento isolado)', async ({ page }, testInfo) => {
    requiresF3Composition(testInfo, 'useSpeech listeners de visibility/pagehide (F1b); tela que fale (F3)');

    await openHome(page);
    await selectLevel(page, 1);
    await openMode(page, 'words');
    await speakViaListen(page);
    const before = await readSpeechProbe(page);

    // Isolado: não navega; só dispara os eventos de ciclo de vida.
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    let after = await readSpeechProbe(page);
    expect(after.cancelCount).toBeGreaterThan(before.cancelCount);
    expect(after.speaking).toBe(false);

    // Reabre fala e valida pagehide isolado.
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await speakViaListen(page);
    const mid = await readSpeechProbe(page);
    await page.evaluate(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    after = await readSpeechProbe(page);
    expect(after.cancelCount).toBeGreaterThan(mid.cancelCount);
    expect(after.speaking).toBe(false);
  });
});
