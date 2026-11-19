// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { describe, expect, it } from 'vitest';

// @ts-expect-error -- módulo JS do legado, sem declarações de tipo (só para paridade).
import * as legacyRaw from '../../../legacy/js/time.js';
import {
  atmosphereOf,
  numberWord,
  pad,
  PERIODS,
  periodOf,
  phrase24,
  phraseParts,
  phraseText,
  to12,
  wordToNumber,
} from '../time';
import type { PhrasePart } from '../types';

interface LegacyPart {
  readonly text?: string;
  readonly slot?: 'hour' | 'minute' | 'period';
  readonly answer?: string;
  readonly num?: number;
}

interface LegacyTime {
  numberWord(n: number, feminine?: boolean): string;
  pad(n: number): string;
  to12(h: number): number;
  periodOf(h: number): string;
  phraseParts(h: number, m: number, opts?: { withPeriod?: boolean; useHalf?: boolean }): LegacyPart[];
  phraseText(parts: readonly LegacyPart[]): string;
  phrase24(h: number, m: number): string;
  PERIODS: readonly string[];
}

const legacy = legacyRaw as LegacyTime;

function fromLegacy(p: LegacyPart): PhrasePart {
  if (p.slot === undefined) return { kind: 'text', text: p.text as string };
  const base = { kind: 'slot' as const, group: p.slot, answer: p.answer as string };
  return p.num === undefined ? base : { ...base, num: p.num };
}

describe('time.ts: paridade exaustiva com legacy/js/time.js', () => {
  it('PERIODS idênticos', () => {
    expect([...PERIODS]).toEqual(legacy.PERIODS);
  });

  it('numberWord (0–59, masculino e feminino), pad, to12 e periodOf', () => {
    for (let n = 0; n < 60; n++) {
      expect(numberWord(n)).toBe(legacy.numberWord(n));
      expect(numberWord(n, true)).toBe(legacy.numberWord(n, true));
      expect(pad(n)).toBe(legacy.pad(n));
    }
    for (let h = 0; h < 24; h++) {
      expect(to12(h)).toBe(legacy.to12(h));
      expect(periodOf(h)).toBe(legacy.periodOf(h));
    }
  });

  it('phraseParts e phraseText: 24 × 60 × 4 variações', () => {
    let checked = 0;
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m++) {
        for (const withPeriod of [false, true]) {
          for (const useHalf of [false, true]) {
            const expected = legacy.phraseParts(h, m, { withPeriod, useHalf });
            const parts = phraseParts({ h, m }, { withPeriod, useHalf });
            expect(parts).toStrictEqual(expected.map(fromLegacy));
            expect(phraseText(parts)).toBe(legacy.phraseText(expected));
            checked++;
          }
        }
      }
    }
    expect(checked).toBe(24 * 60 * 4);
  });

  it('phraseParts sem opções usa os padrões do legado', () => {
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m++) {
        expect(phraseParts({ h, m })).toStrictEqual(legacy.phraseParts(h, m).map(fromLegacy));
      }
    }
  });

  it('phrase24: 24 × 60 variações', () => {
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m++) {
        expect(phrase24({ h, m })).toBe(legacy.phrase24(h, m));
      }
    }
  });
});

describe('time.ts: casos conhecidos', () => {
  it('frases do dia a dia', () => {
    expect(phraseText(phraseParts({ h: 3, m: 15 }))).toBe('São três horas e quinze minutos.');
    expect(phraseText(phraseParts({ h: 1, m: 1 }))).toBe('É uma hora e um minuto.');
    expect(phraseText(phraseParts({ h: 2, m: 30 }))).toBe('São duas horas e meia.');
    expect(phraseText(phraseParts({ h: 12, m: 0 }, { withPeriod: true }))).toBe('É meio-dia.');
    expect(phraseText(phraseParts({ h: 0, m: 30 }, { withPeriod: true }))).toBe('É meia-noite e meia.');
    expect(phraseText(phraseParts({ h: 15, m: 10 }, { withPeriod: true }))).toBe('São três horas e dez minutos da tarde.');
    expect(phrase24({ h: 15, m: 10 })).toBe('São quinze horas e dez minutos.');
    expect(phrase24({ h: 1, m: 0 })).toBe('É uma hora.');
  });

  it('numberWord rejeita valores fora de 0–59', () => {
    expect(() => numberWord(60)).toThrow(RangeError);
    expect(() => numberWord(-1)).toThrow(RangeError);
    expect(() => numberWord(1.5)).toThrow(RangeError);
  });

  it('wordToNumber é o inverso de numberWord (masc. e fem.)', () => {
    for (let n = 0; n < 60; n++) {
      expect(wordToNumber(numberWord(n))).toBe(n);
      expect(wordToNumber(numberWord(n, true))).toBe(n);
    }
    expect(wordToNumber('duas')).toBe(2);
    expect(wordToNumber('vinte e uma')).toBe(21);
    expect(wordToNumber('meia')).toBeNull();
    expect(wordToNumber('meio-dia')).toBeNull();
    expect(wordToNumber('')).toBeNull();
  });

  it('atmosphereOf segue os períodos do dia', () => {
    const expected = ['madrugada', 'manha', 'tarde', 'noite'];
    for (let h = 0; h < 24; h++) expect(atmosphereOf(h)).toBe(expected[Math.floor(h / 6)]);
  });
});
