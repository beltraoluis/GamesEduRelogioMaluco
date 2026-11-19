// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { expect, test } from '@playwright/test';

import { openHome, openMode, returnHome, selectLevel } from './helpers/app.ts';
import { requiresF3Composition } from './helpers/composition.ts';
import { listenButton } from './helpers/locators.ts';
import { installSpeechProbe, readSpeechProbe } from './helpers/speech.ts';

test.describe('Voz cancelada nas saídas [F3]', () => {
  test.beforeEach(async ({ page }) => {
    await installSpeechProbe(page);
  });

  test('[F3] cancel() ao voltar do jogo para a Home', async ({ page }, testInfo) => {
    requiresF3Composition(testInfo, 'useGameController + useSpeech.cancel nas rotas de saída (F2a)');

    await openHome(page);
    await selectLevel(page, 1);
    await openMode(page, 'numbers');

    await listenButton(page).click();
    await page.waitForFunction(() => (window.__speechProbe?.speakCount ?? 0) > 0);
    const before = await readSpeechProbe(page);
    expect(before.speaking || before.speakCount > 0).toBe(true);

    await returnHome(page);
    const after = await readSpeechProbe(page);
    expect(after.cancelCount).toBeGreaterThan(before.cancelCount);
    expect(after.speaking).toBe(false);
  });

  test('[F3] cancel() ao sair do Explorar', async ({ page }, testInfo) => {
    requiresF3Composition(testInfo, 'ExploreScreen chama speech.cancel no unmount/voltar (F2a/F2b)');

    await openHome(page);
    await openMode(page, 'explore');
    await listenButton(page).click();
    await page.waitForFunction(() => (window.__speechProbe?.speakCount ?? 0) > 0);
    const before = await readSpeechProbe(page);

    await returnHome(page);
    const after = await readSpeechProbe(page);
    expect(after.cancelCount).toBeGreaterThan(before.cancelCount);
    expect(after.speaking).toBe(false);
  });

  test('[F3] cancel() em pagehide / visibilitychange hidden', async ({ page }, testInfo) => {
    requiresF3Composition(testInfo, 'Hook useSpeech já cancela nesses eventos; precisa tela que fale (F3)');

    await openHome(page);
    await selectLevel(page, 1);
    await openMode(page, 'words');
    await listenButton(page).click();
    await page.waitForFunction(() => (window.__speechProbe?.speaking ?? false) === true || (window.__speechProbe?.speakCount ?? 0) > 0);

    const before = await readSpeechProbe(page);
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('pagehide'));
    });
    const after = await readSpeechProbe(page);
    expect(after.cancelCount).toBeGreaterThan(before.cancelCount);
    expect(after.speaking).toBe(false);
  });
});
