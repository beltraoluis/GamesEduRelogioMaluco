// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { expect, test } from '@playwright/test';

import { openHome, openMode, returnHome, selectLevel } from './helpers/app.ts';
import { ROUND_LENGTH } from '../src/contracts/index.ts';
import { RESULT_TITLES } from '../src/domain/scoring.ts';
import { solveLevelOneNumbers } from './helpers/clock.ts';
import { requiresF3Composition } from './helpers/composition.ts';
import { APP_COPY, listenButton, nextButton } from './helpers/locators.ts';
import { expectSpeakingAfterListen, installSpeechProbe, readSpeechProbe } from './helpers/speech.ts';

async function speakViaListen(page: import('@playwright/test').Page): Promise<void> {
  await expectSpeakingAfterListen(page, listenButton(page));
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
    await solveLevelOneNumbers(page);
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

    for (let i = 0; i < ROUND_LENGTH; i++) {
      await solveLevelOneNumbers(page);
      await nextButton(page).click();
    }
    await expect(page.getByRole('button', { name: APP_COPY.result.home })).toBeVisible();
    await expect.poll(() => readSpeechProbe(page)).toMatchObject({ speaking: true, lastText: RESULT_TITLES[3] });
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
    await openMode(page, 'hands');
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
