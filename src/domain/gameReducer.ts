// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { timeKey } from './clockMath';
import { diagnoseDrop, diagnoseHands, helpFor } from './hints';
import { getLevel, isLevelId } from './levels';
import { buildQuestion } from './question';
import { mulberry32, randInt } from './rng';
import type { SeededRng } from './rng';
import { buildRoundSummary, DEFAULT_ROUND_LENGTH } from './scoring';
import type {
  Attempt,
  ClockTime,
  Feedback,
  GameAction,
  GameEvent,
  GameEventEnvelope,
  GameState,
  Group,
  HintContext,
  MessageCode,
  Question,
  QuestionState,
  SlotSpec,
  TileSpec,
} from './types';

export type StartAction = Extract<GameAction, { readonly type: 'start' }>;

const ZERO_BY_GROUP: Readonly<Record<Group, number>> = { hour: 0, minute: 0, period: 0 };
const VARIANT_MAX = 1023;

function newQuestionState(question: Question): QuestionState {
  return {
    question,
    filled: {},
    usedTileIds: [],
    hands: question.mode === 'hands' ? question.start : null,
    mistakes: 0,
    wrongByGroup: ZERO_BY_GROUP,
    attempts: [],
    hinted: false,
    done: false,
  };
}

interface ContextExtras {
  readonly group?: Group;
  readonly attempt?: Attempt;
  readonly variant?: number;
}

function contextOf(
  state: Pick<GameState, 'mode' | 'level'>,
  q: QuestionState,
  extras: ContextExtras = {},
): HintContext {
  const { question } = q;
  return {
    mode: state.mode,
    level: state.level,
    time: question.time,
    displayH: question.displayH,
    stimulus: question.stimulus,
    ...(extras.group === undefined ? {} : { group: extras.group }),
    ...(extras.attempt === undefined ? {} : { attempt: extras.attempt }),
    mistakes: q.mistakes,
    wrongByGroup: q.wrongByGroup,
    variant: extras.variant ?? 0,
  };
}

function feedback(code: MessageCode, context: HintContext, tone: Feedback['tone']): Feedback {
  return { code, context, tone };
}

function withEvents<S extends GameState>(state: S, events: readonly GameEvent[]): S {
  if (!events.length) return state;
  let seq = state.lastEventSeq;
  const envelopes: GameEventEnvelope[] = events.map((event) => ({
    sessionId: state.sessionId,
    seq: ++seq,
    event,
  }));
  return { ...state, pendingEvents: [...state.pendingEvents, ...envelopes], lastEventSeq: seq };
}

export function initGame(action: StartAction, lastEventSeq = 0): GameState {
  const level = getLevel(isLevelId(action.levelId) ? action.levelId : 1);
  const roundLength =
    action.roundLength !== undefined && Number.isInteger(action.roundLength) && action.roundLength > 0
      ? action.roundLength
      : DEFAULT_ROUND_LENGTH;
  const rng = mulberry32(action.seed);
  const question = buildQuestion(action.mode, level, new Set(), rng, 0);
  const current = newQuestionState(question);
  return withEvents(
    {
      sessionId: action.sessionId,
      mode: action.mode,
      level,
      status: 'playing',
      roundLength,
      seed: action.seed >>> 0,
      rngState: rng.state(),
      index: 0,
      results: [],
      usedTimes: [timeKey(question.time)],
      current,
      feedback: feedback('intro', contextOf({ mode: action.mode, level }, current), 'neutral'),
      pendingEvents: [],
      lastEventSeq: Math.max(0, lastEventSeq),
    },
    [{ type: 'question-started', index: 0 }],
  );
}

const isPlayable = (state: GameState): boolean => state.status === 'playing' && !state.current.done;

function findTile(question: Question, tileId: string): TileSpec | undefined {
  if (question.mode === 'hands') return undefined;
  for (const bank of question.banks) {
    const tile = bank.tiles.find((tl) => tl.id === tileId);
    if (tile) return tile;
  }
  return undefined;
}

function completeQuestion(
  state: GameState,
  q: QuestionState,
  rng: SeededRng,
  extraEvents: readonly GameEvent[],
): GameState {
  const done: QuestionState = { ...q, done: true };
  const variant = randInt(0, VARIANT_MAX, rng);
  return withEvents(
    {
      ...state,
      rngState: rng.state(),
      results: [...state.results, done.mistakes],
      current: done,
      feedback: feedback('praise', contextOf(state, done, { variant }), 'positive'),
    },
    [
      ...extraEvents,
      {
        type: 'question-completed',
        index: state.index,
        mistakes: done.mistakes,
        perfect: done.mistakes === 0,
      },
    ],
  );
}

function dropTile(state: GameState, tileId: string, slotId: string): GameState {
  if (!isPlayable(state)) return state;
  const q = state.current;
  const { question } = q;
  const tile = findTile(question, tileId);
  const slot: SlotSpec | undefined =
    question.mode === 'hands' ? undefined : question.slots.find((sl) => sl.id === slotId);
  if (!tile || !slot || q.filled[slot.id] !== undefined || q.usedTileIds.includes(tile.id)) {
    return state;
  }

  const correct = tile.group === slot.group && tile.value === slot.answer;
  const attempt: Attempt = {
    kind: 'drop',
    tileId: tile.id,
    slotId: slot.id,
    tileGroup: tile.group,
    slotGroup: slot.group,
    value: tile.value,
    ...(tile.num === undefined ? {} : { num: tile.num }),
    correct,
  };

  if (!correct) {
    const counted = tile.group === slot.group;
    const wrongByGroup = counted
      ? { ...q.wrongByGroup, [slot.group]: q.wrongByGroup[slot.group] + 1 }
      : q.wrongByGroup;
    const nq: QuestionState = {
      ...q,
      mistakes: counted ? q.mistakes + 1 : q.mistakes,
      wrongByGroup,
      attempts: [...q.attempts, attempt],
    };
    const hint = counted
      ? diagnoseDrop({ mode: state.mode, level: state.level, question, tile, slot, wrongByGroup })
      : 'drop.group-mismatch';
    return withEvents(
      {
        ...state,
        current: nq,
        feedback: feedback(hint, contextOf(state, nq, { group: slot.group, attempt }), 'corrective'),
      },
      [{ type: 'tile-rejected', tileId: tile.id, slotId: slot.id, hint, counted }],
    );
  }

  const filled = { ...q.filled, [slot.id]: tile.id };
  const nq: QuestionState = {
    ...q,
    filled,
    usedTileIds: [...q.usedTileIds, tile.id],
    attempts: [...q.attempts, attempt],
  };
  const complete =
    question.mode !== 'hands' && question.slots.every((sl) => filled[sl.id] !== undefined);
  const placed: GameEvent = {
    type: 'tile-placed',
    tileId: tile.id,
    slotId: slot.id,
    questionComplete: complete,
  };
  const rng = mulberry32(state.rngState);
  if (complete) return completeQuestion(state, nq, rng, [placed]);

  const variant = randInt(0, VARIANT_MAX, rng);
  return withEvents(
    {
      ...state,
      rngState: rng.state(),
      current: nq,
      feedback: feedback(
        'progress',
        contextOf(state, nq, { group: slot.group, attempt, variant }),
        'positive',
      ),
    },
    [placed],
  );
}

function tapTile(state: GameState, tileId: string): GameState {
  if (!isPlayable(state)) return state;
  const { question, filled } = state.current;
  const tile = findTile(question, tileId);
  if (!tile || question.mode === 'hands') return state;
  const slot = question.slots.find((sl) => sl.group === tile.group && filled[sl.id] === undefined);
  return slot ? dropTile(state, tile.id, slot.id) : state;
}

function moveHands(state: GameState, time: ClockTime): GameState {
  if (
    !isPlayable(state) ||
    state.current.question.mode !== 'hands' ||
    !Number.isInteger(time.h) ||
    time.h < 0 ||
    time.h > 23 ||
    !Number.isInteger(time.m) ||
    time.m < 0 ||
    time.m > 59
  ) {
    return state;
  }
  const prev = state.current.hands;
  return prev && prev.h === time.h && prev.m === time.m
    ? state
    : { ...state, current: { ...state.current, hands: { h: time.h, m: time.m } } };
}

function checkHands(state: GameState): GameState {
  if (!isPlayable(state)) return state;
  const q = state.current;
  if (q.question.mode !== 'hands' || !q.hands) return state;
  const mistakes = q.mistakes + 1;
  const diag = diagnoseHands(q.question.time, q.hands, mistakes);
  const attempt: Attempt = {
    kind: 'hands',
    time: q.hands,
    hourOk: diag.hourOk,
    minuteOk: diag.minuteOk,
    correct: diag.hint === undefined,
  };
  if (!diag.hint || !diag.highlight) {
    return completeQuestion(
      state,
      { ...q, attempts: [...q.attempts, attempt] },
      mulberry32(state.rngState),
      [],
    );
  }
  const group: Group = diag.highlight;
  const nq: QuestionState = {
    ...q,
    mistakes,
    wrongByGroup: { ...q.wrongByGroup, [group]: q.wrongByGroup[group] + 1 },
    attempts: [...q.attempts, attempt],
  };
  return withEvents(
    {
      ...state,
      current: nq,
      feedback: feedback(diag.hint, contextOf(state, nq, { group, attempt }), 'corrective'),
    },
    [{ type: 'hands-rejected', hint: diag.hint, highlight: diag.highlight }],
  );
}

function requestHelp(state: GameState): GameState {
  if (!isPlayable(state)) return state;
  const q = state.current;
  const help = helpFor(q.question, q.filled);
  if (!help) return state;
  const nq: QuestionState = q.hinted ? q : { ...q, hinted: true };
  return withEvents(
    {
      ...state,
      current: nq,
      feedback: feedback(
        help.hint,
        contextOf(state, nq, help.group ? { group: help.group } : {}),
        'neutral',
      ),
    },
    [{ type: 'help-shown', hint: help.hint, highlight: help.highlight }],
  );
}

function next(state: GameState): GameState {
  if (state.status !== 'playing' || !state.current.done) return state;
  const index = state.index + 1;
  if (index >= state.roundLength) {
    const summary = buildRoundSummary(state.mode, state.level.id, state.results);
    return withEvents(
      {
        ...state,
        status: 'finished',
        summary,
        feedback: feedback('done', contextOf(state, state.current), 'positive'),
      },
      [{ type: 'round-finished', summary }],
    );
  }
  const rng = mulberry32(state.rngState);
  const question = buildQuestion(state.mode, state.level, new Set(state.usedTimes), rng, index);
  const current = newQuestionState(question);
  return withEvents(
    {
      ...state,
      rngState: rng.state(),
      index,
      usedTimes: [...state.usedTimes, timeKey(question.time)],
      current,
      feedback: feedback('intro', contextOf(state, current), 'neutral'),
    },
    [{ type: 'question-started', index }],
  );
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'start':
      return initGame(action, state.lastEventSeq);
    case 'drop-tile':
      return dropTile(state, action.tileId, action.slotId);
    case 'tap-tile':
      return tapTile(state, action.tileId);
    case 'move-hands':
      return moveHands(state, action.time);
    case 'check-hands':
      return checkHands(state);
    case 'request-help':
      return requestHelp(state);
    case 'next':
      return next(state);
    case 'events/ack': {
      const limit = Math.min(action.upToSeq, state.lastEventSeq);
      const pendingEvents = state.pendingEvents.filter((e) => e.seq > limit);
      return pendingEvents.length === state.pendingEvents.length
        ? state
        : { ...state, pendingEvents };
    }
    default:
      return state;
  }
}
