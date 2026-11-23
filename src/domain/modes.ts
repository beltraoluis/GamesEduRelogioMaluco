// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

/** Cartões de modo da tela inicial. */

import { content } from '../content/runtimeDomData';
import type { GameMode, ModeId, ModeMeta } from './types';

export const MODES: readonly ModeMeta[] = content.modesList;

/** Modos com rodada e estrelas. */
export const GAME_MODES: readonly [GameMode, GameMode, GameMode] = ['numbers', 'words', 'hands'];

export function isGameMode(value: unknown): value is GameMode {
  return value === 'numbers' || value === 'words' || value === 'hands';
}

export function isModeId(value: unknown): value is ModeId {
  return isGameMode(value) || value === 'explore' || value === 'assemble';
}

export function getMode(id: ModeId): ModeMeta {
  return MODES.find((m) => m.id === id) as ModeMeta;
}
