// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { useEffect, useEffectEvent, useLayoutEffect, useMemo, useReducer, useRef } from 'react';

import type {
  ClockTime,
  Feedback,
  GameAction,
  GameControllerApi,
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
} from '../../contracts';
import { gameReducer, initGame } from '../../domain/gameReducer';
import { renderMessage } from '../../domain/hints';
import { toPlainText } from '../../domain/messages';
import { spokenPhrase } from '../../domain/question';
import { RESULT_TITLES } from '../../domain/scoring';

export interface SessionSeed {
  readonly sessionId: string;
  readonly seed: number;
}

export interface GameControllerHookOptions {
  readonly onEvent: (envelope: GameEventEnvelope, origin: GameState) => void;
  readonly createSession?: () => SessionSeed;
  readonly initialState?: GameState;
}

export interface GameControllerHookApi extends GameControllerApi {
  abandon(): void;
}

export interface EventOrigin {
  readonly seq: number;
  readonly state: GameState;
}

export interface ControllerState {
  readonly game: GameState | null;
  readonly lastEventSeq: number;
  readonly origins: readonly EventOrigin[];
}

export type ControllerAction = GameAction | { readonly type: 'controller/abandon' };

export const INITIAL_CONTROLLER_STATE: ControllerState = Object.freeze({
  game: null,
  lastEventSeq: 0,
  origins: Object.freeze([]),
});

export function controllerStateFrom(game: GameState): ControllerState {
  return {
    game,
    lastEventSeq: game.lastEventSeq,
    origins: game.pendingEvents.map((e) => ({ seq: e.seq, state: game })),
  };
}

const EMPTY_QUEUE: readonly GameEventEnvelope[] = Object.freeze([]);
let fallbackCounter = 0;

export function createSessionSeed(): SessionSeed {
  const c = typeof crypto === 'undefined' ? undefined : crypto;
  const seed =
    c && typeof c.getRandomValues === 'function'
      ? (c.getRandomValues(new Uint32Array(1))[0] ?? 0)
      : (Math.floor(Math.random() * 0x1_0000_0000) >>> 0);
  const sessionId =
    c && typeof c.randomUUID === 'function'
      ? c.randomUUID()
      : `s-${Date.now().toString(36)}-${(++fallbackCounter).toString(36)}-${seed.toString(36)}`;
  return { sessionId, seed };
}

export function controllerReducer(state: ControllerState, action: ControllerAction): ControllerState {
  if (action.type === 'controller/abandon') {
    return state.game === null ? state : { game: null, lastEventSeq: state.lastEventSeq, origins: [] };
  }
  let game: GameState;
  if (state.game === null) {
    if (action.type !== 'start') return state;
    game = initGame(action, state.lastEventSeq);
  } else {
    game = gameReducer(state.game, action);
    if (game === state.game) return state;
  }
  const prevLast = state.game?.lastEventSeq ?? state.lastEventSeq;
  const pending = new Set(game.pendingEvents.map((e) => e.seq));
  const origins = state.origins.filter((o) => pending.has(o.seq));
  for (const e of game.pendingEvents) {
    if (e.seq > prevLast) origins.push({ seq: e.seq, state: game });
  }
  return { game, lastEventSeq: game.lastEventSeq, origins };
}

export function isNewEnvelope(cursor: GameEventCursor | null, envelope: GameEventEnvelope): boolean {
  return cursor === null || cursor.sessionId !== envelope.sessionId || envelope.seq > cursor.seq;
}

function reportEffectError(error: unknown): void {
  queueMicrotask(() => {
    throw error;
  });
}

export function drainEvents(
  cursorRef: { current: GameEventCursor | null },
  queue: readonly GameEventEnvelope[],
  run: (envelope: GameEventEnvelope) => void,
): number | null {
  const last = queue[queue.length - 1];
  if (!last) return null;
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

export function useGameController(options: GameControllerHookOptions): GameControllerHookApi {
  const [inner, dispatch] = useReducer(
    controllerReducer,
    options.initialState,
    (init) => (init === undefined ? INITIAL_CONTROLLER_STATE : controllerStateFrom(init)),
  );
  const cursorRef = useRef<GameEventCursor | null>(null);
  const runEvent = useEffectEvent((envelope: GameEventEnvelope, origin: GameState) =>
    options.onEvent(envelope, origin),
  );
  const createSessionRef = useRef(options.createSession ?? createSessionSeed);
  useLayoutEffect(() => {
    createSessionRef.current = options.createSession ?? createSessionSeed;
  });

  const state = inner.game;
  const queue = state?.pendingEvents ?? EMPTY_QUEUE;
  const { origins } = inner;

  useEffect(() => {
    const upToSeq = drainEvents(cursorRef, queue, (envelope) => {
      const origin = origins.find((o) => o.seq === envelope.seq)?.state;
      if (origin) runEvent(envelope, origin);
    });
    if (upToSeq !== null) dispatch({ type: 'events/ack', upToSeq });
  }, [queue, origins]);

  return useMemo<GameControllerHookApi>(
    () => ({
      state,
      start(mode: GameMode, levelId: LevelId) {
        const { sessionId, seed } = createSessionRef.current();
        dispatch({ type: 'start', sessionId, seed, mode, levelId });
      },
      dropTile: (tileId, slotId) => dispatch({ type: 'drop-tile', tileId, slotId }),
      tapTile: (tileId) => dispatch({ type: 'tap-tile', tileId }),
      moveHands: (time: ClockTime) => dispatch({ type: 'move-hands', time }),
      checkHands: () => dispatch({ type: 'check-hands' }),
      requestHelp: () => dispatch({ type: 'request-help' }),
      next: () => dispatch({ type: 'next' }),
      abandon: () => dispatch({ type: 'controller/abandon' }),
    }),
    [state],
  );
}

export interface MascotSignal {
  readonly mood: MascotMood;
  readonly bounceSeq: number;
}

export interface GameView {
  readonly seq: number;
  readonly mascot: MascotSignal;
  readonly shakeSeq: Readonly<Record<string, number>>;
  readonly handHighlight: HandHighlight | null;
  readonly slotGlow: { readonly slotId: string; readonly seq: number } | null;
  readonly digitalGlow: { readonly group: HandName; readonly seq: number } | null;
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

export function reduceGameView(view: GameView, envelope: GameEventEnvelope): GameView {
  const seq = view.seq + 1;
  const { event } = envelope;
  const keepBounce = (mood: MascotMood): MascotSignal => ({ mood, bounceSeq: view.mascot.bounceSeq });
  switch (event.type) {
    case 'question-started':
      return { ...INITIAL_GAME_VIEW, seq, mascot: keepBounce('happy') };
    case 'tile-placed':
      return { ...view, seq, mascot: { mood: 'happy', bounceSeq: seq } };
    case 'tile-rejected':
      return {
        ...view,
        seq,
        shakeSeq: { ...view.shakeSeq, [event.tileId]: seq },
        mascot: keepBounce('think'),
      };
    case 'hands-rejected':
      return {
        ...view,
        seq,
        handHighlight: { target: event.highlight, seq },
        mascot: keepBounce('think'),
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
        mascot: keepBounce('hint'),
      };
    }
    case 'question-completed':
      return { ...view, seq, minuteLabels: false, mascot: { mood: 'celebrate', bounceSeq: seq } };
    case 'round-finished':
      return { ...view, seq, mascot: { mood: 'celebrate', bounceSeq: seq } };
  }
}

export const CONFETTI_COUNTS = { perfect: 40, withMistakes: 18, round: 80 } as const;

export interface GameEffects {
  readonly sound: Pick<SoundApi, 'play'>;
  readonly speech: Pick<SpeechApi, 'speak'>;
  readonly recordStars: PreferencesApi['recordStars'];
  readonly confetti: (count: number) => void;
  readonly finished: (summary: RoundSummary, newRecord: boolean) => void;
}

export function praiseSpeech(state: GameState | null, index: number): string | null {
  if (!state || state.index !== index || !state.current.done) return null;
  return state.feedback.code === 'praise'
    ? toPlainText(renderMessage('praise', state.feedback.context))
    : spokenPhrase(state.mode, state.level, state.current.question.time);
}

export function runGameEffects(
  envelope: GameEventEnvelope,
  origin: GameState | null,
  fx: GameEffects,
): void {
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
      return;
    case 'question-completed': {
      fx.sound.play('success');
      fx.confetti(event.perfect ? CONFETTI_COUNTS.perfect : CONFETTI_COUNTS.withMistakes);
      const text = praiseSpeech(origin, event.index);
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
    }
  }
}

export interface GameSessionOptions {
  readonly sound: Pick<SoundApi, 'play' | 'unlock'>;
  readonly speech: Pick<SpeechApi, 'speak' | 'cancel'>;
  readonly recordStars: PreferencesApi['recordStars'];
  readonly onConfetti: (count: number) => void;
  readonly onFinished: (summary: RoundSummary, newRecord: boolean) => void;
  readonly createSession?: () => SessionSeed;
  readonly initialState?: GameState;
}

export interface GameSessionApi extends GameControllerHookApi {
  readonly message: Message | null;
  readonly tone: Feedback['tone'];
  readonly view: GameView;
  pickTile(tileId: string): void;
  listen(): void;
}

type ViewAction =
  | { readonly type: 'event'; readonly envelope: GameEventEnvelope }
  | { readonly type: 'reset' };

function viewReducer(view: GameView, action: ViewAction): GameView {
  return action.type === 'reset'
    ? { ...INITIAL_GAME_VIEW, seq: view.seq }
    : reduceGameView(view, action.envelope);
}

export function useGameSession(options: GameSessionOptions): GameSessionApi {
  const [view, dispatchView] = useReducer(viewReducer, INITIAL_GAME_VIEW);
  const stateRef = useRef<GameState | null>(null);
  const optionsRef = useRef(options);
  useLayoutEffect(() => {
    optionsRef.current = options;
  });

  const speechForCommit = useRef<string[]>([]);
  const controller = useGameController({
    ...(options.createSession === undefined ? {} : { createSession: options.createSession }),
    ...(options.initialState === undefined ? {} : { initialState: options.initialState }),
    onEvent: (envelope, origin) => {
      const o = optionsRef.current;
      dispatchView({ type: 'event', envelope });
      runGameEffects(envelope, origin, {
        sound: o.sound,
        speech: { speak: (text) => speechForCommit.current.push(text) },
        recordStars: o.recordStars,
        confetti: o.onConfetti,
        finished: o.onFinished,
      });
    },
  });

  useEffect(() => {
    const texts = speechForCommit.current;
    if (!texts.length) return;
    speechForCommit.current = [];
    try {
      optionsRef.current.speech.speak(texts.join(' '));
    } catch (error) {
      reportEffectError(error);
    }
  });

  const { state } = controller;
  useLayoutEffect(() => {
    stateRef.current = state;
  }, [state]);

  const feedback = state?.feedback ?? null;
  const message = useMemo(
    () => (feedback === null ? null : renderMessage(feedback.code, feedback.context)),
    [feedback],
  );

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
      abandon() {
        optionsRef.current.speech.cancel();
        dispatchView({ type: 'reset' });
        controller.abandon();
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
        if (hands && (hands.h !== time.h || hands.m !== time.m)) {
          optionsRef.current.sound.play('tick');
        }
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
        if (s) optionsRef.current.speech.speak(spokenPhrase(s.mode, s.level, s.current.question.time));
      },
    };
  }, [controller, message, feedback, view]);
}
