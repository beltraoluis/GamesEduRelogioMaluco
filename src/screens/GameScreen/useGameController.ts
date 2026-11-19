// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

/**
 * Controlador do jogo (ADR-002 §2).
 *
 * `useGameController` é o contrato `GameControllerApi`: dono do
 * `useReducer(gameReducer)` e do cursor de deduplicação
 * (`useRef<GameEventCursor | null>`), com o mesmo ciclo de vida. Consome
 * `pendingEvents` num `useEffect`, em ordem de `seq`, executa cada envelope
 * no máximo uma vez e confirma a fila com `events/ack`.
 *
 * `useGameSession` compõe o controlador com os efeitos do jogo (som, fala,
 * confete, estrelas, fim de rodada) e com os sinais visuais derivados dos
 * eventos (tremor de ficha, realce de ponteiro, brilho de lacuna, humor do
 * mascote). É a API que a `GameScreen` (F2b) consome: componentes não tocam
 * som nem fala por conta própria durante o jogo.
 */

import { useEffect, useEffectEvent, useLayoutEffect, useMemo, useReducer, useRef } from 'react';

import type {
  ClockTime,
  GameAction,
  GameControllerApi,
  GameControllerOptions,
  GameEventCursor,
  GameEventEnvelope,
  GameMode,
  GameState,
  HandHighlight,
  HandName,
  LevelId,
  MascotMood,
  Message,
  PreferencesApi,
  RoundSummary,
  SoundApi,
  SpeechApi,
  Feedback,
} from '../../contracts';
import { gameReducer, initGame } from '../../domain/gameReducer';
import { renderMessage } from '../../domain/hints';
import { toPlainText } from '../../domain/messages';
import { spokenPhrase } from '../../domain/question';
import { RESULT_TITLES } from '../../domain/scoring';

/* ------------------------------------------------------------------ */
/* Controlador (contrato)                                              */
/* ------------------------------------------------------------------ */

/** Identidade de uma partida, gerada fora do reducer. */
export interface SessionSeed {
  readonly sessionId: string;
  /** uint32. */
  readonly seed: number;
}

export interface GameControllerHookOptions extends GameControllerOptions {
  /** Injetável em testes; padrão: `crypto.randomUUID` + `crypto.getRandomValues`. */
  readonly createSession?: () => SessionSeed;
}

const EMPTY_QUEUE: readonly GameEventEnvelope[] = Object.freeze([]);

let fallbackCounter = 0;

/** `sessionId` e `seed` novos (fora do reducer, que é puro). */
export function createSessionSeed(): SessionSeed {
  const c: Crypto | undefined = typeof crypto === 'undefined' ? undefined : crypto;
  let seed: number;
  if (c !== undefined && typeof c.getRandomValues === 'function') {
    seed = c.getRandomValues(new Uint32Array(1))[0] ?? 0;
  } else {
    seed = Math.floor(Math.random() * 0x1_0000_0000) >>> 0;
  }
  const sessionId =
    c !== undefined && typeof c.randomUUID === 'function'
      ? c.randomUUID()
      : `s-${Date.now().toString(36)}-${(++fallbackCounter).toString(36)}-${seed.toString(36)}`;
  return { sessionId, seed };
}

/** `gameReducer` estendido para o estado inicial `null` (antes do primeiro `start`). */
export function controllerReducer(state: GameState | null, action: GameAction): GameState | null {
  if (state === null) return action.type === 'start' ? initGame(action) : null;
  return gameReducer(state, action);
}

/** Envelope ainda não executado segundo o cursor. */
export function isNewEnvelope(cursor: GameEventCursor | null, envelope: GameEventEnvelope): boolean {
  return cursor === null || cursor.sessionId !== envelope.sessionId || envelope.seq > cursor.seq;
}

/** Erro de um efeito não pode travar a fila: reporta fora do fluxo e segue. */
function reportEffectError(error: unknown): void {
  queueMicrotask(() => {
    throw error;
  });
}

/**
 * Passo do consumidor: executa, em ordem, os envelopes que o cursor ainda
 * não viu (avançando o cursor ANTES de cada um, então um efeito que lança
 * não é repetido) e devolve o `upToSeq` do `ack` (maior `seq` da fila), ou
 * `null` com a fila vazia. Rodar de novo sobre a mesma fila (remontagem do
 * StrictMode antes do `ack`) não executa nada.
 */
export function drainEvents(
  cursorRef: { current: GameEventCursor | null },
  queue: readonly GameEventEnvelope[],
  run: (envelope: GameEventEnvelope) => void,
): number | null {
  const last = queue[queue.length - 1];
  if (last === undefined) return null;
  for (const envelope of queue) {
    if (!isNewEnvelope(cursorRef.current, envelope)) continue;
    cursorRef.current = { sessionId: envelope.sessionId, seq: envelope.seq };
    try {
      run(envelope);
    } catch (error) {
      reportEffectError(error);
    }
  }
  return last.seq;
}

export function useGameController(options: GameControllerHookOptions): GameControllerApi {
  const [state, dispatch] = useReducer(controllerReducer, null);
  const cursorRef = useRef<GameEventCursor | null>(null);
  const runEvent = useEffectEvent((envelope: GameEventEnvelope) => options.onEvent(envelope));
  const createSessionRef = useRef(options.createSession ?? createSessionSeed);
  useLayoutEffect(() => {
    createSessionRef.current = options.createSession ?? createSessionSeed;
  });

  const queue = state?.pendingEvents ?? EMPTY_QUEUE;

  useEffect(() => {
    const upToSeq = drainEvents(cursorRef, queue, runEvent);
    if (upToSeq !== null) dispatch({ type: 'events/ack', upToSeq });
  }, [queue]);

  return useMemo<GameControllerApi>(
    () => ({
      state,
      start(mode: GameMode, levelId: LevelId) {
        const { sessionId, seed } = createSessionRef.current();
        dispatch({ type: 'start', sessionId, seed, mode, levelId });
      },
      dropTile: (tileId: string, slotId: string) => dispatch({ type: 'drop-tile', tileId, slotId }),
      tapTile: (tileId: string) => dispatch({ type: 'tap-tile', tileId }),
      moveHands: (time: ClockTime) => dispatch({ type: 'move-hands', time }),
      checkHands: () => dispatch({ type: 'check-hands' }),
      requestHelp: () => dispatch({ type: 'request-help' }),
      next: () => dispatch({ type: 'next' }),
    }),
    [state],
  );
}

/* ------------------------------------------------------------------ */
/* Sinais visuais derivados dos eventos                                */
/* ------------------------------------------------------------------ */

export interface MascotSignal {
  readonly mood: MascotMood;
  /** Repetir o pulinho (`MascotProps.bounceSeq`). */
  readonly bounceSeq: number;
}

/** Sinais "incrementar para repetir" e estados de apoio da pergunta atual. */
export interface GameView {
  /** Contador interno: cada sinal novo recebe `seq + 1`. */
  readonly seq: number;
  readonly mascot: MascotSignal;
  /** `TileProps.shakeSeq` por ficha (só fichas que já tremeram). */
  readonly shakeSeq: Readonly<Record<string, number>>;
  /** `AnalogClockProps.highlight`. */
  readonly handHighlight: HandHighlight | null;
  /** `SlotProps.glowSeq` da lacuna indicada pela dica. */
  readonly slotGlow: { readonly slotId: string; readonly seq: number } | null;
  /** `DigitalClockProps.glow` (estímulo digital). */
  readonly digitalGlow: { readonly group: HandName; readonly seq: number } | null;
  /** A dica pediu os números vermelhos dos minutos (até a pergunta acabar). */
  readonly minuteLabels: boolean;
}

export const INITIAL_GAME_VIEW: GameView = Object.freeze({
  seq: 0,
  mascot: Object.freeze({ mood: 'happy', bounceSeq: 0 }),
  shakeSeq: Object.freeze({}),
  handHighlight: null,
  slotGlow: null,
  digitalGlow: null,
  minuteLabels: false,
});

/** Redutor puro dos sinais visuais (um envelope por vez, já deduplicado). */
export function reduceGameView(view: GameView, envelope: GameEventEnvelope): GameView {
  const seq = view.seq + 1;
  const { event } = envelope;
  switch (event.type) {
    case 'question-started':
      return { ...INITIAL_GAME_VIEW, seq, mascot: { mood: 'happy', bounceSeq: view.mascot.bounceSeq } };
    case 'tile-placed':
      return { ...view, seq, mascot: { mood: 'happy', bounceSeq: seq } };
    case 'tile-rejected':
      return {
        ...view,
        seq,
        shakeSeq: { ...view.shakeSeq, [event.tileId]: seq },
        mascot: { mood: 'think', bounceSeq: view.mascot.bounceSeq },
      };
    case 'hands-rejected':
      return {
        ...view,
        seq,
        handHighlight: { target: event.highlight, seq },
        mascot: { mood: 'think', bounceSeq: view.mascot.bounceSeq },
      };
    case 'help-shown': {
      const h = event.highlight;
      return {
        ...view,
        seq,
        handHighlight: h.hands === undefined ? view.handHighlight : { target: h.hands, seq },
        slotGlow: h.slotId === undefined ? view.slotGlow : { slotId: h.slotId, seq },
        digitalGlow: h.digitalGroup === undefined ? view.digitalGlow : { group: h.digitalGroup, seq },
        minuteLabels: view.minuteLabels || h.minuteLabels,
        mascot: { mood: 'hint', bounceSeq: view.mascot.bounceSeq },
      };
    }
    case 'question-completed':
      // Legado: os números vermelhos de apoio somem ao acertar.
      return { ...view, seq, minuteLabels: false, mascot: { mood: 'celebrate', bounceSeq: seq } };
    case 'round-finished':
      return { ...view, seq, mascot: { mood: 'celebrate', bounceSeq: seq } };
  }
}

/* ------------------------------------------------------------------ */
/* Efeitos colaterais                                                  */
/* ------------------------------------------------------------------ */

/** Confete por acerto (legado): 40 de primeira, 18 com erros; 80 no fim da rodada. */
export const CONFETTI_COUNTS = { perfect: 40, withMistakes: 18, round: 80 } as const;

export interface GameEffects {
  readonly sound: Pick<SoundApi, 'play'>;
  readonly speech: Pick<SpeechApi, 'speak'>;
  readonly recordStars: PreferencesApi['recordStars'];
  readonly confetti: (count: number) => void;
  readonly finished: (summary: RoundSummary, newRecord: boolean) => void;
}

/** Elogio + frase da hora da pergunta concluída (12 h ou 24 h conforme o nível). */
export function praiseSpeech(state: GameState | null, index: number): string | null {
  if (state === null || state.index !== index || !state.current.done) return null;
  if (state.feedback.code === 'praise') return toPlainText(renderMessage('praise', state.feedback.context));
  return spokenPhrase(state.mode, state.level, state.current.question.time);
}

/**
 * Executa os efeitos de UM envelope (já deduplicado pelo cursor).
 * `state` é o estado do mesmo commit em que o envelope foi consumido.
 */
export function runGameEffects(envelope: GameEventEnvelope, state: GameState | null, fx: GameEffects): void {
  const { event } = envelope;
  switch (event.type) {
    case 'question-started':
      if (event.index > 0) fx.sound.play('pick');
      return;
    case 'tile-placed':
      fx.sound.play('drop');
      return;
    case 'tile-rejected':
    case 'hands-rejected':
      fx.sound.play('wrong');
      return;
    case 'help-shown':
      // ADR-002 §4: dicas só no balão `aria-live`, nunca faladas.
      return;
    case 'question-completed': {
      fx.sound.play('success');
      fx.confetti(event.perfect ? CONFETTI_COUNTS.perfect : CONFETTI_COUNTS.withMistakes);
      const text = praiseSpeech(state, event.index);
      if (text !== null) fx.speech.speak(text);
      return;
    }
    case 'round-finished': {
      const { summary } = event;
      fx.sound.play('fanfare');
      fx.confetti(CONFETTI_COUNTS.round);
      const newRecord = fx.recordStars(summary.starsKey, summary.stars);
      fx.speech.speak(RESULT_TITLES[summary.stars]);
      fx.finished(summary, newRecord);
      return;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Sessão (controlador + efeitos + sinais)                             */
/* ------------------------------------------------------------------ */

export interface GameSessionOptions {
  readonly sound: Pick<SoundApi, 'play' | 'unlock'>;
  readonly speech: Pick<SpeechApi, 'speak' | 'cancel'>;
  readonly recordStars: PreferencesApi['recordStars'];
  /** Dispara uma rajada de confete (a camada de confete vive no `App`). */
  readonly onConfetti: (count: number) => void;
  /** `round-finished` consumido: estrelas já gravadas. */
  readonly onFinished: (summary: RoundSummary, newRecord: boolean) => void;
  readonly createSession?: () => SessionSeed;
}

export interface GameSessionApi extends GameControllerApi {
  /** Balão do Tic (`SpeechBubbleProps.message`); `null` antes do `start`. */
  readonly message: Message | null;
  readonly tone: Feedback['tone'];
  readonly view: GameView;
  /** `TileProps.onPick`: início do arrasto (som "pick"). */
  pickTile(tileId: string): void;
  /** Botão "Ouvir": frase da hora atual (12 h ou 24 h conforme o nível). */
  listen(): void;
}

type ViewAction = { readonly type: 'event'; readonly envelope: GameEventEnvelope } | { readonly type: 'reset' };

function viewReducer(view: GameView, action: ViewAction): GameView {
  return action.type === 'reset' ? { ...INITIAL_GAME_VIEW, seq: view.seq } : reduceGameView(view, action.envelope);
}

export function useGameSession(options: GameSessionOptions): GameSessionApi {
  const [view, dispatchView] = useReducer(viewReducer, INITIAL_GAME_VIEW);
  const stateRef = useRef<GameState | null>(null);
  const optionsRef = useRef(options);
  useLayoutEffect(() => {
    optionsRef.current = options;
  });

  const controller = useGameController({
    ...(options.createSession === undefined ? {} : { createSession: options.createSession }),
    onEvent: (envelope) => {
      const o = optionsRef.current;
      dispatchView({ type: 'event', envelope });
      runGameEffects(envelope, stateRef.current, {
        sound: o.sound,
        speech: o.speech,
        recordStars: o.recordStars,
        confetti: o.onConfetti,
        finished: o.onFinished,
      });
    },
  });

  // Layout effects rodam antes do efeito consumidor do mesmo commit.
  const { state } = controller;
  useLayoutEffect(() => {
    stateRef.current = state;
  }, [state]);

  const feedback = state?.feedback ?? null;
  const message = useMemo(() => (feedback === null ? null : renderMessage(feedback.code, feedback.context)), [feedback]);

  return useMemo<GameSessionApi>(() => {
    const unlock = (): void => optionsRef.current.sound.unlock();
    return {
      ...controller,
      message,
      tone: feedback?.tone ?? 'neutral',
      view,
      start(mode, levelId) {
        unlock();
        optionsRef.current.speech.cancel();
        dispatchView({ type: 'reset' });
        controller.start(mode, levelId);
      },
      dropTile(tileId, slotId) {
        unlock();
        controller.dropTile(tileId, slotId);
      },
      tapTile(tileId) {
        unlock();
        controller.tapTile(tileId);
      },
      moveHands(time) {
        const hands = stateRef.current?.current.hands ?? null;
        if (hands !== null && (hands.h !== time.h || hands.m !== time.m)) optionsRef.current.sound.play('tick');
        controller.moveHands(time);
      },
      checkHands() {
        unlock();
        controller.checkHands();
      },
      requestHelp() {
        unlock();
        controller.requestHelp();
      },
      next() {
        unlock();
        controller.next();
      },
      pickTile() {
        unlock();
        optionsRef.current.sound.play('pick');
      },
      listen() {
        const s = stateRef.current;
        if (s === null) return;
        optionsRef.current.speech.speak(spokenPhrase(s.mode, s.level, s.current.question.time));
      },
    };
  }, [controller, message, feedback, view]);
}
