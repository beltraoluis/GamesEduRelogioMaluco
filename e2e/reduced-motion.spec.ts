// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { expect, test } from '@playwright/test';
import { ROUND_LENGTH } from '../src/contracts/index.ts';
import { openHome, openMode, selectLevel } from './helpers/app.ts';
import { solveLevelOneNumbers } from './helpers/clock.ts';
import { requiresF3Composition } from './helpers/composition.ts';
import { APP_COPY, nextButton } from './helpers/locators.ts';

const particleSelector = '[data-motion="particle"], [data-confetti-seq], [data-confetti-particle="true"]';

test.describe('prefers-reduced-motion [F3]', () => {
  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    test(`[F3] ${reducedMotion}: rodada de acertos e presença/ausência de partículas`, async ({ page }, testInfo) => {
      requiresF3Composition(testInfo, 'GameScreen e Confetti no acerto e no resultado');

      await page.emulateMedia({ reducedMotion });
      await openHome(page);
      expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches))
        .toBe(reducedMotion === 'reduce');
      await selectLevel(page, 1);
      await openMode(page, 'numbers');

      // Guarda até os nós removidos antes da próxima asserção do Playwright.
      const particles = await page.evaluateHandle((selector) => {
        let count = 0;
        const observer = new MutationObserver((records) => {
          for (const record of records) {
            for (const node of record.addedNodes) {
              if (node instanceof Element && (node.matches(selector) || node.querySelector(selector))) count++;
            }
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        return { count: () => count };
      }, particleSelector);

      await expect(page.locator(particleSelector)).toHaveCount(0);
      for (let q = 0; q < ROUND_LENGTH; q++) {
        await solveLevelOneNumbers(page);
        if (q === 0 && reducedMotion === 'no-preference') {
          await expect.poll(() => particles.evaluate((probe) => probe.count())).toBeGreaterThan(0);
        }
        await nextButton(page).click();
      }
      await expect(page.getByRole('button', { name: APP_COPY.result.playAgain })).toBeVisible();
      if (reducedMotion === 'reduce') {
        expect(await particles.evaluate((probe) => probe.count())).toBe(0);
        await expect(page.locator(particleSelector)).toHaveCount(0);
      }
      await particles.dispose();
    });
  }
});
