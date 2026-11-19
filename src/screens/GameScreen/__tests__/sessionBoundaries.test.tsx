// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

/**
 * Regressões da revisão do 244a6bc:
 * - contexto por evento (origem) com ações no mesmo lote;
 * - sessão delimitada: abandono descarta efeitos ainda não consumidos;
 * - replay do consumidor sobre fila ainda não confirmada (StrictMode).
 */

import { act, render, renderHook } from '@testing-library/react';
import { Activity, StrictMode, useState } from 'react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { GameEventEnvelope, GameState } from '../../../contracts';
import { gameReducer, initGame } from '../../../domain/gameReducer';
import { spokenPhrase } from '../../../domain/question';
import { RESULT_TITLES } from '../../../domain/scoring';
import { INITIAL_CONTROLLER_STATE, controllerReducer, drainEvents, useGameController, useGameSession } from '../useGameController';
import type { GameControllerHookApi, GameSessionApi, GameSessionOptions } from '../useGameController';

const strict = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>;

/** Ações que respondem certo à pergunta atual (sem despachar). */
function correctActions(api: Pick<GameControllerHookApi, 'tapTile' | 'moveHands' | 'checkHands'>, state: GameState): () => void {
  const q = state.current.question;
  if (q.mode === 'hands') {
    return () => {
      api.moveHands(q.time);
      api.checkHands();
    };
  }
  const ids = q.slots.map((slot) => q.banks.flatMap((b) => b.tiles).find((tl) => tl.group === slot.group && tl.value === slot.answer)?.id ?? '');
  return () => {
    for (const id of ids) api.tapTile(id);
  };
}

function harness() {
  const sounds: string[] = [];
  const spoken: string[] = [];
  let n = 0;
  const options: GameSessionOptions = {
    sound: { play: (s) => void sounds.push(s), unlock: vi.fn() },
    speech: { speak: (t) => void spoken.push(t), cancel: vi.fn() },
    recordStars: vi.fn(() => true),
    onConfetti: vi.fn(),
    onFinished: vi.fn(),
    createSession: () => ({ sessionId: `b-${++n}`, seed: 400 + n }),
  };
  const hook = renderHook(() => useGameSession(options), { wrapper: strict });
  const api = (): GameSessionApi => hook.result.current;
  const state = (): GameState => {
    const s = api().state;
    if (s === null) throw new Error('sem estado');
    return s;
  };
  return { ...hook, api, state, options, sounds, spoken };
}

describe('origem por evento', () => {
  it('controllerReducer guarda o estado de emissão de cada envelope', () => {
    let c = controllerReducer(INITIAL_CONTROLLER_STATE, { type: 'start', sessionId: 'a', seed: 9, mode: 'numbers', levelId: 1 });
    const q = c.game?.current.question;
    if (q === undefined || q.mode === 'hands') throw new Error();
    for (const slot of q.slots) {
      const tile = q.banks.flatMap((b) => b.tiles).find((tl) => tl.group === slot.group && tl.value === slot.answer);
      c = controllerReducer(c, { type: 'tap-tile', tileId: tile?.id ?? '' });
    }
    c = controllerReducer(c, { type: 'next' });
    const completed = c.game?.pendingEvents.find((e) => e.event.type === 'question-completed');
    const origin = c.origins.find((o) => o.seq === completed?.seq)?.state;
    expect(origin?.index).toBe(0);
    expect(origin?.current.done).toBe(true);
    expect(c.game?.index).toBe(1);
    expect(c.origins.map((o) => o.seq)).toEqual(c.game?.pendingEvents.map((e) => e.seq));
    // ack remove as origens confirmadas; abandon zera mas preserva a numeração.
    const last = c.game?.lastEventSeq ?? 0;
    c = controllerReducer(c, { type: 'events/ack', upToSeq: last });
    expect(c.origins).toEqual([]);
    c = controllerReducer(c, { type: 'controller/abandon' });
    expect(c.game).toBeNull();
    c = controllerReducer(c, { type: 'start', sessionId: 'b', seed: 1, mode: 'words', levelId: 2 });
    expect(c.game?.pendingEvents[0]?.seq).toBe(last + 1);
  });

  it('acertar + próxima no mesmo lote: fala o elogio e a hora da pergunta concluída', () => {
    const h = harness();
    act(() => h.api().start('numbers', 4));
    const done = h.state().current.question;
    act(() => {
      correctActions(h.api(), h.state())();
      h.api().next();
    });
    expect(h.state().index).toBe(1);
    expect(h.spoken).toHaveLength(1);
    expect(h.spoken[0]).toContain(spokenPhrase('numbers', done.time.h >= 0 ? h.state().level : h.state().level, done.time));
    expect(h.sounds).toEqual(['drop', 'drop', 'success', 'pick']);
  });

  it('última pergunta + próxima no mesmo lote: elogio, fanfarra, título e resultado, nessa ordem', () => {
    const h = harness();
    act(() => h.api().start('hands', 2));
    for (let i = 0; i < 7; i++) {
      act(() => correctActions(h.api(), h.state())());
      act(() => h.api().next());
    }
    const last = h.state().current.question;
    h.spoken.length = 0;
    act(() => {
      correctActions(h.api(), h.state())();
      h.api().next();
    });
    expect(h.spoken).toHaveLength(2);
    expect(h.spoken[0]).toContain(spokenPhrase('hands', h.state().level, last.time));
    expect(h.spoken[1]).toBe(RESULT_TITLES[3]);
    expect(h.options.onFinished).toHaveBeenCalledTimes(1);
  });
});

describe('sessão abandonada não produz efeitos tardios', () => {
  it('concluir a rodada e abandonar no mesmo lote: nada de fanfarra, fala, estrelas ou resultado', () => {
    const h = harness();
    act(() => h.api().start('words', 1));
    for (let i = 0; i < 7; i++) {
      act(() => correctActions(h.api(), h.state())());
      act(() => h.api().next());
    }
    act(() => correctActions(h.api(), h.state())());
    const before = { sounds: h.sounds.length, spoken: h.spoken.length };
    act(() => {
      h.api().next();
      h.api().abandon();
    });
    expect(h.sounds.slice(before.sounds)).toEqual([]);
    expect(h.spoken.slice(before.spoken)).toEqual([]);
    expect(h.options.recordStars).not.toHaveBeenCalled();
    expect(h.options.onFinished).not.toHaveBeenCalled();
    expect(h.api().state).toBeNull();
    expect(h.options.speech.cancel).toHaveBeenCalled();
  });

  it('acertar, sair e começar nova partida no mesmo lote: só a nova sessão gera efeitos', () => {
    const h = harness();
    act(() => h.api().start('numbers', 3));
    const seen: string[] = [];
    act(() => {
      correctActions(h.api(), h.state())();
      h.api().abandon();
      h.api().start('hands', 1);
    });
    seen.push(...h.sounds);
    expect(h.sounds).toEqual([]);
    expect(h.spoken).toEqual([]);
    expect(h.state().mode).toBe('hands');
    expect(h.state().sessionId).toBe('b-2');
    // Renderizações seguintes não trazem nada da sessão antiga.
    act(() => h.api().requestHelp());
    act(() => correctActions(h.api(), h.state())());
    expect(h.sounds).toEqual(['tick', 'success']);
    expect(h.spoken).toHaveLength(1);
    expect(h.spoken[0]).toContain(spokenPhrase('hands', h.state().level, h.state().current.question.time));
  });
});

describe('replay do consumidor com fila ainda não confirmada', () => {
  it('efeito que lança: a fila segue, o erro é reportado e o replay antes do ack não o repete', () => {
    const reported: unknown[] = [];
    const spy = vi.spyOn(globalThis, 'queueMicrotask').mockImplementation((cb) => {
      try {
        cb();
      } catch (error) {
        reported.push(error);
      }
    });
    const queue: GameEventEnvelope[] = [1, 2, 3].map((seq) => ({ sessionId: 'x', seq, event: { type: 'help-shown' } }) as unknown as GameEventEnvelope);
    const cursorRef = { current: null };
    const ran: number[] = [];
    const run = (e: GameEventEnvelope): void => {
      ran.push(e.seq);
      // O último da fila lança: sem cursor avançado antes do efeito, o replay o repetiria.
      if (e.seq === 3) throw new Error('falhou');
    };
    expect(drainEvents(cursorRef, queue, run)).toBe(3);
    // Mesma fila de novo (StrictMode/Activity antes do ack): nada reexecuta.
    expect(drainEvents(cursorRef, queue, run)).toBe(3);
    spy.mockRestore();
    expect(ran).toEqual([1, 2, 3]);
    expect(reported).toHaveLength(1);
  });

  /** Fila com 3 envelopes ainda sem ack (início + 2 ações). */
  function unackedState(): GameState {
    let s = initGame({ type: 'start', sessionId: 'r', seed: 12, mode: 'numbers', levelId: 2 });
    s = gameReducer(s, { type: 'request-help' });
    s = gameReducer(s, { type: 'request-help' });
    expect(s.pendingEvents).toHaveLength(3);
    return s;
  }

  it('montagem em StrictMode com fila pendente (efeito roda 2x antes do ack): 1 execução por seq', () => {
    const seen: number[] = [];
    const initialState = unackedState();
    const { result } = renderHook(() => useGameController({ initialState, onEvent: (e: GameEventEnvelope) => void seen.push(e.seq) }), { wrapper: strict });
    expect(seen).toEqual([1, 2, 3]);
    expect(result.current.state?.pendingEvents).toEqual([]);
  });

  it('reexibir <Activity> em StrictMode (caminho real do runtime): 1 execução por seq', () => {
    const seen: string[] = [];
    let api: GameControllerHookApi | null = null;
    let setHidden: (h: boolean) => void = () => {};
    function Child() {
      api = useGameController({ createSession: () => ({ sessionId: 'act', seed: 3 }), onEvent: (e) => void seen.push(`${e.seq}:${e.event.type}`) });
      return null;
    }
    function Root() {
      const [hidden, set] = useState(false);
      setHidden = set;
      return (
        <Activity mode={hidden ? 'hidden' : 'visible'}>
          <Child />
        </Activity>
      );
    }
    render(
      <StrictMode>
        <Root />
      </StrictMode>,
    );
    act(() => api?.start('words', 1));
    expect(seen).toEqual(['1:question-started']);
    // Ação e ocultação no mesmo lote: o efeito não roda enquanto oculto.
    act(() => {
      api?.requestHelp();
      setHidden(true);
    });
    expect(seen).toHaveLength(1);
    expect(api!.state?.pendingEvents).toHaveLength(1);
    // Ao reexibir, o StrictMode roda efeito -> limpeza -> efeito sobre a mesma fila sem ack.
    act(() => setHidden(false));
    expect(seen).toEqual(['1:question-started', '2:help-shown']);
    expect(api!.state?.pendingEvents).toEqual([]);
  });
});
