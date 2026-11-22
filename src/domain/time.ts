// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import type { Atmosphere, ClockTime, Period, PhraseOptions, PhrasePart } from './types';

const UNITS = [
  'zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
  'dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove',
] as const;

const TENS: Readonly<Record<number, string>> = {
  20: 'vinte',
  30: 'trinta',
  40: 'quarenta',
  50: 'cinquenta',
};

export const PERIODS: readonly [Period, Period, Period, Period] = [
  'da madrugada',
  'da manhã',
  'da tarde',
  'da noite',
];

export function numberWord(n: number, feminine = false): string {
  if (!Number.isInteger(n) || n < 0 || n > 59) throw new RangeError(`numberWord: ${n}`);
  if (n < 20) return feminine && n === 1 ? 'uma' : feminine && n === 2 ? 'duas' : UNITS[n]!;
  const tensWord = TENS[Math.floor(n / 10) * 10]!;
  const unit = n % 10;
  return unit === 0 ? tensWord : `${tensWord} e ${numberWord(unit, feminine)}`;
}

const WORD_TO_NUMBER: ReadonlyMap<string, number> = (() => {
  const map = new Map<string, number>();
  for (let n = 0; n < 60; n++) {
    map.set(numberWord(n), n);
    map.set(numberWord(n, true), n);
  }
  return map;
})();

export const wordToNumber = (word: string): number | null => WORD_TO_NUMBER.get(word) ?? null;
export const pad = (n: number): string => String(n).padStart(2, '0');
export const to12 = (h: number): number => h % 12 || 12;

export function periodOf(h: number): Period {
  return PERIODS[h < 6 ? 0 : h < 12 ? 1 : h < 18 ? 2 : 3]!;
}

const ATMOSPHERES = ['madrugada', 'manha', 'tarde', 'noite'] as const;

export function atmosphereOf(h: number): Atmosphere {
  return ATMOSPHERES[h < 6 ? 0 : h < 12 ? 1 : h < 18 ? 2 : 3]!;
}

const text = (value: string): PhrasePart => ({ kind: 'text', text: value });

export function phraseParts(time: ClockTime, options: PhraseOptions = {}): readonly PhrasePart[] {
  const { h, m } = time;
  const withPeriod = options.withPeriod ?? false;
  const useHalf = options.useHalf ?? true;
  const parts: PhrasePart[] = [];
  const special = withPeriod ? (h === 12 ? 'meio-dia' : h === 0 ? 'meia-noite' : null) : null;

  if (special) {
    parts.push(text('É'), { kind: 'slot', group: 'hour', answer: special, num: 12 });
  } else {
    const h12 = to12(h);
    const one = h12 === 1;
    parts.push(
      text(one ? 'É' : 'São'),
      { kind: 'slot', group: 'hour', answer: numberWord(h12, true), num: h12 },
      text(one ? 'hora' : 'horas'),
    );
  }

  if (m > 0) {
    parts.push(text('e'));
    if (m === 30 && useHalf) {
      parts.push({ kind: 'slot', group: 'minute', answer: 'meia', num: 30 });
    } else {
      parts.push(
        { kind: 'slot', group: 'minute', answer: numberWord(m), num: m },
        text(m === 1 ? 'minuto' : 'minutos'),
      );
    }
  }

  if (withPeriod && !special) parts.push({ kind: 'slot', group: 'period', answer: periodOf(h) });
  return parts;
}

export function phraseText(parts: readonly PhrasePart[]): string {
  return `${parts.map((p) => (p.kind === 'text' ? p.text : p.answer)).join(' ')}.`;
}

export function phrase24(time: ClockTime): string {
  const { h, m } = time;
  const sing = h <= 1;
  return `${sing ? 'É' : 'São'} ${numberWord(h, true)} ${sing ? 'hora' : 'horas'}${m > 0 ? ` e ${numberWord(m)} ${m === 1 ? 'minuto' : 'minutos'}` : ''}.`;
}
