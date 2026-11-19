// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PREFERENCES_STORAGE_KEY as KEY } from '../../contracts';
import { DEFAULT_PREFERENCES } from '../preferences';
import { createPreferencesStore, getPreferencesStore, preferencesStore } from '../preferencesStore';
import type { StorageLike } from '../preferencesStore';

/** `Storage` em memória compartilhável entre "abas". */
class MemoryStorage implements StorageLike {
  readonly data = new Map<string, string>();
  failWrites = false;
  failReads = false;
  writes = 0;
  getItem(key: string): string | null {
    if (this.failReads) throw new DOMException('bloqueado', 'SecurityError');
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    if (this.failWrites) throw new DOMException('cota', 'QuotaExceededError');
    if (!key.endsWith(':probe')) this.writes++;
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
  json(): unknown {
    const raw = this.data.get(KEY);
    return raw === undefined ? undefined : JSON.parse(raw);
  }
}

function tab(storage: StorageLike | null) {
  return createPreferencesStore({ storage, eventTarget: null });
}

function fireStorage(key: string | null): void {
  window.dispatchEvent(new StorageEvent('storage', { key }));
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  preferencesStore.dispose();
  vi.restoreAllMocks();
});

describe('snapshot', () => {
  it('lê o legado e mantém referência estável', () => {
    const storage = new MemoryStorage();
    storage.data.set(KEY, '{"level":3,"sound":false,"voice":true,"stars":{"numbers-1":3}}');
    const store = tab(storage);
    const a = store.getSnapshot();
    expect(a).toEqual({ prefs: { level: 3, sound: false, voice: true, stars: { 'numbers-1': 3 } }, persistent: true });
    expect(store.getSnapshot()).toBe(a);
    store.setLevel(3);
    store.refresh();
    expect(store.getSnapshot()).toBe(a);
    store.setLevel(2);
    const b = store.getSnapshot();
    expect(b).not.toBe(a);
    expect(b.prefs.level).toBe(2);
    expect(store.getSnapshot()).toBe(b);
  });

  it('notifica assinantes só quando muda; unsubscribe funciona', () => {
    const store = tab(new MemoryStorage());
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.setSound(true);
    expect(listener).not.toHaveBeenCalled();
    store.setSound(false);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.setVoice(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('sem nada salvo: padrões', () => {
    expect(tab(new MemoryStorage()).getSnapshot()).toEqual({ prefs: DEFAULT_PREFERENCES, persistent: true });
  });
});

describe('escrita por operação', () => {
  it('cada setter relê o storage e grava só a sua mutação', () => {
    const storage = new MemoryStorage();
    const store = tab(storage);
    store.setLevel(4);
    store.setSound(false);
    store.setVoice(false);
    expect(storage.json()).toEqual({ level: 4, sound: false, voice: false, stars: {} });
  });

  it('operações concorrentes de duas abas não se sobrescrevem', () => {
    const storage = new MemoryStorage();
    const a = tab(storage);
    const b = tab(storage);
    expect(a.recordStars('numbers-1', 2)).toBe(true);
    // B ainda não viu a gravação de A (estado obsoleto em memória).
    expect(b.getSnapshot().prefs.stars).toEqual({});
    expect(b.recordStars('words-2', 3)).toBe(true);
    b.setLevel(3);
    expect(storage.json()).toEqual({ level: 3, sound: true, voice: true, stars: { 'numbers-1': 2, 'words-2': 3 } });
    // A também não apaga o que B gravou.
    a.setVoice(false);
    expect(storage.json()).toEqual({ level: 3, sound: true, voice: false, stars: { 'numbers-1': 2, 'words-2': 3 } });
    expect(a.getSnapshot().prefs).toEqual({ level: 3, sound: true, voice: false, stars: { 'numbers-1': 2, 'words-2': 3 } });
  });

  it('recordStars faz máximo só na chave, sobre a releitura', () => {
    const storage = new MemoryStorage();
    const a = tab(storage);
    const b = tab(storage);
    b.recordStars('hands-1', 3);
    const writes = storage.writes;
    // A não sabe do 3 e tenta gravar 2: não reduz nem grava.
    expect(a.recordStars('hands-1', 2)).toBe(false);
    expect(storage.writes).toBe(writes);
    expect(storage.json()).toEqual({ level: 1, sound: true, voice: true, stars: { 'hands-1': 3 } });
    // Mas a memória de A é sincronizada com a releitura.
    expect(a.getSnapshot().prefs.stars).toEqual({ 'hands-1': 3 });
  });

  it('resetStars grava stars: {} sem ressurreição por outra aba', () => {
    const storage = new MemoryStorage();
    storage.data.set(KEY, '{"theme":"dark","level":2,"sound":false,"voice":true,"stars":{"numbers-1":3,"explore-1":2}}');
    const a = tab(storage);
    const b = tab(storage);
    expect(b.getSnapshot().prefs.stars).toEqual({ 'numbers-1': 3 });
    a.resetStars();
    expect(storage.json()).toEqual({ theme: 'dark', level: 2, sound: false, voice: true, stars: {} });
    // B (obsoleta, ainda com estrelas na memória) muda outra coisa: nada volta.
    b.setSound(true);
    expect(storage.json()).toEqual({ theme: 'dark', level: 2, sound: true, voice: true, stars: {} });
    expect(b.getSnapshot().prefs.stars).toEqual({});
    // Uma rodada terminada depois volta a gravar só a sua chave.
    b.recordStars('words-1', 1);
    expect(storage.json()).toEqual({ theme: 'dark', level: 2, sound: true, voice: true, stars: { 'words-1': 1 } });
  });

  it('resetStars apaga chaves desconhecidas de stars mesmo sem estrelas válidas', () => {
    const storage = new MemoryStorage();
    storage.data.set(KEY, '{"level":1,"sound":true,"voice":true,"stars":{"explore-1":2}}');
    const store = tab(storage);
    store.resetStars();
    expect(storage.json()).toEqual({ level: 1, sound: true, voice: true, stars: {} });
    const writes = storage.writes;
    store.resetStars();
    expect(storage.writes).toBe(writes);
  });

  it('preserva chaves desconhecidas e repara JSON corrompido ao gravar', () => {
    const storage = new MemoryStorage();
    storage.data.set(KEY, '{"level":2,"future":1,"stars":{"numbers-9":1}}');
    tab(storage).setVoice(false);
    expect(storage.json()).toEqual({ future: 1, level: 2, sound: true, voice: false, stars: { 'numbers-9': 1 } });
    storage.data.set(KEY, '{oops');
    tab(storage).setLevel(3);
    expect(storage.json()).toEqual({ level: 3, sound: true, voice: true, stars: {} });
  });
});

describe('armazenamento indisponível (best-effort)', () => {
  it('Safari privado / QuotaExceededError: persistent false, memória funciona', () => {
    const storage = new MemoryStorage();
    storage.failWrites = true;
    const store = tab(storage);
    expect(store.getSnapshot().persistent).toBe(false);
    expect(() => store.setLevel(3)).not.toThrow();
    expect(store.getSnapshot()).toEqual({ prefs: { ...DEFAULT_PREFERENCES, level: 3 }, persistent: false });
    // Sem gravação, persistent não sobe.
    store.setLevel(3);
    expect(store.getSnapshot().persistent).toBe(false);
    // O armazenamento volta: a próxima gravação recupera persistent.
    storage.failWrites = false;
    store.setSound(false);
    expect(store.getSnapshot()).toEqual({ prefs: { ...DEFAULT_PREFERENCES, sound: false }, persistent: true });
  });

  it('cota estoura no meio da sessão', () => {
    const storage = new MemoryStorage();
    const store = tab(storage);
    expect(store.getSnapshot().persistent).toBe(true);
    storage.failWrites = true;
    expect(store.recordStars('numbers-2', 3)).toBe(true);
    expect(store.getSnapshot()).toEqual({ prefs: { ...DEFAULT_PREFERENCES, stars: { 'numbers-2': 3 } }, persistent: false });
  });

  it('leitura bloqueada (SecurityError): base é a memória', () => {
    const storage = new MemoryStorage();
    storage.failReads = true;
    const store = tab(storage);
    expect(store.getSnapshot()).toEqual({ prefs: DEFAULT_PREFERENCES, persistent: false });
    store.setLevel(2);
    expect(store.recordStars('words-3', 2)).toBe(true);
    expect(store.getSnapshot().prefs).toEqual({ ...DEFAULT_PREFERENCES, level: 2, stars: { 'words-3': 2 } });
    expect(storage.writes).toBe(0);
    store.refresh();
    expect(store.getSnapshot().prefs).toEqual(DEFAULT_PREFERENCES);
  });

  it('sem storage (null)', () => {
    const store = tab(null);
    expect(store.getSnapshot().persistent).toBe(false);
    store.resetStars();
    store.setVoice(false);
    expect(store.getSnapshot().prefs.voice).toBe(false);
  });

  it('window.localStorage inacessível', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('bloqueado', 'SecurityError');
    });
    const store = createPreferencesStore({ eventTarget: null });
    expect(store.getSnapshot()).toEqual({ prefs: DEFAULT_PREFERENCES, persistent: false });
  });
});

describe('evento storage (outra aba)', () => {
  it('atualiza a memória sem regravar; trata key === null (clear)', () => {
    localStorage.setItem(KEY, '{"level":2,"sound":true,"voice":true,"stars":{"numbers-1":3}}');
    const store = createPreferencesStore();
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const listener = vi.fn();
    store.subscribe(listener);

    localStorage.setItem(KEY, '{"level":4,"sound":true,"voice":true,"stars":{"numbers-1":3}}');
    setItem.mockClear();
    fireStorage(KEY);
    expect(store.getSnapshot().prefs.level).toBe(4);
    expect(listener).toHaveBeenCalledTimes(1);

    fireStorage('outra-chave');
    expect(listener).toHaveBeenCalledTimes(1);

    localStorage.clear();
    fireStorage(null);
    expect(store.getSnapshot()).toEqual({ prefs: DEFAULT_PREFERENCES, persistent: true });
    expect(listener).toHaveBeenCalledTimes(2);
    expect(setItem).not.toHaveBeenCalled();

    store.dispose();
    localStorage.setItem(KEY, '{"level":3}');
    fireStorage(KEY);
    expect(store.getSnapshot().prefs.level).toBe(1);
  });

  it('evento storage com leitura bloqueada derruba persistent', () => {
    const storage = new MemoryStorage();
    const target = new EventTarget();
    const store = createPreferencesStore({ storage, eventTarget: target as unknown as Window });
    storage.failReads = true;
    target.dispatchEvent(new StorageEvent('storage', { key: KEY }));
    expect(store.getSnapshot()).toEqual({ prefs: DEFAULT_PREFERENCES, persistent: false });
  });
});

describe('store único', () => {
  it('fachada preguiçosa sobre window.localStorage', () => {
    expect(getPreferencesStore()).toBe(getPreferencesStore());
    const listener = vi.fn();
    const unsubscribe = preferencesStore.subscribe(listener);
    preferencesStore.setLevel(2);
    preferencesStore.setSound(false);
    preferencesStore.setVoice(false);
    expect(preferencesStore.recordStars('hands-2', 2)).toBe(true);
    expect(JSON.parse(localStorage.getItem(KEY) ?? 'null')).toEqual({
      level: 2,
      sound: false,
      voice: false,
      stars: { 'hands-2': 2 },
    });
    preferencesStore.resetStars();
    preferencesStore.refresh();
    expect(preferencesStore.getSnapshot()).toEqual({
      prefs: { level: 2, sound: false, voice: false, stars: {} },
      persistent: true,
    });
    expect(listener).toHaveBeenCalledTimes(5);
    unsubscribe();
    const first = getPreferencesStore();
    preferencesStore.dispose();
    expect(getPreferencesStore()).not.toBe(first);
  });
});
