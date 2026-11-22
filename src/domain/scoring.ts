// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { content } from '../content/runtimeDomData';
/** Estrelas e resumo da rodada. */

import type { GameMode, LevelId, RoundSummary, Stars, StarsKey } from './types';

/** Perguntas por rodada (igual a `ROUND_LENGTH` de `src/contracts`). */
export const DEFAULT_ROUND_LENGTH = 8;

/** Soma de erros `<= 1` -> 3 estrelas; `<= 5` -> 2; senão 1. */
export function starsFor(totalMistakes: number): Stars {
  if (totalMistakes <= 1) return 3;
  if (totalMistakes <= 5) return 2;
  return 1;
}

/** Perguntas acertadas de primeira. */
export function perfectCount(results: readonly number[]): number {
  return results.filter((r) => r === 0).length;
}

export function starsKey(mode: GameMode, levelId: LevelId): StarsKey {
  return `${mode}-${levelId}`;
}

export const RESULT_TITLES: Readonly<Record<Stars, string>> = content.resultTitles;

export function buildRoundSummary(mode: GameMode, levelId: LevelId, results: readonly number[]): RoundSummary {
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

/** "Você acertou de primeira 5 de 8 horários." (+ convite quando < 3 estrelas). */
export function resultText(summary: RoundSummary): string {
  const base = `Você acertou de primeira ${summary.perfect} de ${summary.results.length} horários.`;
  return summary.stars < 3 ? `${base} Jogue de novo para ganhar mais estrelas!` : base;
}
