// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { act, renderHook } from '@testing-library/react';
import { StrictMode } from 'react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HISTORY_STATE_KEY, useBackToHome } from '../useBackToHome';

const strict = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>;

/** Pilha de histórico falsa (o jsdom não navega de verdade). */
function fakeHistory() {
  const entries: unknown[] = [null];
  let index = 0;
  const pushState = vi.spyOn(window.history, 'pushState').mockImplementation((state: unknown) => {
    entries.splice(index + 1);
    entries.push(state);
    index += 1;
  });
  const replaceState = vi.spyOn(window.history, 'replaceState').mockImplementation((state: unknown) => {
    entries[index] = state;
  });
  const back = vi.spyOn(window.history, 'back').mockImplementation(() => {
    if (index === 0) return;
    index -= 1;
    window.dispatchEvent(new PopStateEvent('popstate', { state: entries[index] }));
  });
  vi.spyOn(window.history, 'state', 'get').mockImplementation(() => entries[index]);
  return {
    entries,
    get index() {
      return index;
    },
    pushState,
    replaceState,
    back,
    forward() {
      index += 1;
      window.dispatchEvent(new PopStateEvent('popstate', { state: entries[index] }));
    },
  };
}

let history: ReturnType<typeof fakeHistory>;
beforeEach(() => {
  history = fakeHistory();
});
afterEach(() => vi.restoreAllMocks());

function setup(initialAway = false) {
  const onHome = vi.fn();
  const hook = renderHook(({ away }) => useBackToHome(away, onHome), { initialProps: { away: initialAway }, wrapper: strict });
  return { onHome, ...hook };
}

describe('useBackToHome', () => {
  it('empilha uma única entrada ao sair do início (mesmo com StrictMode e telas internas)', () => {
    const { rerender } = setup();
    expect(history.pushState).not.toHaveBeenCalled();
    rerender({ away: true });
    rerender({ away: true });
    expect(history.pushState).toHaveBeenCalledTimes(1);
    expect(history.entries[1]).toEqual({ [HISTORY_STATE_KEY]: 'away' });
  });

  it('voltar do sistema fora do início -> onHome', () => {
    const { rerender, onHome } = setup();
    rerender({ away: true });
    act(() => history.back());
    expect(onHome).toHaveBeenCalledTimes(1);
    rerender({ away: false });
    expect(history.index).toBe(0);
  });

  it('voltar do sistema já no início não chama onHome', () => {
    const { onHome } = setup();
    act(() => window.dispatchEvent(new PopStateEvent('popstate', { state: null })));
    expect(onHome).not.toHaveBeenCalled();
  });

  it('goHome volta na hora e consome a entrada sem chamar onHome duas vezes', () => {
    const { rerender, onHome, result } = setup();
    rerender({ away: true });
    act(() => result.current.goHome());
    expect(onHome).toHaveBeenCalledTimes(1);
    expect(history.back).toHaveBeenCalledTimes(1);
    expect(history.index).toBe(0);
    rerender({ away: false });
    // Nova saída do início empilha de novo.
    rerender({ away: true });
    expect(history.pushState).toHaveBeenCalledTimes(2);
  });

  it('avançar para uma entrada marcada com o app no início a desmarca', () => {
    const { rerender, result, onHome } = setup();
    rerender({ away: true });
    act(() => history.back());
    rerender({ away: false });
    act(() => history.forward());
    expect(onHome).toHaveBeenCalledTimes(1);
    expect(history.replaceState).toHaveBeenCalled();
    expect(history.entries[history.index]).toBeNull();
    // goHome sem entrada própria não chama back().
    act(() => result.current.goHome());
    expect(history.back).toHaveBeenCalledTimes(1);
  });

  it('recarga numa entrada marcada: início desmarca e preserva outros campos', () => {
    history.entries[0] = { [HISTORY_STATE_KEY]: 'away', outro: 1 };
    setup();
    expect(history.entries[0]).toEqual({ outro: 1 });
  });

  it('remove o listener ao desmontar', () => {
    const { rerender, unmount, onHome } = setup();
    rerender({ away: true });
    unmount();
    window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
    expect(onHome).not.toHaveBeenCalled();
  });
});
