// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { describe, expect, it } from 'vitest';

import { randomTime } from '../clockMath';
import {
  chooseDistractors,
  displayHourOf,
  hourNumberOptions,
  hourNumberPreferred,
  hourWordOptions,
  hourWordPreferred,
  minuteNumberOptions,
  minuteNumberPreferred,
  minuteWordOptions,
  minuteWordPreferred,
  PERIOD_OPTIONS,
} from '../distractors';
import { getLevel, hourPool, LEVELS, minutePool } from '../levels';
import { mulberry32 } from '../rng';
import { numberWord, phraseParts, to12 } from '../time';
import type { ClockTime, Level } from '../types';

const SEEDS = 10_000;

function expectBank<T>(options: readonly T[], answer: T, level: Level, pool: readonly T[], preferred: readonly (T | null)[]): void {
  expect(options[0]).toBe(answer);
  expect(options).toHaveLength(level.bankSize);
  expect(new Set(options).size).toBe(options.length);
  const distractors = options.slice(1);
  expect(distractors).not.toContain(answer);
  for (const d of distractors) expect(pool).toContain(d);
  const validPreferred = new Set(preferred.filter((p): p is T => p !== null && p !== answer && pool.includes(p)));
  const chosenPreferred = distractors.filter((d) => validPreferred.has(d)).length;
  expect(chosenPreferred).toBeGreaterThanOrEqual(Math.min(validPreferred.size, Math.max(1, level.bankSize - 2)));
}

function hourSlot(time: ClockTime, level: Level): { answer: string; num: number } {
  const part = phraseParts(time, { withPeriod: level.h24, useHalf: true }).find((p) => p.kind === 'slot' && p.group === 'hour');
  if (part?.kind !== 'slot' || part.num === undefined) throw new Error('sem lacuna de horas');
  return { answer: part.answer, num: part.num };
}

function minuteAnswer(time: ClockTime): string | null {
  const part = phraseParts(time, { useHalf: true }).find((p) => p.kind === 'slot' && p.group === 'minute');
  return part?.kind === 'slot' ? part.answer : null;
}

describe('chooseDistractors', () => {
  it('ignora null, a resposta e valores fora do pool', () => {
    const out = chooseDistractors(5, [null, 5, 99, 4], [1, 2, 3, 4, 5], 3, mulberry32(1));
    expect(out).toHaveLength(3);
    expect(out).toContain(4);
    expect(out).not.toContain(5);
    expect(out).not.toContain(99);
  });

  it('limita os preferidos a count - 1 (mínimo 1)', () => {
    for (let seed = 0; seed < 200; seed++) {
      const one = chooseDistractors(0, [1, 2, 3], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 1, mulberry32(seed));
      expect(one).toHaveLength(1);
      expect([1, 2, 3]).toContain(one[0]);
    }
  });

  it('pool pequeno devolve o que houver', () => {
    expect(chooseDistractors('a', [], ['a', 'b'], 3, mulberry32(1))).toEqual(['b']);
  });
});

describe(`invariantes com ${SEEDS} seeds por nível`, () => {
  for (const level of LEVELS) {
    it(`nível ${level.id}: números e palavras`, { timeout: 30_000 }, () => {
      for (let seed = 0; seed < SEEDS; seed++) {
        const rng = mulberry32(seed);
        const time = randomTime(level, new Set(), rng);
        const displayH = displayHourOf(time, level);

        expectBank(hourNumberOptions(time, level, rng), displayH, level, hourPool(level), hourNumberPreferred(time, level));
        expectBank(minuteNumberOptions(time, level, rng), time.m, level, minutePool(level), minuteNumberPreferred(time, level));

        const hs = hourSlot(time, level);
        const hourWords = Array.from({ length: 12 }, (_, i) => numberWord(i + 1, true));
        const hourWordPool = level.h24 ? [...hourWords, 'meio-dia', 'meia-noite'] : hourWords;
        expectBank(hourWordOptions(hs.answer, hs.num, time, level, rng), hs.answer, level, hourWordPool, hourWordPreferred(hs.answer, hs.num, time));

        const ma = minuteAnswer(time);
        if (ma !== null) {
          const pool =
            ma === 'meia'
              ? ['meio', 'quinze', 'quarenta e cinco', 'quarenta']
              : minutePool(level).filter((n) => n > 0 && n !== 30).map((n) => numberWord(n));
          expectBank(minuteWordOptions(ma, time, level, rng), ma, level, pool, minuteWordPreferred(ma, time, level));
        }
      }
    });
  }

  it('determinístico: mesma seed, mesmas fichas', () => {
    const level = getLevel(3);
    const time = { h: 7, m: 35 };
    for (let seed = 0; seed < 100; seed++) {
      expect(hourNumberOptions(time, level, mulberry32(seed))).toEqual(hourNumberOptions(time, level, mulberry32(seed)));
    }
  });
});

describe('regressão do wrap 12 h (ADR-002 §3)', () => {
  it('displayH = 12 inclui 1 como candidato (legado gerava 13)', () => {
    const level = getLevel(1);
    const time = { h: 12, m: 0 };
    expect(hourNumberPreferred(time, level)).toContain(1);
    expect(hourNumberPreferred(time, level)).toContain(11);
    expect(hourNumberPreferred(time, level)).not.toContain(13);
    let withOne = 0;
    for (let seed = 0; seed < SEEDS; seed++) {
      const opts = hourNumberOptions(time, level, mulberry32(seed));
      // Nível 1: 1 preferido sempre entra (1 ou 11).
      expect(opts.includes(1) || opts.includes(11)).toBe(true);
      if (opts.includes(1)) withOne++;
    }
    expect(withOne).toBeGreaterThan(SEEDS * 0.4);
  });

  it('displayH = 1 inclui 12 como candidato (legado gerava 0)', () => {
    const level = getLevel(2);
    const time = { h: 1, m: 0 };
    expect(hourNumberPreferred(time, level)).toContain(12);
    expect(hourNumberPreferred(time, level)).toContain(2);
    expect(hourNumberPreferred(time, level)).not.toContain(0);
    let withTwelve = 0;
    for (let seed = 0; seed < SEEDS; seed++) {
      if (hourNumberOptions(time, level, mulberry32(seed)).includes(12)) withTwelve++;
    }
    // Nível 2 escolhe até 2 dos 2 vizinhos válidos: o 12 sempre entra.
    expect(withTwelve).toBe(SEEDS);
  });

  it('palavras: doze <-> uma também têm volta', () => {
    expect(hourWordPreferred('doze', 12, { h: 12, m: 0 })).toEqual(expect.arrayContaining(['uma', 'onze']));
    expect(hourWordPreferred('uma', 1, { h: 1, m: 0 })).toEqual(expect.arrayContaining(['duas', 'doze']));
  });

  it('nível 24 h: 23 <-> 0 e a hora em 12 h', () => {
    const level = getLevel(4);
    expect(hourNumberPreferred({ h: 23, m: 0 }, level)).toEqual([0, 22, null, 11]);
    expect(hourNumberPreferred({ h: 0, m: 10 }, level)).toEqual([1, 23, 2, 12]);
    expect(hourNumberPreferred({ h: 15, m: 7 }, level)).toEqual([16, 14, null, 3]);
  });
});

describe('preferidos pedagógicos', () => {
  it('hora: número do ponteiro grande', () => {
    expect(hourNumberPreferred({ h: 4, m: 20 }, getLevel(3))).toEqual([5, 3, 4]);
    expect(displayHourOf({ h: 16, m: 0 }, getLevel(3))).toBe(to12(16));
    expect(displayHourOf({ h: 16, m: 0 }, getLevel(4))).toBe(16);
  });

  it('minuto: m/5, complemento, vizinhos por passo e 12', () => {
    expect(minuteNumberPreferred({ h: 4, m: 15 }, getLevel(2))).toEqual([3, 45, 30, 0, 12]);
    expect(minuteNumberPreferred({ h: 4, m: 0 }, getLevel(1))).toEqual([null, 0, 60, -60, 12]);
  });

  it('palavras: meio-dia, meia-noite e meia', () => {
    expect(hourWordPreferred('meio-dia', 12, { h: 12, m: 0 })).toEqual(['meia-noite', 'doze', 'uma']);
    expect(hourWordPreferred('meia-noite', 12, { h: 0, m: 0 })).toEqual(['meio-dia', 'doze', 'onze']);
    expect(hourWordPreferred('três', 3, { h: 3, m: 7 })).toEqual(['quatro', 'duas']);
    expect(minuteWordPreferred('meia', { h: 3, m: 30 }, getLevel(2))).toEqual(['meio', 'quinze', 'quarenta e cinco']);
    expect(minuteWordPreferred('quinze', { h: 3, m: 15 }, getLevel(2))).toEqual(['três', 'quarenta e cinco']);
    expect(minuteWordPreferred('sete', { h: 3, m: 7 }, getLevel(4))).toEqual(['cinquenta e três', 'oito', 'seis']);
    const opts = minuteWordOptions('meia', { h: 3, m: 30 }, getLevel(4), mulberry32(4));
    expect(opts[0]).toBe('meia');
    expect(opts).toHaveLength(4);
  });

  it('período: sempre os quatro', () => {
    expect(PERIOD_OPTIONS).toEqual(['da madrugada', 'da manhã', 'da tarde', 'da noite']);
  });
});
