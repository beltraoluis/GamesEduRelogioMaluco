// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

/**
 * Raiz da aplicação: máquina de telas + serviços compartilhados.
 *
 * - um único `useSound`/`useSpeech` (ligados às preferências) para todas as
 *   telas; em TODA rota de volta ao início (botões e voltar do sistema) a
 *   fala é cancelada e a sessão de jogo é abandonada (`toHome`); ao começar
 *   uma partida, a fala é cancelada e a fila anterior é descartada;
 * - a sessão de jogo (`useGameSession`) vive aqui, então a fanfarra, o
 *   confete e a fala do fim da rodada sobrevivem à troca jogo -> resultado;
 * - `useServiceWorkerUpdate` fica montado entre telas; o toast só aparece
 *   na `HomeScreen` (ADR-003);
 * - as telas visuais são injetadas (`screens`); F3 liga as de F2b.
 */

import { useCallback, useMemo, useReducer, useState } from 'react';
import type { ReactElement } from 'react';

import { Confetti } from '../components/Confetti';
import { AssemblyScreen } from '../screens/AssemblyScreen/AssemblyScreen';
import { buildSourceUrl } from '../content/copy';
import type { ConfettiProps, LevelId, ModeId, RoundSummary, ServiceWorkerUpdateApi } from '../contracts';
import { usePreferences } from '../hooks/usePreferences';
import { useSound } from '../hooks/useSound';
import { useSpeech } from '../hooks/useSpeech';
import { useGameSession } from '../screens/GameScreen/useGameController';
import type { SessionSeed } from '../screens/GameScreen/useGameController';
import type { PreferencesStore } from '../storage/preferencesStore';
import { HOME_SCREEN, isAwayFromHome, screenReducer } from './screen';
import type { Screen } from './screen';
import type { AppScreens } from './screenProps';
import { useBackToHome } from './useBackToHome';

const NO_UPDATE: ServiceWorkerUpdateApi = Object.freeze({
  updateReady: false,
  applyUpdate: () => {},
  dismissToast: () => {},
});

/** Substituto até F3 ligar `useServiceWorkerUpdate` (F2c). */
export function useNoServiceWorkerUpdate(): ServiceWorkerUpdateApi {
  return NO_UPDATE;
}

export interface AppProps {
  readonly screens: AppScreens;
  /**
   * Hook de atualização do SW (F2c: `useServiceWorkerUpdate`). Precisa ser
   * a MESMA função em todas as renderizações (regras dos hooks).
   */
  readonly useUpdate?: () => ServiceWorkerUpdateApi;
  /** Injetável em testes; padrão: store único. */
  readonly preferencesStore?: PreferencesStore;
  /** Padrão: `buildSourceUrl(__APP_COMMIT__)`. */
  readonly sourceUrl?: string;
  /** Injetável em testes (seed determinística). */
  readonly createSession?: () => SessionSeed;
  /** Tela inicial (testes). Padrão: início. */
  readonly initialScreen?: Screen;
}

export function App({
  screens,
  useUpdate = useNoServiceWorkerUpdate,
  preferencesStore,
  sourceUrl,
  createSession,
  initialScreen = HOME_SCREEN,
}: AppProps): ReactElement {
  const preferences = usePreferences(preferencesStore);
  const { prefs } = preferences;
  const sound = useSound(prefs.sound);
  const speech = useSpeech(prefs.voice);
  const update = useUpdate();
  const [screen, dispatchScreen] = useReducer(screenReducer, initialScreen);
  const [burst, setBurst] = useState<ConfettiProps['burst']>(null);
  const resolvedSourceUrl = useMemo(() => sourceUrl ?? buildSourceUrl(__APP_COMMIT__), [sourceUrl]);

  const onConfetti = useCallback((count: number) => {
    setBurst((b) => ({ seq: (b?.seq ?? 0) + 1, count }));
  }, []);
  const onFinished = useCallback((summary: RoundSummary, newRecord: boolean) => {
    dispatchScreen({ type: 'finish', summary, newRecord });
  }, []);

  const session = useGameSession({
    sound,
    speech,
    recordStars: preferences.recordStars,
    onConfetti,
    onFinished,
    ...(createSession === undefined ? {} : { createSession }),
  });

  const { cancel } = speech;
  const { abandon } = session;
  /**
   * TODA saída para o início (botões, voltar do sistema): cala a fala,
   * abandona a sessão (efeitos ainda não consumidos, mesmo do mesmo lote,
   * nunca rodam: sem fala, fanfarra, estrelas ou navegação tardias) e limpa
   * o confete. Um resultado já consumido (tela de resultado) fica salvo.
   */
  const toHome = useCallback(() => {
    cancel();
    abandon();
    setBurst(null);
    dispatchScreen({ type: 'home' });
  }, [cancel, abandon]);
  const { goHome } = useBackToHome(isAwayFromHome(screen), toHome);

  const { start } = session;
  const { play, unlock } = sound;
  const onSelectMode = useCallback(
    (id: ModeId) => {
      unlock();
      play('pick');
      dispatchScreen({ type: 'open-mode', mode: id, levelId: prefs.level });
      if (id !== 'explore' && id !== 'assemble') start(id, prefs.level);
      else cancel();
    },
    [play, unlock, start, prefs.level, cancel],
  );
  const onPlayAgain = useCallback(() => {
    if (screen.name !== 'result') return;
    play('pick');
    dispatchScreen({ type: 'play-again' });
    start(screen.summary.mode, screen.summary.levelId);
  }, [screen, play, start]);

  const { setLevel, setSound, setVoice, resetStars } = preferences;
  const onChangeLevel = useCallback(
    (id: LevelId) => {
      unlock();
      play('pick');
      setLevel(id);
    },
    [play, unlock, setLevel],
  );
  const onToggleSound = useCallback(() => {
    unlock();
    setSound(!prefs.sound);
  }, [unlock, setSound, prefs.sound]);
  const onToggleVoice = useCallback(() => setVoice(!prefs.voice), [setVoice, prefs.voice]);

  const { Home, Game, Explore, Result } = screens;
  let content: ReactElement;
  switch (screen.name) {
    case 'home':
      content = (
        <Home
          prefs={prefs}
          persistent={preferences.persistent}
          onSelectMode={onSelectMode}
          onChangeLevel={onChangeLevel}
          onToggleSound={onToggleSound}
          onToggleVoice={onToggleVoice}
          onResetStars={resetStars}
          update={update}
          sourceUrl={resolvedSourceUrl}
        />
      );
      break;
    case 'game':
      content = <Game mode={screen.mode} levelId={screen.levelId} session={session} onHome={goHome} />;
      break;
    case 'explore':
      content = <Explore speech={speech} sound={sound} onHome={goHome} />;
      break;
    case 'assemble':
      content = <AssemblyScreen levelId={screen.levelId} sound={sound} speech={speech}
        recordStars={preferences.recordStars} onConfetti={onConfetti} onHome={goHome} />;
      break;
    case 'result':
      content = <Result summary={screen.summary} newRecord={screen.newRecord} onPlayAgain={onPlayAgain} onHome={goHome} />;
      break;
  }

  return (
    <>
      {content}
      <Confetti burst={burst} />
    </>
  );
}

export default App;
