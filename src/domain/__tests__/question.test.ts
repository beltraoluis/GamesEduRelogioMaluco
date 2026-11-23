// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { describe, expect, it } from 'vitest';

import { sameReading } from '../clockMath';
import { getLevel, LEVELS } from '../levels';
import { buildQuestion, slotIdOf, spokenPhrase } from '../question';
import { mulberry32 } from '../rng';
import { pad, to12 } from '../time';
import type { BankSpec, Question, SlotSpec } from '../types';

function slotsAndBanks(q: Question): { slots: readonly SlotSpec[]; banks: readonly BankSpec[] } {
  if (q.mode === 'hands') throw new Error('hands não tem lacunas');
  return { slots: q.slots, banks: q.banks };
}

function expectAnswerable(q: Question): void {
  const { slots, banks } = slotsAndBanks(q);
  const ids = banks.flatMap((b) => b.tiles.map((t) => t.id));
  expect(new Set(ids).size).toBe(ids.length);
  for (const slot of slots) {
    const bank = banks.find((b) => b.group === slot.group);
    expect(bank).toBeDefined();
    const matching = bank?.tiles.filter((t) => t.value === slot.answer) ?? [];
    expect(matching).toHaveLength(1);
    for (const t of bank?.tiles ?? []) expect(t.group).toBe(slot.group);
  }
}

describe('buildQuestion', () => {
  it('numbers: analógico -> digital com lacunas de horas e minutos', () => {
    for (const level of LEVELS) {
      for (let seed = 0; seed < 300; seed++) {
        const q = buildQuestion('numbers', level, new Set(), mulberry32(seed), 3);
        if (q.mode !== 'numbers') throw new Error('modo errado');
        expect(q.index).toBe(3);
        expect(q.stimulus).toBe('analog');
        expect(q.displayH).toBe(level.h24 ? q.time.h : to12(q.time.h));
        expect(q.slots.map((s) => s.id)).toEqual([slotIdOf('hour'), slotIdOf('minute')]);
        expect(q.slots[0]?.answer).toBe(pad(q.displayH));
        expect(q.slots[1]?.answer).toBe(pad(q.time.m));
        expect(q.slots.map((s) => s.label)).toEqual(['Lacuna das horas', 'Lacuna dos minutos']);
        for (const b of q.banks) expect(b.tiles).toHaveLength(level.bankSize);
        for (const t of q.banks.flatMap((b) => b.tiles)) expect(t.value).toBe(pad(t.num ?? -1));
        expect('period' in q).toBe(level.h24);
        expectAnswerable(q);
      }
    }
  });

  it('numbers 24 h: selo do período', () => {
    const q = buildQuestion('numbers', getLevel(4), new Set(), mulberry32(11));
    expect(q.mode === 'numbers' && q.period).toBeTruthy();
  });

  it('words: frase com lacunas e bancos por grupo', () => {
    const stimuli = new Set<string>();
    for (const level of LEVELS) {
      for (let seed = 0; seed < 300; seed++) {
        const q = buildQuestion('words', level, new Set(), mulberry32(seed));
        if (q.mode !== 'words') throw new Error('modo errado');
        stimuli.add(`${level.id}:${q.stimulus}`);
        if (level.h24) expect(q.stimulus).toBe('digital');
        const slotParts = q.parts.filter((p) => p.kind === 'slot');
        expect(q.slots.map((s) => s.answer)).toEqual(slotParts.map((p) => (p.kind === 'slot' ? p.answer : '')));
        expect(q.banks.map((b) => b.group)).toEqual(q.slots.map((s) => s.group));
        const period = q.banks.find((b) => b.group === 'period');
        if (period) {
          expect(period.tiles).toHaveLength(4);
          for (const t of period.tiles) expect(t.num).toBeUndefined();
        }
        expectAnswerable(q);
      }
    }
    // Níveis de 12 h sorteiam analógico e digital.
    expect(stimuli).toEqual(new Set(['1:analog', '1:digital', '2:analog', '2:digital', '3:analog', '3:digital', '4:digital']));
  });

  it('words: fichas por extenso carregam o número quando existe', () => {
    const q = buildQuestion('words', getLevel(3), new Set(), mulberry32(2));
    if (q.mode !== 'words') throw new Error('modo errado');
    const hourTiles = q.banks.find((b) => b.group === 'hour')?.tiles ?? [];
    for (const t of hourTiles) expect(typeof t.num).toBe('number');
  });

  it('hands: início sempre diferente da resposta; opções por nível', () => {
    for (const level of LEVELS) {
      for (let seed = 0; seed < 2000; seed++) {
        const q = buildQuestion('hands', level, new Set(), mulberry32(seed));
        if (q.mode !== 'hands') throw new Error('modo errado');
        expect(q.stimulus).toBe('digital');
        expect(sameReading(q.start, q.time)).toBe(false);
        expect(to12(q.start.h)).not.toBe(to12(q.time.h));
        expect(q.start.m).toBe(0);
        expect(q.minuteStep).toBe(level.step);
        expect(q.lockMinute).toBe(level.id === 1);
        expect(q.minuteLabels).toBe(level.id === 3);
        expect(q.phrase !== undefined).toBe(level.id <= 2);
      }
    }
  });

  it('evita horas já usadas e é determinístico', () => {
    const level = getLevel(2);
    const a = buildQuestion('numbers', level, new Set(), mulberry32(77));
    const b = buildQuestion('numbers', level, new Set(), mulberry32(77));
    expect(a).toEqual(b);
    const used = new Set([`${a.time.h}:${a.time.m}`]);
    const c = buildQuestion('numbers', level, used, mulberry32(77));
    expect(`${c.time.h}:${c.time.m}`).not.toBe(`${a.time.h}:${a.time.m}`);
  });
});

describe('spokenPhrase', () => {
  it('por modo e nível', () => {
    expect(spokenPhrase('numbers', getLevel(2), { h: 3, m: 30 })).toBe('São três horas e meia.');
    expect(spokenPhrase('words', getLevel(4), { h: 15, m: 10 })).toBe('São três horas e dez minutos da tarde.');
    expect(spokenPhrase('hands', getLevel(4), { h: 15, m: 10 })).toBe(
      'São quinze horas e dez minutos. Ou: São três horas e dez minutos da tarde.',
    );
  });
});
