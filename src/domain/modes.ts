// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

/** Cartões de modo da tela inicial. */

import type { GameMode, ModeId, ModeMeta } from './types';

export const MODES: readonly [ModeMeta, ModeMeta, ModeMeta, ModeMeta] = [
  { id: 'numbers', title: 'Números', description: 'Leia o relógio e arraste os números', scored: true },
  { id: 'words', title: 'Palavras', description: 'Monte a frase da hora', scored: true },
  { id: 'hands', title: 'Ponteiros', description: 'Gire os ponteiros do relógio', scored: true },
  { id: 'explore', title: 'Explorar', description: 'Brinque livremente com o relógio', scored: false },
];

/** Modos com rodada e estrelas. */
export const GAME_MODES: readonly [GameMode, GameMode, GameMode] = ['numbers', 'words', 'hands'];

export function isGameMode(value: unknown): value is GameMode {
  return value === 'numbers' || value === 'words' || value === 'hands';
}

export function isModeId(value: unknown): value is ModeId {
  return isGameMode(value) || value === 'explore';
}

export function getMode(id: ModeId): ModeMeta {
  return MODES.find((m) => m.id === id) as ModeMeta;
}
