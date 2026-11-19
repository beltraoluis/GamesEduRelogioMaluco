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
  /** Simula o navegador: gravações desta "aba" disparam `storage` nas outras. */
  emitTo: EventTarget | null = null;
  /** Evento perdido (ex.: aba congelada): grava sem avisar. */
  muted = false;
  /** Captura os eventos em vez de entregar (fila controlável). */
  capture = false;
  readonly queued: StorageEvent[] = [];
  /** Entrega os eventos capturados (opcionalmente em ordem inversa). */
  deliver(reverse = false): void {
    const events = this.queued.splice(0);
    if (reverse) events.reverse();
    for (const e of events) this.emitTo?.dispatchEvent(e);
  }
  getItem(key: string): string | null {
    if (this.failReads) throw new DOMException('bloqueado', 'SecurityError');
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    if (this.failWrites) throw new DOMException('cota', 'QuotaExceededError');
    if (!key.endsWith(':probe')) this.writes++;
    const oldValue = this.data.get(key) ?? null;
    this.data.set(key, value);
    this.emit(key, oldValue, value);
  }
  removeItem(key: string): void {
    const oldValue = this.data.get(key) ?? null;
    this.data.delete(key);
    this.emit(key, oldValue, null);
  }
  private emit(key: string, oldValue: string | null, newValue: string | null): void {
    if (this.emitTo === null || this.muted || key.endsWith(':probe') || oldValue === newValue) return;
    const event = new StorageEvent('storage', { key, oldValue, newValue });
    if (this.capture) this.queued.push(event);
    else this.emitTo.dispatchEvent(event);
  }
  json(): unknown {
    const raw = this.data.get(KEY);
    return raw === undefined ? undefined : JSON.parse(raw);
  }
}

function tab(storage: StorageLike | null) {
  return createPreferencesStore({ storage, eventTarget: null });
}

function fireStorage(key: string | null, oldValue: string | null = null, newValue: string | null = null): void {
  window.dispatchEvent(new StorageEvent('storage', { key, oldValue, newValue }));
}

const asTarget = (t: EventTarget) => t as unknown as Window;

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
    const raw = '{"level":3,"sound":false,"voice":true,"stars":{"hands-1":2}}';
    const storage = new MemoryStorage();
    storage.data.set(KEY, raw);
    const target = new EventTarget();
    const store = createPreferencesStore({ storage, eventTarget: asTarget(target) });
    const known = store.getSnapshot().prefs;
    storage.failReads = true;
    store.refresh();
    expect(store.getSnapshot()).toEqual({ prefs: known, persistent: false });
    expect(store.getSnapshot().prefs).toBe(known);
    // Evento sem mudança real (outra aba regravou o mesmo JSON): memória intacta.
    target.dispatchEvent(new StorageEvent('storage', { key: KEY, oldValue: raw, newValue: raw }));
    expect(store.getSnapshot().prefs).toBe(known);
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

  it('leitura bloqueada desde o início: reset às cegas só apaga o que foi visto (não destrutivo)', () => {
    const storage = new MemoryStorage();
    storage.data.set(KEY, '{"theme":"dark","level":2,"sound":true,"voice":true,"stars":{"numbers-1":3,"explore-1":1}}');
    storage.failReads = true;
    const store = tab(storage);
    expect(store.getSnapshot()).toEqual({ prefs: DEFAULT_PREFERENCES, persistent: false });
    store.setVoice(false);
    expect(store.recordStars('hands-1', 2)).toBe(true);
    store.resetStars();
    expect(store.recordStars('words-2', 1)).toBe(true);
    expect(store.getSnapshot().prefs.stars).toEqual({ 'words-2': 1 });
    expect(storage.writes).toBe(0);
    storage.failReads = false;
    store.refresh();
    // Ordem indistinguível entre o storage nunca visto e as operações às
    // cegas: o set local vence e nenhuma estrela nunca vista é apagada.
    expect(storage.json()).toEqual({
      theme: 'dark',
      level: 2,
      sound: true,
      voice: false,
      stars: { 'numbers-1': 3, 'explore-1': 1, 'words-2': 1 },
    });
    expect(store.getSnapshot().persistent).toBe(true);
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
  /** A: aba sob teste (com falhas). B: outra aba, cujas gravações disparam `storage` em A. */
  function setup(initial = '{"level":1,"sound":true,"voice":true,"stars":{}}') {
    const data = new Map<string, string>([[KEY, initial]]);
    const target = new EventTarget();
    const storageA = new MemoryStorage(data);
    const a = createPreferencesStore({ storage: storageA, eventTarget: asTarget(target) });
    const storageB = new MemoryStorage(data);
    storageB.emitTo = target;
    const b = tab(storageB);
    return { a, b, storageA, storageB, target };
  }

  it('mudanças externas e pendentes locais se somam; evento storage nunca grava', () => {
    const { a, b, storageA } = setup();
    storageA.failWrites = true;
    a.setLevel(3);
    a.recordStars('numbers-1', 2);
    const writesA = storageA.writes;
    b.recordStars('words-1', 3);
    b.setSound(false);
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
    const { a, b, storageA } = setup();
    storageA.failWrites = true;
    a.setLevel(3);
    a.setVoice(false);
    a.setSound(false);
    b.setLevel(2);
    b.setSound(false);
    // level e sound mudaram fora depois (o externo vence); voice não, e o pendente de A fica.
    expect(a.getSnapshot().prefs).toMatchObject({ level: 2, voice: false, sound: false });
    storageA.failWrites = false;
    a.refresh();
    expect(storageA.json()).toMatchObject({ level: 2, voice: false, sound: false });
  });

  it('recorde pendente: máximo com o externo, sem reaplicar nem reduzir', () => {
    const { a, b, storageA } = setup('{"level":1,"sound":true,"voice":true,"stars":{"hands-1":1}}');
    storageA.failWrites = true;
    expect(a.recordStars('hands-1', 2)).toBe(true);
    b.recordStars('hands-1', 3);
    expect(a.getSnapshot().prefs.stars).toEqual({ 'hands-1': 3 });
    storageA.failWrites = false;
    a.refresh();
    expect(storageA.json()).toMatchObject({ stars: { 'hands-1': 3 } });
  });

  it('reset pendente não apaga recorde gravado depois por outra aba nem é reaplicado', () => {
    const { a, b, storageA } = setup('{"level":1,"sound":true,"voice":true,"stars":{"numbers-1":3,"words-2":1,"explore-1":2}}');
    storageA.failWrites = true;
    a.resetStars();
    expect(a.getSnapshot().prefs.stars).toEqual({});
    // Outra aba (com o storage obsoleto) termina rodadas: uma melhora words-2, outra é nova.
    b.recordStars('words-2', 2);
    b.recordStars('hands-4', 1);
    expect(a.getSnapshot().prefs.stars).toEqual({ 'words-2': 2, 'hands-4': 1 });
    storageA.failWrites = false;
    a.refresh();
    expect(storageA.json()).toEqual({ level: 1, sound: true, voice: true, stars: { 'words-2': 2, 'hands-4': 1 } });
    // Depois de gravado, o reset não volta: uma nova rodada de numbers-1 fica.
    b.recordStars('numbers-1', 3);
    expect(a.getSnapshot().prefs.stars).toEqual({ 'words-2': 2, 'hands-4': 1, 'numbers-1': 3 });
    a.setSound(false);
    expect(storageA.json()).toMatchObject({ stars: { 'words-2': 2, 'hands-4': 1, 'numbers-1': 3 } });
  });

  it('reset externo depois de recordes pendentes os descarta (ordem visível pelo evento)', () => {
    const { a, b, storageA } = setup('{"level":1,"sound":true,"voice":true,"stars":{"numbers-1":2}}');
    storageA.failWrites = true;
    a.recordStars('numbers-1', 3);
    a.recordStars('words-1', 1);
    a.setLevel(4);
    b.resetStars();
    expect(a.getSnapshot().prefs).toEqual({ level: 4, sound: true, voice: true, stars: {} });
    storageA.failWrites = false;
    a.refresh();
    expect(storageA.json()).toEqual({ level: 4, sound: true, voice: true, stars: {} });
  });

  it('evento perdido: a releitura da próxima operação ordena e o reset externo vence', () => {
    const { a, b, storageA, storageB } = setup('{"level":1,"sound":true,"voice":true,"stars":{"numbers-1":2}}');
    storageA.failWrites = true;
    storageB.muted = true;
    a.recordStars('words-1', 1);
    b.resetStars();
    a.setVoice(false); // releitura antes desta operação descobre o reset
    expect(a.getSnapshot().prefs.stars).toEqual({});
  });

  describe('reset externo x rodada local', () => {
    const initial = '{"level":1,"sound":true,"voice":true,"stars":{"numbers-1":3}}';

    it('reset observado (releitura OK) ANTES da rodada: a rodada fica', () => {
      const { a, b, storageA } = setup(initial);
      storageA.failWrites = true;
      b.resetStars();
      expect(a.getSnapshot().prefs.stars).toEqual({});
      expect(a.recordStars('hands-1', 2)).toBe(true);
      storageA.failWrites = false;
      a.refresh();
      expect(storageA.json()).toMatchObject({ stars: { 'hands-1': 2 } });
      expect(a.getSnapshot()).toEqual({ prefs: { ...DEFAULT_PREFERENCES, stars: { 'hands-1': 2 } }, persistent: true });
    });

    it('rodada com releitura OK e DEPOIS reset externo: o reset apaga a rodada (ADR-002)', () => {
      const { a, b, storageA } = setup(initial);
      storageA.failWrites = true;
      expect(a.recordStars('hands-1', 2)).toBe(true);
      b.resetStars();
      expect(a.getSnapshot().prefs.stars).toEqual({});
      storageA.failWrites = false;
      a.refresh();
      expect(storageA.json()).toMatchObject({ stars: {} });
    });

    it('regressão Codex: leitura bloqueada, reset externo e depois rodada -> rodada fica', () => {
      const { a, b, storageA } = setup(initial);
      storageA.failReads = true;
      b.resetStars();
      // Sem releitura, o evento não muda nada: a sessão é mantida.
      expect(a.getSnapshot().prefs.stars).toEqual({ 'numbers-1': 3 });
      expect(a.recordStars('hands-1', 2)).toBe(true);
      storageA.failReads = false;
      a.refresh();
      expect(storageA.json()).toMatchObject({ stars: { 'hands-1': 2 } });
    });

    it('leitura bloqueada, rodada e depois reset externo: ordem indeterminada, a rodada fica (não destrutivo)', () => {
      const { a, b, storageA } = setup(initial);
      storageA.failReads = true;
      expect(a.recordStars('hands-1', 2)).toBe(true);
      b.resetStars();
      storageA.failReads = false;
      a.refresh();
      // Limite documentado: sem relógio no formato salvo não dá para saber
      // que o reset veio depois; a rodada às cegas é preservada.
      expect(storageA.json()).toMatchObject({ stars: { 'hands-1': 2 } });
    });

    it('reset local às cegas + reset e rodada externos: rodada externa posterior não é apagada', () => {
      const { a, b, storageA } = setup(initial);
      storageA.failReads = true;
      a.recordStars('hands-1', 2);
      a.resetStars();
      a.recordStars('words-2', 1);
      b.resetStars();
      b.recordStars('numbers-1', 1);
      storageA.failReads = false;
      a.refresh();
      // O reset local (que tinha visto numbers-1: 3) não apaga o numbers-1: 1
      // gravado depois do reset externo; a rodada local posterior ao reset fica.
      expect(storageA.json()).toMatchObject({ stars: { 'numbers-1': 1, 'words-2': 1 } });
    });
  });

  describe('fila de eventos controlável (captura e entrega atrasada)', () => {
    it('regressão Codex: evento de reset enfileirado antes da rodada às cegas e entregue depois não a descarta', () => {
      const { a, b, storageA, storageB } = setup('{"level":1,"sound":true,"voice":true,"stars":{"numbers-1":2}}');
      storageB.capture = true;
      b.resetStars(); // evento com oldValue igual à base de A, ainda não entregue
      storageA.failReads = true;
      expect(a.recordStars('words-1', 3)).toBe(true);
      storageB.deliver(); // leitura bloqueada: a sessão é mantida
      expect(a.getSnapshot().prefs.stars).toEqual({ 'numbers-1': 2, 'words-1': 3 });
      storageA.failReads = false;
      a.refresh();
      expect(a.getSnapshot().prefs.stars).toEqual({ 'words-1': 3 });
      expect(storageA.json()).toMatchObject({ stars: { 'words-1': 3 } });
    });

    it('mesmo cenário com a leitura de volta na entrega: a rodada às cegas fica', () => {
      const { a, b, storageA, storageB } = setup('{"level":1,"sound":true,"voice":true,"stars":{"numbers-1":2}}');
      storageB.capture = true;
      b.resetStars();
      storageA.failReads = true;
      storageA.failWrites = true;
      a.recordStars('words-1', 3);
      storageA.failReads = false;
      storageB.deliver();
      expect(a.getSnapshot()).toEqual({ prefs: { ...DEFAULT_PREFERENCES, stars: { 'words-1': 3 } }, persistent: false });
      storageA.failWrites = false;
      a.refresh();
      expect(storageA.json()).toMatchObject({ stars: { 'words-1': 3 } });
    });

    it('evento obsoleto entregue depois de uma gravação local não regride o snapshot', () => {
      const { a, b, storageA, storageB } = setup();
      storageB.capture = true;
      b.setLevel(2);
      b.recordStars('words-1', 3);
      a.setLevel(3); // relê (vê words-1: 3) e grava level 3
      a.resetStars(); // apaga o words-1 que viu
      expect(storageA.json()).toEqual({ level: 3, sound: true, voice: true, stars: {} });
      const writes = storageA.writes;
      storageB.deliver();
      expect(a.getSnapshot()).toEqual({ prefs: { ...DEFAULT_PREFERENCES, level: 3 }, persistent: true });
      expect(storageA.writes).toBe(writes);
    });

    it('evento obsoleto entregue depois de um refresh local não regride o snapshot', () => {
      const { a, b, storageB } = setup();
      storageB.capture = true;
      b.setVoice(false);
      b.setVoice(true);
      a.refresh();
      const snap = a.getSnapshot();
      storageB.deliver();
      expect(a.getSnapshot()).toBe(snap);
      expect(snap.prefs.voice).toBe(true);
    });

    it('eventos entregues fora de ordem convergem para o estado atual', () => {
      const { a, b, storageB } = setup();
      storageB.capture = true;
      b.setLevel(2);
      b.setLevel(4);
      storageB.deliver(true);
      expect(a.getSnapshot().prefs.level).toBe(4);
    });
  });

  describe('conflitos de campo', () => {
    it('releitura OK: mudança externa depois do set pendente vence', () => {
      const { a, b, storageA } = setup();
      storageA.failWrites = true;
      a.setLevel(3);
      b.setLevel(2);
      expect(a.getSnapshot().prefs.level).toBe(2);
      storageA.failWrites = false;
      a.refresh();
      expect(storageA.json()).toMatchObject({ level: 2 });
    });

    it('releitura OK: mudança externa antes do set local é vista por ele; o local vence', () => {
      const { a, b, storageA } = setup();
      storageA.failWrites = true;
      b.setLevel(2);
      a.setLevel(3);
      storageA.failWrites = false;
      a.refresh();
      expect(storageA.json()).toMatchObject({ level: 3 });
    });

    it('leitura bloqueada (ordem indeterminada): o set local vence; o campo que só o externo mudou fica', () => {
      const { a, b, storageA } = setup();
      storageA.failReads = true;
      a.setLevel(3);
      b.setLevel(2);
      b.setVoice(false);
      storageA.failReads = false;
      a.refresh();
      expect(storageA.json()).toMatchObject({ level: 3, voice: false });
    });
  });

  it('localStorage.clear() em outra aba (key === null) com pendências', () => {
    const { storageA } = setup('{"level":2,"sound":true,"voice":true,"stars":{"numbers-1":2}}');
    const target = new EventTarget();
    const a2 = createPreferencesStore({ storage: storageA, eventTarget: asTarget(target) });
    storageA.failWrites = true;
    a2.setVoice(false);
    a2.recordStars('hands-1', 3);
    storageA.data.clear();
    target.dispatchEvent(new StorageEvent('storage', { key: null }));
    // clear() é posterior às pendências: nível e estrelas voltam ao padrão; a voz pendente fica.
    expect(a2.getSnapshot()).toEqual({ prefs: { ...DEFAULT_PREFERENCES, voice: false }, persistent: false });
  });

  it('clear() de outra aba: com releitura OK vale; com leitura bloqueada a sessão é mantida', () => {
    const { a, storageA, target } = setup('{"level":2,"sound":true,"voice":true,"stars":{"numbers-1":2}}');
    storageA.failReads = true;
    storageA.data.clear();
    target.dispatchEvent(new StorageEvent('storage', { key: null }));
    expect(a.getSnapshot()).toEqual({ prefs: { level: 2, sound: true, voice: true, stars: { 'numbers-1': 2 } }, persistent: false });
    // Rodada às cegas depois do clear não observado: preservada na recuperação.
    a.recordStars('hands-1', 1);
    storageA.failReads = false;
    target.dispatchEvent(new StorageEvent('storage', { key: null }));
    expect(a.getSnapshot().prefs).toEqual({ ...DEFAULT_PREFERENCES, stars: { 'hands-1': 1 } });
    a.refresh();
    expect(storageA.json()).toEqual({ level: 1, sound: true, voice: true, stars: { 'hands-1': 1 } });
  });

  it('evento com conteúdo falso não é usado: vale o estado relido', () => {
    const { a, target } = setup('{"level":2,"sound":true,"voice":true,"stars":{}}');
    target.dispatchEvent(new StorageEvent('storage', { key: KEY, oldValue: null, newValue: '{"level":4}' }));
    expect(a.getSnapshot().prefs.level).toBe(2);
  });

  it('ignora eventos de outro storageArea (sessionStorage)', () => {
    const { a, target } = setup('{"level":2,"sound":true,"voice":true,"stars":{}}');
    target.dispatchEvent(new StorageEvent('storage', { key: KEY, oldValue: null, newValue: '{"level":4}', storageArea: sessionStorage }));
    expect(a.getSnapshot().prefs.level).toBe(2);
  });
});

describe('evento storage (outra aba)', () => {
  it('relê ao receber o evento, sem regravar; trata key === null (clear)', () => {
    const v2 = '{"level":2,"sound":true,"voice":true,"stars":{"numbers-1":3}}';
    const v4 = '{"level":4,"sound":true,"voice":true,"stars":{"numbers-1":3}}';
    localStorage.setItem(KEY, v2);
    const store = createPreferencesStore();
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const listener = vi.fn();
    store.subscribe(listener);

    localStorage.setItem(KEY, v4);
    setItem.mockClear();
    fireStorage(KEY, v2, v4);
    expect(store.getSnapshot().prefs.level).toBe(4);
    expect(listener).toHaveBeenCalledTimes(1);

    fireStorage('outra-chave', null, 'x');
    expect(listener).toHaveBeenCalledTimes(1);

    localStorage.clear();
    fireStorage(null);
    expect(store.getSnapshot()).toEqual({ prefs: DEFAULT_PREFERENCES, persistent: true });
    expect(listener).toHaveBeenCalledTimes(2);
    expect(setItem).not.toHaveBeenCalled();

    store.dispose();
    localStorage.setItem(KEY, '{"level":3}');
    fireStorage(KEY, null, '{"level":3}');
    expect(store.getSnapshot().prefs.level).toBe(1);
  });

  it('removeItem em outra aba volta aos padrões (pela releitura)', () => {
    const v = '{"level":3,"sound":false,"voice":true,"stars":{}}';
    localStorage.setItem(KEY, v);
    const store = createPreferencesStore();
    expect(store.getSnapshot().prefs.level).toBe(3);
    localStorage.removeItem(KEY);
    fireStorage(KEY, v, null);
    expect(store.getSnapshot().prefs).toEqual(DEFAULT_PREFERENCES);
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
