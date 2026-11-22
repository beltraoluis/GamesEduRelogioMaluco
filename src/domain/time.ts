// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { content } from '../content/runtimeDomData';
import type { Atmosphere, ClockTime, Period, PhraseOptions, PhrasePart } from './types';

export const PERIODS: readonly [Period, Period, Period, Period] = content.periods;

export function numberWord(n: number, feminine = false): string {
  const word = content.numberWords[n];
  if (!Number.isInteger(n) || word === undefined) throw new RangeError(`numberWord: ${n} fora de 0–59`);
  if (!feminine) return word;
  return word.replace(/\bum$/, 'uma').replace(/\bdois$/, 'duas');
}

export function wordToNumber(word: string): number | null {
  const masculine = word.replace(/\buma$/, 'um').replace(/\bduas$/, 'dois');
  const index = content.numberWords.indexOf(masculine);
  return index < 0 ? null : index;
}

export const pad = (n: number): string => String(n).padStart(2, '0');
export const to12 = (h: number): number => (h % 12 === 0 ? 12 : h % 12);

export function periodOf(h: number): Period {
  return PERIODS[h < 6 ? 0 : h < 12 ? 1 : h < 18 ? 2 : 3]!;
}

export function atmosphereOf(h: number): Atmosphere {
  return content.atmospheres[periodOf(h)];
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
