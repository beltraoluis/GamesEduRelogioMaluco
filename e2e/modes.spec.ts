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
import type { GameMode, LevelId } from '../src/domain/types.ts';

/** Todo modo no nível 1, e nível 4 nos modos pontuados. */
const MATRIX: ReadonlyArray<{ mode: (typeof MODE_IDS)[number]; level: LevelId }> = [
  ...MODE_IDS.map((mode) => ({ mode, level: 1 as const })),
  { mode: 'numbers', level: 4 },
  { mode: 'words', level: 4 },
  { mode: 'hands', level: 4 },
  { mode: 'assemble', level: 4 },
];

test.describe('Matriz modos × níveis [F3]', () => {
  for (const { mode, level } of MATRIX) {
    test(`[F3] ${modeTitle(mode)} no nível ${level}`, async ({ page }, testInfo) => {
      requiresF3Composition(
        testInfo,
        'HomeScreen ModeCard + Game/Explore + LevelSelector (F2a/F2b) após composição F3',
      );

      await openHome(page);
      await selectLevel(page, level);
      await expect(modeCard(page, mode)).toBeVisible();
      await expect(modeCard(page, mode)).toContainText(APP_COPY.modes[mode].description);

      await openMode(page, mode);

      if (mode === 'explore') {
        await expect(page.getByRole('heading', { name: APP_COPY.explore.title })).toBeVisible();
        await expect(page.getByText(APP_COPY.explore.dragTip)).toBeVisible();
      } else if (mode === 'assemble') {
        await expect(page.getByRole('heading', { name: 'Monte o relógio: horas' })).toBeVisible();
      } else {
        const gameMode = mode as GameMode;
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
