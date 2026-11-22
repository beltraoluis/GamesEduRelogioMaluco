// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

/**
 * Opções (resposta + distratores) dos bancos de fichas.
 *
 * Cada função devolve a resposta na posição 0, seguida dos distratores, sem
 * repetição. O embaralhamento para exibição é feito em `question.ts`.
 *
 * Diferença intencional em relação ao legado (ADR-002, seção 3): a "hora
 * vizinha" usa `adjacentHours` com volta (12 -> 1, 1 -> 12).
 */

import { adjacentHours } from './clockMath';
import { hourPool, minutePool } from './levels';
import { shuffle } from './rng';
import { numberWord, PERIODS, to12 } from './time';
import type { ClockTime, Level, Period, Rng } from './types';

/**
 * Escolhe `count` distratores diferentes de `answer`: até `count - 1` dos
 * `preferred` (erros comuns) que estejam no `pool`, e o resto do `pool`.
 * Entradas `null` em `preferred` são ignoradas.
 */
export function chooseDistractors<T>(
  answer: T,
  preferred: readonly (T | null)[],
  pool: readonly T[],
  count: number,
  rng: Rng,
): T[] {
  const out = new Set<T>();
  const maxPreferred = Math.max(1, count - 1);
  for (const p of shuffle(preferred, rng)) {
    if (out.size >= maxPreferred) break;
    if (p !== null && p !== answer && pool.includes(p)) out.add(p);
  }
  for (const p of shuffle(pool, rng)) {
    if (out.size >= count) break;
    if (p !== answer) out.add(p);
  }
  return [...out];
}

/** Hora como aparece no relógio digital do nível. */
export function displayHourOf(time: ClockTime, level: Level): number {
  return level.h24 ? time.h : to12(time.h);
}

/** Número para onde o ponteiro grande aponta (`m / 5`), se for um número do mostrador. */
function minuteHandNumber(m: number): number | null {
  return m > 0 && m % 5 === 0 ? m / 5 : null;
}

/** Distratores preferidos das fichas de hora (números). */
export function hourNumberPreferred(time: ClockTime, level: Level): readonly (number | null)[] {
  const displayH = displayHourOf(time, level);
  const preferred: (number | null)[] = [...adjacentHours(displayH, level.h24), minuteHandNumber(time.m)];
  if (level.h24) preferred.push(time.h >= 12 ? time.h - 12 : time.h + 12);
  return preferred;
}

/** Fichas de hora (números): resposta + `bankSize - 1` distratores. */
export function hourNumberOptions(time: ClockTime, level: Level, rng: Rng): readonly number[] {
  const displayH = displayHourOf(time, level);
  return [displayH, ...chooseDistractors(displayH, hourNumberPreferred(time, level), hourPool(level), level.bankSize - 1, rng)];
}

/** Distratores preferidos das fichas de minuto (números). */
export function minuteNumberPreferred(time: ClockTime, level: Level): readonly (number | null)[] {
  const m = time.m;
  return [minuteHandNumber(m), (60 - m) % 60, m + level.step, m - level.step, 12];
}

/** Fichas de minuto (números): resposta + `bankSize - 1` distratores. */
export function minuteNumberOptions(time: ClockTime, level: Level, rng: Rng): readonly number[] {
  return [time.m, ...chooseDistractors(time.m, minuteNumberPreferred(time, level), minutePool(level), level.bankSize - 1, rng)];
}

const HOUR_WORDS: readonly string[] = Array.from({ length: 12 }, (_, i) => numberWord(i + 1, true));
const HOUR_WORDS_24: readonly string[] = [...HOUR_WORDS, 'meio-dia', 'meia-noite'];

/**
 * Distratores preferidos das fichas de hora por extenso.
 * `answer`/`num` vêm da lacuna de horas da frase (`PhrasePart`).
 */
export function hourWordPreferred(answer: string, num: number, time: ClockTime): readonly string[] {
  if (answer === 'meio-dia') return ['meia-noite', 'doze', 'uma'];
  if (answer === 'meia-noite') return ['meio-dia', 'doze', 'onze'];
  return [...adjacentHours(num, false), minuteHandNumber(time.m) ?? 0]
    .filter((n) => n >= 1 && n <= 12)
    .map((n) => numberWord(n, true));
}

/** Fichas de hora por extenso: resposta + `bankSize - 1` distratores. */
export function hourWordOptions(answer: string, num: number, time: ClockTime, level: Level, rng: Rng): readonly string[] {
  const pool = level.h24 ? HOUR_WORDS_24 : HOUR_WORDS;
  return [answer, ...chooseDistractors(answer, hourWordPreferred(answer, num, time), pool, level.bankSize - 1, rng)];
}

const HALF_PREFERRED: readonly string[] = ['meio', 'quinze', 'quarenta e cinco'];
const HALF_POOL: readonly string[] = ['meio', 'quinze', 'quarenta e cinco', 'quarenta'];

/** Distratores preferidos das fichas de minuto por extenso. */
export function minuteWordPreferred(answer: string, time: ClockTime, level: Level): readonly string[] {
  if (answer === 'meia') return HALF_PREFERRED;
  const m = time.m;
  return [m % 5 === 0 ? m / 5 : 0, 60 - m, m + level.step, m - level.step]
    .filter((n) => n > 0 && n < 60 && n !== 30)
    .map((n) => numberWord(n));
}

/** Fichas de minuto por extenso: resposta + `bankSize - 1` distratores. */
export function minuteWordOptions(answer: string, time: ClockTime, level: Level, rng: Rng): readonly string[] {
  const pool =
    answer === 'meia'
      ? HALF_POOL
      : minutePool(level)
          .filter((n) => n > 0 && n !== 30)
          .map((n) => numberWord(n));
  return [answer, ...chooseDistractors(answer, minuteWordPreferred(answer, time, level), pool, level.bankSize - 1, rng)];
}

/** Fichas do período do dia: sempre os quatro períodos. */
export const PERIOD_OPTIONS: readonly Period[] = PERIODS;
