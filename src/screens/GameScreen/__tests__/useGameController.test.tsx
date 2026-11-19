// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { act, renderHook } from '@testing-library/react';
import { StrictMode } from 'react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { GameEventEnvelope, GameMode, GameState, LevelId, RoundSummary } from '../../../contracts';
import { initGame } from '../../../domain/gameReducer';
import { RESULT_TITLES } from '../../../domain/scoring';
import {
  CONFETTI_COUNTS,
  INITIAL_GAME_VIEW,
  controllerReducer,
  createSessionSeed,
  drainEvents,
  isNewEnvelope,
  praiseSpeech,
  reduceGameView,
  runGameEffects,
  useGameController,
  useGameSession,
} from '../useGameController';
import type { GameEffects, GameSessionApi, GameSessionOptions } from '../useGameController';

const strict = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>;

function seeds(prefix = 's'): () => { sessionId: string; seed: number } {
  let n = 0;
  return () => {
    n += 1;
    return { sessionId: `${prefix}-${n}`, seed: 1000 + n };
  };
}

/** Responde a pergunta atual corretamente (fichas certas ou ponteiros na hora-alvo). */
function solve(api: Pick<GameSessionApi, 'state' | 'tapTile' | 'moveHands' | 'checkHands'>, getState: () => GameState | null): void {
  const s = getState();
  if (s === null) throw new Error('sem estado');
  const q = s.current.question;
  if (q.mode === 'hands') {
    act(() => api.moveHands({ h: q.time.h, m: q.time.m }));
    act(() => api.checkHands());
    return;
  }
  for (const slot of q.slots) {
    const tile = q.banks.flatMap((b) => b.tiles).find((tl) => tl.group === slot.group && tl.value === slot.answer);
    if (tile === undefined) throw new Error('ficha correta ausente');
    act(() => api.tapTile(tile.id));
  }
}

/** Primeira ficha errada do mesmo grupo da primeira lacuna (conta erro). */
function wrongTile(state: GameState): { tileId: string; slotId: string } {
  const q = state.current.question;
  if (q.mode === 'hands') throw new Error('modo ponteiros');
  const slot = q.slots[0];
  if (slot === undefined) throw new Error('sem lacuna');
  const tile = q.banks.flatMap((b) => b.tiles).find((tl) => tl.group === slot.group && tl.value !== slot.answer);
  if (tile === undefined) throw new Error('sem distrator');
  return { tileId: tile.id, slotId: slot.id };
}

describe('controllerReducer / cursor', () => {
  it('ignora ações antes do start e inicia sem estado prévio', () => {
    expect(controllerReducer(null, { type: 'next' })).toBeNull();
    const s = controllerReducer(null, { type: 'start', sessionId: 'a', seed: 1, mode: 'numbers', levelId: 1 });
    expect(s?.sessionId).toBe('a');
    expect(s?.pendingEvents.map((e) => e.event.type)).toEqual(['question-started']);
  });

  it('isNewEnvelope: sessão diferente ou seq maior', () => {
    const env = (sessionId: string, seq: number): GameEventEnvelope => ({ sessionId, seq, event: { type: 'question-started', index: 0 } });
    expect(isNewEnvelope(null, env('a', 1))).toBe(true);
    expect(isNewEnvelope({ sessionId: 'a', seq: 3 }, env('a', 3))).toBe(false);
    expect(isNewEnvelope({ sessionId: 'a', seq: 3 }, env('a', 2))).toBe(false);
    expect(isNewEnvelope({ sessionId: 'a', seq: 3 }, env('a', 4))).toBe(true);
    expect(isNewEnvelope({ sessionId: 'a', seq: 9 }, env('b', 1))).toBe(true);
  });

  it('drainEvents: mesma fila duas vezes (remontagem antes do ack) executa uma vez', () => {
    const env = (seq: number, sessionId = 'a'): GameEventEnvelope => ({ sessionId, seq, event: { type: 'question-started', index: seq } });
    const cursorRef = { current: null };
    const run = vi.fn();
    const queue = [env(1), env(2), env(3)];
    expect(drainEvents(cursorRef, queue, run)).toBe(3);
    expect(drainEvents(cursorRef, queue, run)).toBe(3);
    expect(run.mock.calls.map(([e]) => (e as GameEventEnvelope).seq)).toEqual([1, 2, 3]);
    // ack ainda não aplicado + novos envelopes anexados: só os novos rodam.
    expect(drainEvents(cursorRef, [...queue, env(4), env(5)], run)).toBe(5);
    expect(run).toHaveBeenCalledTimes(5);
    // Nova sessão (seq continua) roda; fila vazia não gera ack.
    expect(drainEvents(cursorRef, [env(6, 'b')], run)).toBe(6);
    expect(run).toHaveBeenCalledTimes(6);
    expect(drainEvents(cursorRef, [], run)).toBeNull();
    expect(cursorRef.current).toEqual({ sessionId: 'b', seq: 6 });
  });

  it('createSessionSeed gera ids distintos e seed uint32', () => {
    const a = createSessionSeed();
    const b = createSessionSeed();
    expect(a.sessionId).not.toBe(b.sessionId);
    expect(Number.isInteger(a.seed) && a.seed >= 0 && a.seed <= 0xffffffff).toBe(true);
  });
});

describe('useGameController (StrictMode, batching, ack ordenado)', () => {
  it('executa cada envelope uma vez, em ordem de seq, e confirma a fila', () => {
    const seen: GameEventEnvelope[] = [];
    const { result } = renderHook(() => useGameController({ onEvent: (e) => seen.push(e), createSession: seeds() }), { wrapper: strict });
    expect(result.current.state).toBeNull();

    act(() => result.current.start('numbers', 1));
    expect(seen.map((e) => [e.seq, e.event.type])).toEqual([[1, 'question-started']]);
    expect(result.current.state?.pendingEvents).toEqual([]);

    const s = result.current.state as GameState;
    const bad = wrongTile(s);
    // Várias ações no mesmo act: automatic batching -> uma renderização, vários envelopes.
    act(() => {
      result.current.dropTile(bad.tileId, bad.slotId);
      result.current.requestHelp();
      result.current.dropTile(bad.tileId, bad.slotId);
    });
    expect(seen.map((e) => e.event.type)).toEqual(['question-started', 'tile-rejected', 'help-shown', 'tile-rejected']);
    const seqs = seen.map((e) => e.seq);
    expect(seqs).toEqual([...seqs].sort((a, b) => a - b));
    expect(new Set(seqs).size).toBe(seqs.length);
    expect(result.current.state?.pendingEvents).toEqual([]);
  });

  it('novo start: nova sessão, numeração continua e fila anterior é descartada', () => {
    const seen: GameEventEnvelope[] = [];
    const createSession = seeds();
    const { result } = renderHook(() => useGameController({ onEvent: (e) => seen.push(e), createSession }), { wrapper: strict });
    act(() => result.current.start('hands', 2));
    act(() => {
      result.current.checkHands();
      result.current.start('words', 3);
    });
    const last = seen[seen.length - 1];
    expect(last?.sessionId).toBe('s-2');
    expect(last?.event).toEqual({ type: 'question-started', index: 0 });
    // O hands-rejected da sessão abandonada (mesmo batch) não é executado.
    expect(seen.some((e) => e.event.type === 'hands-rejected')).toBe(false);
    expect(last?.seq).toBeGreaterThan(seen[0]?.seq ?? 0);
    expect(result.current.state?.mode).toBe('words');
  });

  it('erro num efeito não trava a fila nem é repetido', () => {
    vi.useFakeTimers();
    const calls: string[] = [];
    const errors: unknown[] = [];
    const queue = vi.spyOn(globalThis, 'queueMicrotask').mockImplementation((cb) => {
      try {
        cb();
      } catch (e) {
        errors.push(e);
      }
    });
    const { result } = renderHook(
      () =>
        useGameController({
          createSession: seeds(),
          onEvent: (e) => {
            calls.push(e.event.type);
            if (e.event.type === 'tile-rejected') throw new Error('boom');
          },
        }),
      { wrapper: strict },
    );
    act(() => result.current.start('numbers', 1));
    const bad = wrongTile(result.current.state as GameState);
    act(() => {
      result.current.dropTile(bad.tileId, bad.slotId);
      result.current.requestHelp();
    });
    expect(calls).toEqual(['question-started', 'tile-rejected', 'help-shown']);
    expect(errors).toHaveLength(1);
    expect(result.current.state?.pendingEvents).toEqual([]);
    queue.mockRestore();
    vi.useRealTimers();
  });
});

describe('reduceGameView', () => {
  const env = (event: GameEventEnvelope['event'], seq = 1): GameEventEnvelope => ({ sessionId: 'a', seq, event });

  it('tremor por ficha, realce, brilho e humor do mascote', () => {
    let v = reduceGameView(INITIAL_GAME_VIEW, env({ type: 'tile-rejected', tileId: 'hour-1', slotId: 'slot-hour', hint: 'drop.hour.rounded-up', counted: true }));
    expect(v.shakeSeq['hour-1']).toBe(1);
    expect(v.mascot.mood).toBe('think');
    v = reduceGameView(v, env({ type: 'tile-rejected', tileId: 'hour-1', slotId: 'slot-hour', hint: 'drop.hour.rounded-up', counted: true }));
    expect(v.shakeSeq['hour-1']).toBe(2);
    v = reduceGameView(v, env({ type: 'help-shown', hint: 'help.analog.minute', highlight: { hands: 'minute', slotId: 'slot-minute', digitalGroup: 'minute', minuteLabels: true } }));
    expect(v.handHighlight).toEqual({ target: 'minute', seq: 3 });
    expect(v.slotGlow).toEqual({ slotId: 'slot-minute', seq: 3 });
    expect(v.digitalGlow).toEqual({ group: 'minute', seq: 3 });
    expect(v.minuteLabels).toBe(true);
    expect(v.mascot.mood).toBe('hint');
    v = reduceGameView(v, env({ type: 'hands-rejected', hint: 'hands.hour.adjust', highlight: 'hour' }));
    expect(v.handHighlight).toEqual({ target: 'hour', seq: 4 });
    v = reduceGameView(v, env({ type: 'question-completed', index: 0, mistakes: 2, perfect: false }));
    expect(v.minuteLabels).toBe(false);
    expect(v.mascot).toEqual({ mood: 'celebrate', bounceSeq: 5 });
    v = reduceGameView(v, env({ type: 'question-started', index: 1 }));
    expect(v.shakeSeq).toEqual({});
    expect(v.handHighlight).toBeNull();
    expect(v.mascot.mood).toBe('happy');
    expect(v.seq).toBe(6);
  });
});

function fakeEffects(): GameEffects & { sounds: string[]; spoken: string[]; confettiCounts: number[] } {
  const sounds: string[] = [];
  const spoken: string[] = [];
  const confettiCounts: number[] = [];
  return {
    sounds,
    spoken,
    confettiCounts,
    sound: { play: (n) => void sounds.push(n) },
    speech: { speak: (t) => void spoken.push(t) },
    recordStars: vi.fn(() => true),
    confetti: (n) => void confettiCounts.push(n),
    finished: vi.fn(),
  };
}

describe('runGameEffects', () => {
  it('mapeia eventos para som; dicas nunca são faladas', () => {
    const fx = fakeEffects();
    const e = (event: GameEventEnvelope['event']): GameEventEnvelope => ({ sessionId: 'a', seq: 1, event });
    runGameEffects(e({ type: 'question-started', index: 0 }), null, fx);
    runGameEffects(e({ type: 'question-started', index: 1 }), null, fx);
    runGameEffects(e({ type: 'tile-placed', tileId: 'x', slotId: 'y', questionComplete: false }), null, fx);
    runGameEffects(e({ type: 'tile-rejected', tileId: 'x', slotId: 'y', hint: 'drop.group-mismatch', counted: false }), null, fx);
    runGameEffects(e({ type: 'hands-rejected', hint: 'hands.minute.on-12', highlight: 'minute' }), null, fx);
    runGameEffects(e({ type: 'help-shown', hint: 'help.hands', highlight: { minuteLabels: true } }), null, fx);
    expect(fx.sounds).toEqual(['pick', 'drop', 'wrong', 'wrong']);
    expect(fx.spoken).toEqual([]);
  });

  it('fim da rodada: fanfarra, confete 80, recorde, título falado e navegação', () => {
    const fx = fakeEffects();
    const summary: RoundSummary = { mode: 'words', levelId: 2, starsKey: 'words-2', results: [0, 0, 0, 0, 0, 0, 0, 1], totalMistakes: 1, perfect: 7, stars: 3 };
    runGameEffects({ sessionId: 'a', seq: 9, event: { type: 'round-finished', summary } }, null, fx);
    expect(fx.sounds).toEqual(['fanfare']);
    expect(fx.confettiCounts).toEqual([CONFETTI_COUNTS.round]);
    expect(fx.recordStars).toHaveBeenCalledWith('words-2', 3);
    expect(fx.spoken).toEqual([RESULT_TITLES[3]]);
    expect(fx.finished).toHaveBeenCalledWith(summary, true);
  });
});

describe('anúncio 12 h / 24 h por nível', () => {
  function completed(mode: GameMode, levelId: LevelId, seed: number): GameState {
    let s: GameState = initGame({ type: 'start', sessionId: 'x', seed, mode, levelId });
    const q = s.current.question;
    if (q.mode === 'hands') {
      s = controllerReducer(s, { type: 'move-hands', time: q.time }) as GameState;
      return controllerReducer(s, { type: 'check-hands' }) as GameState;
    }
    for (const slot of q.slots) {
      const tile = q.banks.flatMap((b) => b.tiles).find((tl) => tl.group === slot.group && tl.value === slot.answer);
      s = controllerReducer(s, { type: 'tap-tile', tileId: tile?.id ?? '' }) as GameState;
    }
    return s;
  }

  it.each(['numbers', 'words', 'hands'] as const)('%s: nível 4 fala 24 h + período; níveis 1–3 não', (mode) => {
    for (let seed = 1; seed <= 20; seed++) {
      const l4 = completed(mode, 4, seed);
      expect(l4.current.done).toBe(true);
      const text4 = praiseSpeech(l4, 0) ?? '';
      expect(text4).toMatch(/da madrugada|da manhã|da tarde|da noite|meio-dia|meia-noite/);
      if (mode !== 'words') expect(text4).toContain(' Ou: ');
      for (const level of [1, 2, 3] as const) {
        const text = praiseSpeech(completed(mode, level, seed), 0) ?? '';
        expect(text).not.toContain(' Ou: ');
        expect(text).not.toMatch(/da madrugada|da manhã|da tarde|da noite/);
      }
    }
  });

  it('praiseSpeech só fala a pergunta concluída atual', () => {
    const s = completed('numbers', 1, 3);
    expect(praiseSpeech(s, 1)).toBeNull();
    expect(praiseSpeech(null, 0)).toBeNull();
    expect(praiseSpeech(initGame({ type: 'start', sessionId: 'x', seed: 3, mode: 'numbers', levelId: 1 }), 0)).toBeNull();
  });
});

function sessionHarness(extra: Partial<GameSessionOptions> = {}) {
  const sounds: string[] = [];
  const spoken: string[] = [];
  const confetti: number[] = [];
  const options: GameSessionOptions = {
    sound: { play: (n) => void sounds.push(n), unlock: vi.fn() },
    speech: { speak: (t) => void spoken.push(t), cancel: vi.fn() },
    recordStars: vi.fn(() => true),
    onConfetti: (n) => void confetti.push(n),
    onFinished: vi.fn(),
    createSession: seeds(),
    ...extra,
  };
  const hook = renderHook(() => useGameSession(options), { wrapper: strict });
  return { ...hook, options, sounds, spoken, confetti };
}

describe('useGameSession: rodada completa sob StrictMode sem duplicar efeitos', () => {
  it.each([
    ['numbers', 1],
    ['words', 4],
    ['hands', 3],
  ] as const)('%s nível %i', (mode, levelId) => {
    const h = sessionHarness();
    const api = () => h.result.current;
    act(() => api().start(mode, levelId));
    expect(h.options.speech.cancel).toHaveBeenCalledTimes(1);
    expect(api().message?.code).toBe('intro');
    for (let i = 0; i < 8; i++) {
      solve(api(), () => api().state);
      expect(api().state?.current.done).toBe(true);
      expect(api().view.mascot.mood).toBe('celebrate');
      act(() => api().next());
    }
    expect(api().state?.status).toBe('finished');
    expect(h.sounds.filter((s) => s === 'success')).toHaveLength(8);
    expect(h.sounds.filter((s) => s === 'fanfare')).toHaveLength(1);
    expect(h.sounds.filter((s) => s === 'pick')).toHaveLength(7);
    expect(h.confetti).toEqual([...Array<number>(8).fill(CONFETTI_COUNTS.perfect), CONFETTI_COUNTS.round]);
    // 8 elogios + título da rodada, sem dicas.
    expect(h.spoken).toHaveLength(9);
    expect(h.spoken[8]).toBe(RESULT_TITLES[3]);
    expect(h.options.recordStars).toHaveBeenCalledTimes(1);
    expect(h.options.recordStars).toHaveBeenCalledWith(`${mode}-${levelId}`, 3);
    expect(h.options.onFinished).toHaveBeenCalledTimes(1);
    expect(api().state?.pendingEvents).toEqual([]);
  });

  it('erros: tremor e som "wrong"; dica sem fala; confete menor', () => {
    const h = sessionHarness();
    const api = () => h.result.current;
    act(() => api().start('numbers', 2));
    const bad = wrongTile(api().state as GameState);
    act(() => api().dropTile(bad.tileId, bad.slotId));
    expect(api().view.shakeSeq[bad.tileId]).toBeGreaterThan(0);
    expect(api().tone).toBe('corrective');
    act(() => api().requestHelp());
    expect(api().view.mascot.mood).toBe('hint');
    expect(h.spoken).toEqual([]);
    solve(api(), () => api().state);
    expect(h.confetti).toEqual([CONFETTI_COUNTS.withMistakes]);
    expect(h.sounds).toEqual(['wrong', 'drop', 'drop', 'success']);
  });

  it('ponteiros: "tick" só quando a posição muda; Ouvir respeita o nível', () => {
    const h = sessionHarness();
    const api = () => h.result.current;
    act(() => api().start('hands', 4));
    const start = api().state?.current.hands ?? { h: 0, m: 0 };
    act(() => api().moveHands(start));
    expect(h.sounds).toEqual([]);
    act(() => api().moveHands({ h: (start.h + 1) % 24, m: start.m }));
    expect(h.sounds).toEqual(['tick']);
    act(() => api().listen());
    expect(h.spoken[0]).toContain(' Ou: ');

    act(() => api().start('numbers', 1));
    act(() => api().listen());
    expect(h.spoken[1]).not.toContain(' Ou: ');
    act(() => api().pickTile('hour-0'));
    expect(h.sounds[h.sounds.length - 1]).toBe('pick');
  });

  it('listen antes do start não fala', () => {
    const h = sessionHarness();
    act(() => h.result.current.listen());
    expect(h.spoken).toEqual([]);
  });
});
