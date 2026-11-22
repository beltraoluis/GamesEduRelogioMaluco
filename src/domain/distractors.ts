// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { adjacentHours } from './clockMath';
import { hourPool, minutePool } from './levels';
import { shuffle } from './rng';
import { numberWord, PERIODS, to12 } from './time';
import type { ClockTime, Level, Period, Rng } from './types';

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

export const displayHourOf = (time: ClockTime, level: Level): number =>
  level.h24 ? time.h : to12(time.h);

const minuteHandNumber = (m: number): number | null => (m > 0 && m % 5 === 0 ? m / 5 : null);

export function hourNumberPreferred(time: ClockTime, level: Level): readonly (number | null)[] {
  const displayH = displayHourOf(time, level);
  const preferred: (number | null)[] = [
    ...adjacentHours(displayH, level.h24),
    minuteHandNumber(time.m),
  ];
  if (level.h24) preferred.push(time.h >= 12 ? time.h - 12 : time.h + 12);
  return preferred;
}

export function hourNumberOptions(time: ClockTime, level: Level, rng: Rng): readonly number[] {
  const displayH = displayHourOf(time, level);
  return [
    displayH,
    ...chooseDistractors(
      displayH,
      hourNumberPreferred(time, level),
      hourPool(level),
      level.bankSize - 1,
      rng,
    ),
  ];
}

export function minuteNumberPreferred(time: ClockTime, level: Level): readonly (number | null)[] {
  const { m } = time;
  return [minuteHandNumber(m), (60 - m) % 60, m + level.step, m - level.step, 12];
}

export function minuteNumberOptions(time: ClockTime, level: Level, rng: Rng): readonly number[] {
  return [
    time.m,
    ...chooseDistractors(
      time.m,
      minuteNumberPreferred(time, level),
      minutePool(level),
      level.bankSize - 1,
      rng,
    ),
  ];
}

const HOUR_WORDS: readonly string[] = Array.from({ length: 12 }, (_, i) => numberWord(i + 1, true));
const HOUR_WORDS_24: readonly string[] = [...HOUR_WORDS, 'meio-dia', 'meia-noite'];

export function hourWordPreferred(answer: string, num: number, time: ClockTime): readonly string[] {
  if (answer === 'meio-dia') return ['meia-noite', 'doze', 'uma'];
  if (answer === 'meia-noite') return ['meio-dia', 'doze', 'onze'];
  return [...adjacentHours(num, false), minuteHandNumber(time.m) ?? 0]
    .filter((n) => n >= 1 && n <= 12)
    .map((n) => numberWord(n, true));
}

export function hourWordOptions(
  answer: string,
  num: number,
  time: ClockTime,
  level: Level,
  rng: Rng,
): readonly string[] {
  return [
    answer,
    ...chooseDistractors(
      answer,
      hourWordPreferred(answer, num, time),
      level.h24 ? HOUR_WORDS_24 : HOUR_WORDS,
      level.bankSize - 1,
      rng,
    ),
  ];
}

const HALF_PREFERRED: readonly string[] = ['meio', 'quinze', 'quarenta e cinco'];
const HALF_POOL: readonly string[] = [...HALF_PREFERRED, 'quarenta'];

export function minuteWordPreferred(
  answer: string,
  time: ClockTime,
  level: Level,
): readonly string[] {
  if (answer === 'meia') return HALF_PREFERRED;
  const { m } = time;
  return [m % 5 === 0 ? m / 5 : 0, 60 - m, m + level.step, m - level.step]
    .filter((n) => n > 0 && n < 60 && n !== 30)
    .map((n) => numberWord(n));
}

export function minuteWordOptions(
  answer: string,
  time: ClockTime,
  level: Level,
  rng: Rng,
): readonly string[] {
  const pool =
    answer === 'meia'
      ? HALF_POOL
      : minutePool(level)
          .filter((n) => n > 0 && n !== 30)
          .map((n) => numberWord(n));
  return [
    answer,
    ...chooseDistractors(
      answer,
      minuteWordPreferred(answer, time, level),
      pool,
      level.bankSize - 1,
      rng,
    ),
  ];
}

export const PERIOD_OPTIONS: readonly Period[] = PERIODS;
