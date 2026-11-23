// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { describe, expect, it } from 'vitest';

import numberFixture from './fixtures/legacy-numbers.json';
import phraseFixtureJson from './fixtures/legacy-phrases.json?raw';
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

interface PhraseFixture {
  options: { withPeriod?: boolean; useHalf?: boolean }[];
  pieces: LegacyPart[];
  phrases: { parts: number[]; text: string }[];
  cases: { h: number; m: number; text24: string; phrases: number[] }[];
}

const fixture: PhraseFixture = JSON.parse(phraseFixtureJson);

function fromLegacy(p: LegacyPart): PhrasePart {
  if (p.slot === undefined) return { kind: 'text', text: p.text as string };
  const base = { kind: 'slot' as const, group: p.slot, answer: p.answer as string };
  return p.num === undefined ? base : { ...base, num: p.num };
}

describe('time.ts: paridade exaustiva com legacy/js/time.js', () => {
  it('preserva períodos, números masculinos e femininos e horas', () => {
    expect([...PERIODS]).toEqual(numberFixture.periods);
    expect(numberFixture.values).toHaveLength(60);
    for (const { n, masculine, feminine, padded } of numberFixture.values) {
      expect(numberWord(n)).toBe(masculine);
      expect(numberWord(n, true)).toBe(feminine);
      expect(pad(n)).toBe(padded);
    }
    expect(numberFixture.hours).toHaveLength(24);
    for (const { h, h12, period } of numberFixture.hours) {
      expect(to12(h)).toBe(h12);
      expect(periodOf(h)).toBe(period);
    }
  });

  it('preserva as frases das 24 × 60 horas com opções padrão e quatro combinações', () => {
    expect(fixture.cases).toHaveLength(24 * 60);
    expect(fixture.options).toHaveLength(5);
    for (const { h, m, text24, phrases } of fixture.cases) {
      expect(phrase24({ h, m })).toBe(text24);
      expect(phrases).toHaveLength(fixture.options.length);
      phrases.forEach((id, index) => {
        const expected = fixture.phrases[id]!;
        const parts = index === 0 ? phraseParts({ h, m }) : phraseParts({ h, m }, fixture.options[index]);
        expect(parts).toStrictEqual(expected.parts.map(piece => fromLegacy(fixture.pieces[piece]!)));
        expect(phraseText(parts)).toBe(expected.text);
      });
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
