// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

/**
 * Interfaces entre o `App` (F2a) e as telas visuais (F2b), montadas em F3.
 *
 * O `App` é dono de: preferências (`usePreferences`), som e voz únicos
 * (`useSound`/`useSpeech`), sessão de jogo (`useGameSession`), confete,
 * atualização do SW (`useServiceWorkerUpdate`, montado entre telas) e
 * navegação (`screenReducer` + `useBackToHome`). As telas só desenham e
 * chamam callbacks; durante o jogo não tocam som nem fala por conta própria.
 */

import type { ComponentType } from 'react';

import type {
  GameMode,
  LevelId,
  ModeId,
  Preferences,
  RoundSummary,
  ServiceWorkerUpdateApi,
  SoundApi,
  SpeechApi,
} from '../contracts';
import type { GameSessionApi } from '../screens/GameScreen/useGameController';

export interface HomeScreenProps {
  readonly prefs: Preferences;
  /** `PreferencesApi.persistent` (aviso no diálogo dos educadores). */
  readonly persistent: boolean;
  readonly onSelectMode: (id: ModeId) => void;
  readonly onChangeLevel: (id: LevelId) => void;
  readonly onToggleSound: () => void;
  readonly onToggleVoice: () => void;
  /** Confirmação em 2 etapas fica no `TeachersDialog`; aqui só grava. */
  readonly onResetStars: () => void;
  /** Toast "Nova versão pronta" (`UpdateToast`), só nesta tela (ADR-003). */
  readonly update: ServiceWorkerUpdateApi;
  /** `tree/{commit}` (AGPL §13). */
  readonly sourceUrl: string;
}

export interface GameScreenProps {
  readonly mode: GameMode;
  readonly levelId: LevelId;
  /** Estado, ações, mensagem do balão e sinais visuais da partida. */
  readonly session: GameSessionApi;
  /** "Voltar ao início" (cancela a fala e consome a entrada do histórico). */
  readonly onHome: () => void;
}

export interface ExploreScreenProps {
  /** Fala pedida pela criança ("Ouvir"/"Agora"); cancelada ao sair. */
  readonly speech: SpeechApi;
  /** "tick" ao girar os ponteiros, "pick" nos botões. */
  readonly sound: SoundApi;
  readonly onHome: () => void;
}

export interface ResultScreenProps {
  readonly summary: RoundSummary;
  /** Primeira vez com essa quantidade de estrelas nesta chave. */
  readonly newRecord: boolean;
  readonly onPlayAgain: () => void;
  readonly onHome: () => void;
}

/** Telas injetadas no `App` (F3 liga as telas reais de F2b). */
export interface AppScreens {
  readonly Home: ComponentType<HomeScreenProps>;
  readonly Game: ComponentType<GameScreenProps>;
  readonly Explore: ComponentType<ExploreScreenProps>;
  readonly Result: ComponentType<ResultScreenProps>;
}
