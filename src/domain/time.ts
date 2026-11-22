// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { readDomJson } from '../content/runtimeDomData';
import type { Atmosphere, ClockTime, Period, PhraseOptions, PhrasePart } from './types';

const FALLBACK_UNITS = [
  'zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
  'dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove',
] as const;

const FALLBACK_TENS: Readonly<Record<number, string>> = {
  20: 'vinte',
  30: 'trinta',
  40: 'quarenta',
  50: 'cinquenta',
};

const FALLBACK_PERIODS: readonly [Period, Period, Period, Period] = [
  'da madrugada',
  'da manhã',
  'da tarde',
  'da noite',
];

const UNITS: readonly string[] = readDomJson(
  'units',
  () => (import.meta.env.PROD ? [] : FALLBACK_UNITS),
);

const TENS: Readonly<Record<number, string>> = readDomJson(
  'tens',
  () => (import.meta.env.PROD ? {} : FALLBACK_TENS),
);

export const PERIODS: readonly [Period, Period, Period, Period] = readDomJson(
  'periods',
  () => (import.meta.env.PROD ? (['da madrugada', 'da manhã', 'da tarde', 'da noite'] as const) : FALLBACK_PERIODS),
);

function assertMinuteRange(n: number): void {
  if (!Number.isInteger(n) || n < 0 || n > 59) throw new RangeError(`numberWord: ${n} fora de 0–59`);
}

export function numberWord(n: number, feminine = false): string {
  assertMinuteRange(n);
  if (n < 20) {
    if (feminine && n === 1) return 'uma';
    if (feminine && n === 2) return 'duas';
    return UNITS[n] as string;
  }
  const tens = Math.floor(n / 10) * 10;
  const unit = n % 10;
  const tensWord = TENS[tens] as string;
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

export function wordToNumber(word: string): number | null {
  return WORD_TO_NUMBER.get(word) ?? null;
}

export const pad = (n: number): string => String(n).padStart(2, '0');
export const to12 = (h: number): number => (h % 12 === 0 ? 12 : h % 12);

export function periodOf(h: number): Period {
  return PERIODS[h < 6 ? 0 : h < 12 ? 1 : h < 18 ? 2 : 3]!;
}

const ATMOSPHERES = ['madrugada', 'manha', 'tarde', 'noite'] as const;

export function atmosphereOf(h: number): Atmosphere {
  return ATMOSPHERES[h < 6 ? 0 : h < 12 ? 1 : h < 18 ? 2 : 3]!;
}

function text(value: string): PhrasePart {
  return { kind: 'text', text: value };
}

export function phraseParts(time: ClockTime, options: PhraseOptions = {}): readonly PhrasePart[] {
  const { h, m } = time;
  const withPeriod = options.withPeriod ?? false;
  const useHalf = options.useHalf ?? true;
  const parts: PhrasePart[] = [];
  let special: string | null = null;
  if (withPeriod && h === 12) special = 'meio-dia';
  if (withPeriod && h === 0) special = 'meia-noite';

  if (special !== null) {
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
      parts.push({ kind: 'slot', group: 'minute', answer: numberWord(m), num: m }, text(m === 1 ? 'minuto' : 'minutos'));
    }
  }

  if (withPeriod && special === null) parts.push({ kind: 'slot', group: 'period', answer: periodOf(h) });
  return parts;
}

export function phraseText(parts: readonly PhrasePart[]): string {
  return parts.map((p) => (p.kind === 'text' ? p.text : p.answer)).join(' ') + '.';
}

export function phrase24(time: ClockTime): string {
  const { h, m } = time;
  const sing = h <= 1;
  let out = `${sing ? 'É' : 'São'} ${numberWord(h, true)} ${sing ? 'hora' : 'horas'}`;
  if (m > 0) out += ` e ${numberWord(m)} ${m === 1 ? 'minuto' : 'minutos'}`;
  return out + '.';
}
