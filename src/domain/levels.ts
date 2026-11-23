// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

/** Níveis do jogo (progressão da BNCC) e conjuntos de fichas por nível. */

import { content } from '../content/runtimeDomData';
import type { Level, LevelId } from './types';

export const LEVELS: readonly [Level, Level, Level, Level] = content.levelsList;

export function isLevelId(value: unknown): value is LevelId {
  return value === 1 || value === 2 || value === 3 || value === 4;
}

export function getLevel(id: LevelId): Level {
  return LEVELS[id - 1] as Level;
}

/** Fichas de hora possíveis no nível: 1–12, ou 0–23 no nível 24 h. */
export function hourPool(level: Level): readonly number[] {
  return level.h24 ? content.hours24 : content.hours12;
}

export function minutePool(level: Level): readonly number[] {
  return content.minutePools[level.step];
}
