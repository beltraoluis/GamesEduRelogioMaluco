// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { useCallback, useMemo, useReducer, useState, type ReactElement } from 'react';

import { Confetti } from '../components/Confetti';
import { buildSourceUrl } from '../content/copy';
import type { ConfettiProps, LevelId, ModeId, RoundSummary, ServiceWorkerUpdateApi } from '../contracts';
import { usePreferences } from '../hooks/usePreferences';
import { useSound } from '../hooks/useSound';
import { useSpeech } from '../hooks/useSpeech';
import { useGameSession, type SessionSeed } from '../screens/GameScreen/useGameController';
import type { PreferencesStore } from '../storage/preferencesStore';
import { HOME_SCREEN, isAwayFromHome, screenReducer, type Screen } from './screen';
import type { AppScreens } from './screenProps';
import { useBackToHome } from './useBackToHome';

const NO_UPDATE: ServiceWorkerUpdateApi = Object.freeze({
  updateReady: false,
  applyUpdate: () => {},
  dismissToast: () => {},
});

export function useNoServiceWorkerUpdate(): ServiceWorkerUpdateApi {
  return NO_UPDATE;
}

export interface AppProps {
  readonly screens: AppScreens;
  readonly useUpdate?: () => ServiceWorkerUpdateApi;
  readonly preferencesStore?: PreferencesStore;
  readonly sourceUrl?: string;
  readonly createSession?: () => SessionSeed;
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
  const { prefs, setLevel, setSound, setVoice, resetStars } = preferences;
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
  const { abandon, start } = session;
  const { play, unlock } = sound;

  const toHome = useCallback(() => {
    cancel();
    abandon();
    setBurst(null);
    dispatchScreen({ type: 'home' });
  }, [cancel, abandon]);
  const { goHome } = useBackToHome(isAwayFromHome(screen), toHome);

  const onSelectMode = useCallback(
    (id: ModeId) => {
      unlock();
      play('pick');
      dispatchScreen({ type: 'open-mode', mode: id, levelId: prefs.level });
      if (id !== 'explore') start(id, prefs.level);
    },
    [play, unlock, start, prefs.level],
  );
  const onPlayAgain = useCallback(() => {
    if (screen.name !== 'result') return;
    play('pick');
    dispatchScreen({ type: 'play-again' });
    start(screen.summary.mode, screen.summary.levelId);
  }, [screen, play, start]);

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
  const content =
    screen.name === 'home' ? (
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
    ) : screen.name === 'game' ? (
      <Game mode={screen.mode} levelId={screen.levelId} session={session} onHome={goHome} />
    ) : screen.name === 'explore' ? (
      <Explore speech={speech} sound={sound} onHome={goHome} />
    ) : (
      <Result
        summary={screen.summary}
        newRecord={screen.newRecord}
        onPlayAgain={onPlayAgain}
        onHome={goHome}
      />
    );

  return (
    <>
      {content}
      <Confetti burst={burst} />
    </>
  );
}

export default App;
