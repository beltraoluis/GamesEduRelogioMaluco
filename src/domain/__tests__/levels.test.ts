// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { describe, expect, it } from 'vitest';

import { getLevel, hourPool, isLevelId, LEVELS, minutePool } from '../levels';
import { GAME_MODES, getMode, isGameMode, isModeId, MODES } from '../modes';

describe('LEVELS', () => {
  it('4 níveis com passo, 24 h e tamanho de banco do legado', () => {
    expect(LEVELS.map((l) => l.id)).toEqual([1, 2, 3, 4]);
    expect(LEVELS.map((l) => l.step)).toEqual([60, 15, 5, 1]);
    expect(LEVELS.map((l) => l.h24)).toEqual([false, false, false, true]);
    expect(LEVELS.map((l) => l.bankSize)).toEqual([3, 4, 4, 4]);
    expect(LEVELS.map((l) => l.name)).toEqual(['Horas certas', 'Meias e quartos', 'De 5 em 5', 'Minuto a minuto · 24h']);
  });

  it('cobre as 6 habilidades da BNCC', () => {
    const skills = new Set(LEVELS.flatMap((l) => l.bncc));
    expect([...skills].sort()).toEqual(['EF01MA16', 'EF01MA17', 'EF02MA19', 'EF03MA22', 'EF03MA23', 'EF04MA22']);
  });

  it('getLevel e isLevelId', () => {
    for (const l of LEVELS) expect(getLevel(l.id)).toBe(l);
    expect([1, 2, 3, 4].every(isLevelId)).toBe(true);
    for (const v of [0, 5, 7, '1', null, undefined, 1.5]) expect(isLevelId(v)).toBe(false);
  });

  it('hourPool e minutePool', () => {
    expect(hourPool(getLevel(1))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(hourPool(getLevel(4))).toEqual(Array.from({ length: 24 }, (_, i) => i));
    expect(minutePool(getLevel(1))).toEqual([0, 12, 15, 30, 45]);
    expect(minutePool(getLevel(2))).toEqual([0, 3, 6, 9, 15, 30, 45]);
    expect(minutePool(getLevel(3))).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
    expect(minutePool(getLevel(4))).toHaveLength(60);
  });
});

describe('MODES', () => {
  it('4 modos; só explore sem pontuação', () => {
    expect(MODES.map((m) => m.id)).toEqual(['numbers', 'words', 'hands', 'explore']);
    expect(MODES.map((m) => m.scored)).toEqual([true, true, true, false]);
    expect(MODES.map((m) => m.title)).toEqual(['Números', 'Palavras', 'Ponteiros', 'Explorar']);
    for (const m of MODES) {
      expect(m.description.length).toBeGreaterThan(0);
      expect(m.title + m.description).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });

  it('getMode, isGameMode e isModeId', () => {
    for (const m of MODES) expect(getMode(m.id)).toBe(m);
    expect(GAME_MODES.every(isGameMode)).toBe(true);
    expect(isGameMode('explore')).toBe(false);
    expect(isModeId('explore')).toBe(true);
    expect(isModeId('other')).toBe(false);
  });
});
