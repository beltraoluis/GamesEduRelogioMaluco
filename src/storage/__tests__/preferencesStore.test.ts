// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PREFERENCES_STORAGE_KEY as KEY } from '../../contracts';
import { DEFAULT_PREFERENCES } from '../preferences';
import { createPreferencesStore, getPreferencesStore, preferencesStore } from '../preferencesStore';
import type { StorageLike } from '../preferencesStore';

/** `Storage` em memória compartilhável entre "abas". */
class MemoryStorage implements StorageLike {
  /** Passe o mesmo `Map` para simular abas com falhas independentes. */
  constructor(readonly data = new Map<string, string>()) {}
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
    // O armazenamento volta: a próxima operação grava também o nível pendente.
    storage.failWrites = false;
    store.setSound(false);
    expect(store.getSnapshot()).toEqual({ prefs: { ...DEFAULT_PREFERENCES, level: 3, sound: false }, persistent: true });
    expect(storage.json()).toEqual({ level: 3, sound: false, voice: true, stars: {} });
  });

  it('regressão: após setItem falhar, operações seguintes não descartam nível/estrelas locais', () => {
    const storage = new MemoryStorage();
    storage.data.set(KEY, '{"level":1,"sound":true,"voice":true,"stars":{"words-1":1}}');
    const store = tab(storage);
    storage.failWrites = true;
    store.setLevel(3);
    expect(store.recordStars('numbers-2', 3)).toBe(true);
    store.setVoice(false);
    expect(store.recordStars('words-1', 2)).toBe(true);
    // Recorde abaixo do que está só na memória não conta.
    expect(store.recordStars('numbers-2', 2)).toBe(false);
    const expected = { level: 3, sound: true, voice: false, stars: { 'words-1': 2, 'numbers-2': 3 } };
    expect(store.getSnapshot()).toEqual({ prefs: expected, persistent: false });
    // Storage continua obsoleto; refresh não perde nada.
    store.refresh();
    expect(store.getSnapshot()).toEqual({ prefs: expected, persistent: false });
    // Recuperação pelo refresh grava tudo de uma vez.
    storage.failWrites = false;
    store.refresh();
    expect(store.getSnapshot()).toEqual({ prefs: expected, persistent: true });
    expect(storage.json()).toEqual(expected);
    // Pendências não são regravadas depois.
    const writes = storage.writes;
    store.refresh();
    store.setVoice(false);
    expect(storage.writes).toBe(writes);
  });

  it('cota estoura no meio da sessão', () => {
    const storage = new MemoryStorage();
    const store = tab(storage);
    expect(store.getSnapshot().persistent).toBe(true);
    storage.failWrites = true;
    expect(store.recordStars('numbers-2', 3)).toBe(true);
    expect(store.getSnapshot()).toEqual({ prefs: { ...DEFAULT_PREFERENCES, stars: { 'numbers-2': 3 } }, persistent: false });
  });

  it('regressão: após getItem falhar, refresh e evento storage mantêm a memória', () => {
    const storage = new MemoryStorage();
    storage.data.set(KEY, '{"level":3,"sound":false,"voice":true,"stars":{"hands-1":2}}');
    const target = new EventTarget();
    const store = createPreferencesStore({ storage, eventTarget: target as unknown as Window });
    const known = store.getSnapshot().prefs;
    storage.failReads = true;
    store.refresh();
    expect(store.getSnapshot()).toEqual({ prefs: known, persistent: false });
    expect(store.getSnapshot().prefs).toBe(known);
    target.dispatchEvent(new StorageEvent('storage', { key: KEY }));
    target.dispatchEvent(new StorageEvent('storage', { key: null }));
    expect(store.getSnapshot()).toEqual({ prefs: known, persistent: false });
    // Operações sem releitura ficam pendentes (não grava às cegas).
    store.setLevel(4);
    expect(store.recordStars('hands-1', 3)).toBe(true);
    expect(storage.writes).toBe(0);
    expect(store.getSnapshot().prefs).toEqual({ level: 4, sound: false, voice: true, stars: { 'hands-1': 3 } });
    // Leitura volta: refresh reconcilia e grava.
    storage.failReads = false;
    store.refresh();
    expect(store.getSnapshot()).toEqual({ prefs: { level: 4, sound: false, voice: true, stars: { 'hands-1': 3 } }, persistent: true });
    expect(storage.json()).toEqual({ level: 4, sound: false, voice: true, stars: { 'hands-1': 3 } });
  });

  it('leitura bloqueada desde o início: base desconhecida, operações locais vencem na recuperação', () => {
    const storage = new MemoryStorage();
    storage.data.set(KEY, '{"theme":"dark","level":2,"sound":true,"voice":true,"stars":{"numbers-1":3,"explore-1":1}}');
    storage.failReads = true;
    const store = tab(storage);
    expect(store.getSnapshot()).toEqual({ prefs: DEFAULT_PREFERENCES, persistent: false });
    store.setVoice(false);
    store.resetStars();
    expect(store.recordStars('words-2', 1)).toBe(true);
    expect(storage.writes).toBe(0);
    storage.failReads = false;
    store.refresh();
    // O reset feito sem ver o storage apaga as estrelas que existiam; o recorde posterior fica.
    expect(storage.json()).toEqual({ theme: 'dark', level: 2, sound: true, voice: false, stars: { 'words-2': 1 } });
    expect(store.getSnapshot()).toEqual({ prefs: { level: 2, sound: true, voice: false, stars: { 'words-2': 1 } }, persistent: true });
  });

  it('reset às cegas resolvido por evento storage não apaga recorde gravado depois', () => {
    const data = new Map<string, string>();
    data.set(KEY, '{"level":1,"sound":true,"voice":true,"stars":{"numbers-1":3}}');
    const storageA = new MemoryStorage(data);
    const storageB = new MemoryStorage(data);
    storageA.failReads = true;
    const target = new EventTarget();
    const a = createPreferencesStore({ storage: storageA, eventTarget: target as unknown as Window });
    a.resetStars();
    storageA.failReads = false;
    storageA.failWrites = true;
    target.dispatchEvent(new StorageEvent('storage', { key: KEY }));
    expect(a.getSnapshot().prefs.stars).toEqual({});
    // Outra aba grava um recorde novo depois: o reset pendente não o apaga.
    tab(storageB).recordStars('hands-2', 2);
    target.dispatchEvent(new StorageEvent('storage', { key: KEY }));
    expect(a.getSnapshot().prefs.stars).toEqual({ 'hands-2': 2 });
    storageA.failWrites = false;
    a.refresh();
    expect(storageA.json()).toEqual({ level: 1, sound: true, voice: true, stars: { 'hands-2': 2 } });
  });

  it('sem storage (null)', () => {
    const store = tab(null);
    expect(store.getSnapshot().persistent).toBe(false);
    store.resetStars();
    store.setVoice(false);
    store.refresh();
    expect(store.getSnapshot()).toEqual({ prefs: { ...DEFAULT_PREFERENCES, voice: false }, persistent: false });
  });

  it('refresh testa de novo a gravação quando não há pendências', () => {
    const storage = new MemoryStorage();
    storage.failWrites = true;
    const store = tab(storage);
    expect(store.getSnapshot().persistent).toBe(false);
    store.refresh();
    expect(store.getSnapshot().persistent).toBe(false);
    storage.failWrites = false;
    store.refresh();
    expect(store.getSnapshot().persistent).toBe(true);
  });

  it('window.localStorage inacessível', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('bloqueado', 'SecurityError');
    });
    const store = createPreferencesStore({ eventTarget: null });
    expect(store.getSnapshot()).toEqual({ prefs: DEFAULT_PREFERENCES, persistent: false });
  });
});

describe('reconciliação na recuperação (abas com falhas independentes)', () => {
  function setup(initial = '{"level":1,"sound":true,"voice":true,"stars":{}}') {
    const data = new Map<string, string>([[KEY, initial]]);
    const target = new EventTarget();
    const storageA = new MemoryStorage(data);
    const a = createPreferencesStore({ storage: storageA, eventTarget: target as unknown as Window });
    const storageB = new MemoryStorage(data);
    const b = tab(storageB);
    const notifyA = () => target.dispatchEvent(new StorageEvent('storage', { key: KEY }));
    return { a, b, storageA, storageB, notifyA };
  }

  it('mudanças externas e pendentes locais se somam; evento storage nunca grava', () => {
    const { a, b, storageA, notifyA } = setup();
    storageA.failWrites = true;
    a.setLevel(3);
    a.recordStars('numbers-1', 2);
    b.recordStars('words-1', 3);
    b.setSound(false);
    const writesA = storageA.writes;
    notifyA();
    expect(storageA.writes).toBe(writesA);
    expect(a.getSnapshot()).toEqual({
      prefs: { level: 3, sound: false, voice: true, stars: { 'numbers-1': 2, 'words-1': 3 } },
      persistent: false,
    });
    storageA.failWrites = false;
    a.refresh();
    expect(storageA.json()).toEqual({ level: 3, sound: false, voice: true, stars: { 'numbers-1': 2, 'words-1': 3 } });
    expect(a.getSnapshot().persistent).toBe(true);
  });

  it('campo alterado por outra aba depois vence o set pendente', () => {
    const { a, b, storageA, notifyA } = setup();
    storageA.failWrites = true;
    a.setLevel(3);
    a.setVoice(false);
    a.setSound(false);
    b.setLevel(2);
    b.setSound(false);
    notifyA();
    // level e sound mudaram fora (o externo vence); voice não, e o pendente de A fica.
    expect(a.getSnapshot().prefs).toMatchObject({ level: 2, voice: false, sound: false });
    storageA.failWrites = false;
    a.refresh();
    expect(storageA.json()).toMatchObject({ level: 2, voice: false, sound: false });
  });

  it('recorde pendente: máximo com o externo, sem reaplicar nem reduzir', () => {
    const { a, b, storageA, notifyA } = setup('{"level":1,"sound":true,"voice":true,"stars":{"hands-1":1}}');
    storageA.failWrites = true;
    expect(a.recordStars('hands-1', 2)).toBe(true);
    b.recordStars('hands-1', 3);
    notifyA();
    expect(a.getSnapshot().prefs.stars).toEqual({ 'hands-1': 3 });
    storageA.failWrites = false;
    a.refresh();
    expect(storageA.json()).toMatchObject({ stars: { 'hands-1': 3 } });
  });

  it('reset pendente não apaga recorde gravado depois por outra aba nem é reaplicado', () => {
    const { a, b, storageA, notifyA } = setup('{"level":1,"sound":true,"voice":true,"stars":{"numbers-1":3,"words-2":1,"explore-1":2}}');
    storageA.failWrites = true;
    a.resetStars();
    expect(a.getSnapshot().prefs.stars).toEqual({});
    // Outra aba (com o storage obsoleto) termina rodadas: uma melhora words-2, outra é nova.
    b.recordStars('words-2', 2);
    b.recordStars('hands-4', 1);
    notifyA();
    expect(a.getSnapshot().prefs.stars).toEqual({ 'words-2': 2, 'hands-4': 1 });
    storageA.failWrites = false;
    a.refresh();
    expect(storageA.json()).toEqual({ level: 1, sound: true, voice: true, stars: { 'words-2': 2, 'hands-4': 1 } });
    // Depois de gravado, o reset não volta: uma nova rodada de numbers-1 fica.
    b.recordStars('numbers-1', 3);
    notifyA();
    expect(a.getSnapshot().prefs.stars).toEqual({ 'words-2': 2, 'hands-4': 1, 'numbers-1': 3 });
    a.setSound(false);
    expect(storageA.json()).toMatchObject({ stars: { 'words-2': 2, 'hands-4': 1, 'numbers-1': 3 } });
  });

  it('reset externo observado depois descarta recordes pendentes', () => {
    const { a, b, storageA, notifyA } = setup('{"level":1,"sound":true,"voice":true,"stars":{"numbers-1":2}}');
    storageA.failWrites = true;
    a.recordStars('numbers-1', 3);
    a.recordStars('words-1', 1);
    a.setLevel(4);
    b.resetStars();
    notifyA();
    expect(a.getSnapshot().prefs).toEqual({ level: 4, sound: true, voice: true, stars: {} });
    storageA.failWrites = false;
    a.refresh();
    expect(storageA.json()).toEqual({ level: 4, sound: true, voice: true, stars: {} });
  });

  it('localStorage.clear() em outra aba (key === null) com pendências', () => {
    const { a, storageA } = setup('{"level":2,"sound":true,"voice":true,"stars":{"numbers-1":2}}');
    const target = new EventTarget();
    const a2 = createPreferencesStore({ storage: storageA, eventTarget: target as unknown as Window });
    storageA.failWrites = true;
    a2.setVoice(false);
    storageA.data.clear();
    target.dispatchEvent(new StorageEvent('storage', { key: null }));
    // Nível e estrelas voltam ao padrão (externo é mais novo); a voz pendente fica.
    expect(a2.getSnapshot()).toEqual({ prefs: { ...DEFAULT_PREFERENCES, voice: false }, persistent: false });
    expect(a.getSnapshot().prefs.level).toBe(2);
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
