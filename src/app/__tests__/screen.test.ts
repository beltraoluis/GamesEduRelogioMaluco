// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { describe, expect, it } from 'vitest';

import type { RoundSummary } from '../../contracts';
import { HOME_SCREEN, isAwayFromHome, screenReducer } from '../screen';
import type { Screen } from '../screen';

const summary: RoundSummary = { mode: 'hands', levelId: 2, starsKey: 'hands-2', results: [0, 0, 0, 0, 0, 0, 0, 0], totalMistakes: 0, perfect: 8, stars: 3 };

describe('screenReducer', () => {
  it('início -> jogo / explorar', () => {
    expect(screenReducer(HOME_SCREEN, { type: 'open-mode', mode: 'hands', levelId: 2 })).toEqual({ name: 'game', mode: 'hands', levelId: 2 });
    expect(screenReducer(HOME_SCREEN, { type: 'open-mode', mode: 'explore', levelId: 4 })).toEqual({ name: 'explore' });
  });

  it('jogo -> resultado só para a mesma partida', () => {
    const game: Screen = { name: 'game', mode: 'hands', levelId: 2 };
    expect(screenReducer(game, { type: 'finish', summary, newRecord: true })).toEqual({ name: 'result', summary, newRecord: true });
    const other: Screen = { name: 'game', mode: 'words', levelId: 2 };
    expect(screenReducer(other, { type: 'finish', summary, newRecord: true })).toBe(other);
    expect(screenReducer(HOME_SCREEN, { type: 'finish', summary, newRecord: false })).toBe(HOME_SCREEN);
  });

  it('resultado -> jogar de novo (mesmo modo e nível)', () => {
    const result: Screen = { name: 'result', summary, newRecord: false };
    expect(screenReducer(result, { type: 'play-again' })).toEqual({ name: 'game', mode: 'hands', levelId: 2 });
    expect(screenReducer(HOME_SCREEN, { type: 'play-again' })).toBe(HOME_SCREEN);
  });

  it('qualquer tela -> início; ações fora de contexto não mudam nada', () => {
    const screens: Screen[] = [{ name: 'game', mode: 'numbers', levelId: 1 }, { name: 'explore' }, { name: 'result', summary, newRecord: true }];
    for (const s of screens) {
      expect(screenReducer(s, { type: 'home' })).toBe(HOME_SCREEN);
      expect(screenReducer(s, { type: 'open-mode', mode: 'words', levelId: 1 })).toBe(s);
      expect(isAwayFromHome(s)).toBe(true);
    }
    expect(screenReducer(HOME_SCREEN, { type: 'home' })).toBe(HOME_SCREEN);
    expect(isAwayFromHome(HOME_SCREEN)).toBe(false);
  });
});
