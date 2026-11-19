// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { describe, expect, it } from 'vitest';

import { buildRoundSummary, DEFAULT_ROUND_LENGTH, perfectCount, RESULT_TITLES, resultText, starsFor, starsKey } from '../scoring';

describe('scoring', () => {
  it('starsFor: <= 1 -> 3; <= 5 -> 2; senão 1', () => {
    expect([0, 1, 2, 5, 6, 40].map(starsFor)).toEqual([3, 3, 2, 2, 1, 1]);
  });

  it('perfectCount, starsKey e títulos', () => {
    expect(perfectCount([0, 1, 0, 3])).toBe(2);
    expect(perfectCount([])).toBe(0);
    expect(starsKey('words', 4)).toBe('words-4');
    expect(RESULT_TITLES).toEqual({ 3: 'Você é craque das horas!', 2: 'Muito bom!', 1: 'Bom trabalho!' });
    expect(DEFAULT_ROUND_LENGTH).toBe(8);
  });

  it('buildRoundSummary e resultText', () => {
    const results = [0, 0, 1, 0, 2, 0, 0, 0];
    const s = buildRoundSummary('hands', 2, results);
    expect(s).toEqual({
      mode: 'hands',
      levelId: 2,
      starsKey: 'hands-2',
      results,
      totalMistakes: 3,
      perfect: 6,
      stars: 2,
    });
    expect(s.results).not.toBe(results);
    expect(resultText(s)).toBe('Você acertou de primeira 6 de 8 horários. Jogue de novo para ganhar mais estrelas!');
    expect(resultText(buildRoundSummary('numbers', 1, [0, 0, 0, 0, 0, 0, 0, 1]))).toBe('Você acertou de primeira 7 de 8 horários.');
  });
});
