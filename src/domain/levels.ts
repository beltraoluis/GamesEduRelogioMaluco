// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

/** Níveis do jogo (progressão da BNCC) e conjuntos de fichas por nível. */

import { readDomJson } from '../content/runtimeDomData';
import type { Level, LevelId } from './types';

const FALLBACK_LEVELS: readonly [Level, Level, Level, Level] = [
  { id: 1, name: 'Horas certas', grade: '1º ano', step: 60, h24: false, bankSize: 3, bncc: ['EF01MA16'] },
  { id: 2, name: 'Meias e quartos', grade: '2º ano', step: 15, h24: false, bankSize: 4, bncc: ['EF02MA19', 'EF03MA23'] },
  { id: 3, name: 'De 5 em 5', grade: '3º ano', step: 5, h24: false, bankSize: 4, bncc: ['EF03MA22', 'EF03MA23'] },
  { id: 4, name: 'Minuto a minuto · 24h', grade: '4º e 5º anos', step: 1, h24: true, bankSize: 4, bncc: ['EF04MA22', 'EF01MA17'] },
];

export const LEVELS: readonly [Level, Level, Level, Level] = readDomJson(
  'levelsList',
  () => (import.meta.env.PROD ? ([] as unknown as readonly [Level, Level, Level, Level]) : FALLBACK_LEVELS),
);

export function isLevelId(value: unknown): value is LevelId {
  return value === 1 || value === 2 || value === 3 || value === 4;
}

export function getLevel(id: LevelId): Level {
  return LEVELS[id - 1] as Level;
}

const HOURS_12: readonly number[] = Array.from({ length: 12 }, (_, i) => i + 1);
const HOURS_24: readonly number[] = Array.from({ length: 24 }, (_, i) => i);

/** Fichas de hora possíveis no nível: 1–12, ou 0–23 no nível 24 h. */
export function hourPool(level: Level): readonly number[] {
  return level.h24 ? HOURS_24 : HOURS_12;
}

const MINUTES_60: readonly number[] = [0, 12, 15, 30, 45];
const MINUTES_15: readonly number[] = [0, 3, 6, 9, 15, 30, 45];
const MINUTES_5: readonly number[] = Array.from({ length: 12 }, (_, i) => i * 5);
const MINUTES_1: readonly number[] = Array.from({ length: 60 }, (_, i) => i);

export function minutePool(level: Level): readonly number[] {
  switch (level.step) {
    case 60:
      return MINUTES_60;
    case 15:
      return MINUTES_15;
    case 5:
      return MINUTES_5;
    case 1:
      return MINUTES_1;
  }
}
