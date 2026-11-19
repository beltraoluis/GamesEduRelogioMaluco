// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { act, renderHook } from '@testing-library/react';
import { StrictMode } from 'react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { PREFERENCES_STORAGE_KEY } from '../../contracts';
import { createPreferencesStore } from '../../storage/preferencesStore';
import type { StorageLike } from '../../storage/preferencesStore';
import { usePreferences } from '../usePreferences';

const strict = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>;

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

/** Sem listener de `storage`: simula evento perdido (aba congelada/bfcache). */
function setup(initial?: Record<string, string>) {
  const storage = memoryStorage(initial);
  const store = createPreferencesStore({ storage, eventTarget: null });
  const hook = renderHook(() => usePreferences(store), { wrapper: strict });
  return { storage, store, ...hook };
}

const saved = (storage: { data: Map<string, string> }): unknown => JSON.parse(storage.data.get(PREFERENCES_STORAGE_KEY) ?? 'null');

describe('usePreferences', () => {
  it('lê o formato do legado e grava por operação', () => {
    const { result, storage } = setup({
      [PREFERENCES_STORAGE_KEY]: JSON.stringify({ level: 3, sound: false, voice: true, stars: { 'numbers-1': 2 }, futuro: 1 }),
    });
    expect(result.current.prefs).toEqual({ level: 3, sound: false, voice: true, stars: { 'numbers-1': 2 } });
    expect(result.current.persistent).toBe(true);

    act(() => result.current.setLevel(4));
    act(() => result.current.setSound(true));
    act(() => result.current.setVoice(false));
    let record = false;
    act(() => {
      record = result.current.recordStars('numbers-1', 3);
    });
    expect(record).toBe(true);
    act(() => {
      record = result.current.recordStars('numbers-1', 1);
    });
    expect(record).toBe(false);
    expect(saved(storage)).toEqual({ futuro: 1, level: 4, sound: true, voice: false, stars: { 'numbers-1': 3 } });

    act(() => result.current.resetStars());
    expect(result.current.prefs.stars).toEqual({});
    expect(saved(storage)).toMatchObject({ level: 4, stars: {} });
  });

  it('referência estável sem mudança; setter sem efeito não re-renderiza', () => {
    let renders = 0;
    const storage = memoryStorage();
    const store = createPreferencesStore({ storage, eventTarget: null });
    const { result } = renderHook(() => {
      renders += 1;
      return usePreferences(store);
    });
    const first = result.current;
    const before = renders;
    act(() => result.current.setLevel(1));
    expect(renders).toBe(before);
    expect(result.current).toBe(first);
  });

  it.each([
    ['visibilitychange', () => document.dispatchEvent(new Event('visibilitychange'))],
    ['focus', () => window.dispatchEvent(new Event('focus'))],
    ['pageshow', () => window.dispatchEvent(new Event('pageshow'))],
  ] as const)('relê o storage ao voltar para a aba (%s)', (_name, fire) => {
    const { result, storage } = setup();
    expect(result.current.prefs.stars).toEqual({});
    // Outra aba gravou, mas o evento `storage` não chegou.
    storage.data.set(PREFERENCES_STORAGE_KEY, JSON.stringify({ level: 2, sound: true, voice: true, stars: { 'hands-2': 3 } }));
    expect(result.current.prefs.level).toBe(1);
    act(() => fire());
    expect(result.current.prefs).toEqual({ level: 2, sound: true, voice: true, stars: { 'hands-2': 3 } });
  });

  it('não relê enquanto a aba está oculta', () => {
    const { store } = setup();
    const refresh = vi.spyOn(store, 'refresh');
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    act(() => void document.dispatchEvent(new Event('visibilitychange')));
    expect(refresh).not.toHaveBeenCalled();
    visibility.mockReturnValue('visible');
    act(() => void document.dispatchEvent(new Event('visibilitychange')));
    expect(refresh).toHaveBeenCalledTimes(1);
    visibility.mockRestore();
  });

  it('remove os listeners ao desmontar', () => {
    const { store, unmount } = setup();
    const refresh = vi.spyOn(store, 'refresh');
    unmount();
    window.dispatchEvent(new Event('focus'));
    window.dispatchEvent(new Event('pageshow'));
    document.dispatchEvent(new Event('visibilitychange'));
    expect(refresh).not.toHaveBeenCalled();
  });

  it('sem armazenamento: persistent false e jogo em memória', () => {
    const store = createPreferencesStore({ storage: null, eventTarget: null });
    const { result } = renderHook(() => usePreferences(store));
    expect(result.current.persistent).toBe(false);
    act(() => result.current.setLevel(3));
    expect(result.current.prefs.level).toBe(3);
  });

  it('grava operações pendentes quando o storage volta (refresh por foco)', () => {
    const storage = memoryStorage();
    let broken = true;
    const flaky: StorageLike = {
      getItem: (k) => storage.getItem(k),
      setItem: (k, v) => {
        if (broken) throw new DOMException('cheio', 'QuotaExceededError');
        storage.setItem(k, v);
      },
      removeItem: (k) => storage.removeItem(k),
    };
    const store = createPreferencesStore({ storage: flaky, eventTarget: null });
    const { result } = renderHook(() => usePreferences(store));
    act(() => void result.current.recordStars('words-1', 2));
    expect(result.current.persistent).toBe(false);
    expect(result.current.prefs.stars).toEqual({ 'words-1': 2 });
    broken = false;
    act(() => void window.dispatchEvent(new Event('focus')));
    expect(result.current.persistent).toBe(true);
    expect(saved(storage)).toMatchObject({ stars: { 'words-1': 2 } });
  });
});
