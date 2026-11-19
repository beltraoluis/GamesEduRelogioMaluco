// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { expect, test } from '@playwright/test';

import { openHome, openMode, returnHome, selectLevel } from './helpers/app.ts';
import { requiresF3Composition } from './helpers/composition.ts';
import {
  ANSWER_REGION_LABELS,
  APP_COPY,
  MODE_IDS,
  answerRegion,
  modeCard,
  modeTitle,
} from './helpers/locators.ts';
import type { GameMode } from '../src/domain/types.ts';

test.describe('4 modos [F3]', () => {
  for (const modeId of MODE_IDS) {
    test(`[F3] abre o modo ${modeTitle(modeId)} a partir da Home`, async ({ page }, testInfo) => {
      requiresF3Composition(
        testInfo,
        'HomeScreen ModeCard + rotas de tela (F2a/F2b) só existem após composição F3',
      );

      await openHome(page);
      await selectLevel(page, 1);
      await expect(modeCard(page, modeId)).toBeVisible();
      await expect(modeCard(page, modeId)).toContainText(APP_COPY.modes[modeId].description);

      await openMode(page, modeId);

      if (modeId === 'explore') {
        await expect(page.getByRole('heading', { name: APP_COPY.explore.title })).toBeVisible();
        await expect(page.getByText(APP_COPY.explore.dragTip)).toBeVisible();
      } else {
        const gameMode = modeId as GameMode;
        await expect(answerRegion(page, gameMode)).toBeVisible();
        await expect(answerRegion(page, gameMode)).toHaveAttribute(
          'aria-label',
          ANSWER_REGION_LABELS[gameMode],
        );
        await expect(page.getByText(APP_COPY.game.prompts[gameMode])).toBeVisible();
      }

      await returnHome(page);
      await expect(modeCard(page, 'numbers')).toBeVisible();
    });
  }
});
