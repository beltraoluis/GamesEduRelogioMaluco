// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

/**
 * Máquina de telas (sem roteador): estado discriminado `Screen` e
 * transições puras. O botão voltar do sistema é tratado por
 * `useBackToHome` (uma entrada de histórico para "fora do início").
 */

import { isGameMode } from '../domain/modes';
import type { GameMode, LevelId, ModeId, RoundSummary } from '../contracts';

export type Screen =
  | { readonly name: 'home' }
  | {
      readonly name: 'game';
      readonly mode: GameMode;
      readonly levelId: LevelId;
    }
  | { readonly name: 'explore' }
  | {
      readonly name: 'result';
      readonly summary: RoundSummary;
      /** `recordStars` gravou um novo recorde nesta chave. */
      readonly newRecord: boolean;
    };

export type ScreenName = Screen['name'];

export type ScreenAction =
  /** Cartão da tela inicial. */
  | { readonly type: 'open-mode'; readonly mode: ModeId; readonly levelId: LevelId }
  /** Fim da rodada (`round-finished` já consumido). */
  | { readonly type: 'finish'; readonly summary: RoundSummary; readonly newRecord: boolean }
  /** "Jogar de novo" na tela de resultado: mesmo modo e nível. */
  | { readonly type: 'play-again' }
  /** Qualquer rota de volta ao início (botão, voltar do sistema). */
  | { readonly type: 'home' };

export const HOME_SCREEN: Screen = Object.freeze({ name: 'home' });

/** Transições puras; ação sem sentido na tela atual devolve a mesma referência. */
export function screenReducer(screen: Screen, action: ScreenAction): Screen {
  switch (action.type) {
    case 'open-mode':
      if (screen.name !== 'home') return screen;
      if (action.mode === 'explore') return { name: 'explore' };
      if (!isGameMode(action.mode)) return screen;
      return { name: 'game', mode: action.mode, levelId: action.levelId };
    case 'finish':
      if (screen.name !== 'game') return screen;
      if (action.summary.mode !== screen.mode || action.summary.levelId !== screen.levelId) return screen;
      return { name: 'result', summary: action.summary, newRecord: action.newRecord };
    case 'play-again':
      if (screen.name !== 'result') return screen;
      return { name: 'game', mode: screen.summary.mode, levelId: screen.summary.levelId };
    case 'home':
      return screen.name === 'home' ? screen : HOME_SCREEN;
  }
}

/** Telas "fora do início": têm uma entrada própria no histórico. */
export function isAwayFromHome(screen: Screen): boolean {
  return screen.name !== 'home';
}
