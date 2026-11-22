// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import type { GameMode, LevelId, RoundSummary, Stars, StarsKey } from './types';

export const DEFAULT_ROUND_LENGTH = 8;

export const starsFor = (totalMistakes: number): Stars =>
  totalMistakes <= 1 ? 3 : totalMistakes <= 5 ? 2 : 1;

export const perfectCount = (results: readonly number[]): number =>
  results.filter((r) => r === 0).length;

export const starsKey = (mode: GameMode, levelId: LevelId): StarsKey => `${mode}-${levelId}`;

export const RESULT_TITLES: Readonly<Record<Stars, string>> = {
  3: 'Você é craque das horas!',
  2: 'Muito bom!',
  1: 'Bom trabalho!',
};

export function buildRoundSummary(
  mode: GameMode,
  levelId: LevelId,
  results: readonly number[],
): RoundSummary {
  const totalMistakes = results.reduce((a, r) => a + r, 0);
  return {
    mode,
    levelId,
    starsKey: starsKey(mode, levelId),
    results: [...results],
    totalMistakes,
    perfect: perfectCount(results),
    stars: starsFor(totalMistakes),
  };
}

export function resultText(summary: RoundSummary): string {
  const base = `Você acertou de primeira ${summary.perfect} de ${summary.results.length} horários.`;
  return summary.stars < 3 ? `${base} Jogue de novo para ganhar mais estrelas!` : base;
}
