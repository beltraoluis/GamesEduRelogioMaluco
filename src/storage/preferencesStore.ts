// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

/**
 * Store síncrono das preferências para `useSyncExternalStore` (ADR-002, seção 5).
 *
 * - `getSnapshot()` devolve a mesma referência enquanto nada muda;
 * - cada setter é uma operação: relê o `localStorage`, aplica só a sua
 *   mutação e grava (best-effort, sem atomicidade entre abas);
 * - falha de leitura/gravação (modo privado, `QuotaExceededError`) deixa
 *   `persistent: false` e o jogo segue em memória;
 * - o evento `storage` de outra aba (inclusive `key === null`, de
 *   `localStorage.clear()`) só atualiza a memória; nunca regrava.
 */

import { PREFERENCES_STORAGE_KEY } from '../contracts';
import type { LevelId, Preferences, PreferencesWriteOp, Stars, StarsKey } from '../domain/types';
import { applyPreferencesOp, parsePreferences, samePreferences, serializePreferences } from './preferences';
import type { StoredPreferences } from './preferences';

export interface PreferencesSnapshot {
  readonly prefs: Preferences;
  /** `false` quando o `localStorage` está indisponível ou a última gravação falhou. */
  readonly persistent: boolean;
}

/** Subconjunto de `Storage` usado pelo store (injetável em testes). */
export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Alvo do evento `storage` (normalmente `window`). */
export interface StorageEventTarget {
  addEventListener(type: 'storage', listener: (event: StorageEvent) => void): void;
  removeEventListener(type: 'storage', listener: (event: StorageEvent) => void): void;
}

export interface PreferencesStoreOptions {
  /** `null` = sem armazenamento. Padrão: `window.localStorage` (se acessível). */
  readonly storage?: StorageLike | null;
  /** `null` = não escuta outras abas. Padrão: `window` (se existir). */
  readonly eventTarget?: StorageEventTarget | null;
  /** Padrão: `PREFERENCES_STORAGE_KEY`. */
  readonly key?: string;
}

export interface PreferencesStore {
  subscribe(listener: () => void): () => void;
  getSnapshot(): PreferencesSnapshot;
  setLevel(level: LevelId): void;
  setSound(on: boolean): void;
  setVoice(on: boolean): void;
  /** `true` se for um novo recorde nesta chave (sobre a releitura). */
  recordStars(key: StarsKey, stars: Stars): boolean;
  resetStars(): void;
  /** Relê o armazenamento (ex.: ao voltar para a aba). */
  refresh(): void;
  /** Remove o listener do evento `storage`. */
  dispose(): void;
}

const PROBE_KEY = `${PREFERENCES_STORAGE_KEY}:probe`;

function defaultStorage(): StorageLike | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    // SecurityError: cookies/armazenamento bloqueados.
    return null;
  }
}

function defaultEventTarget(): StorageEventTarget | null {
  return typeof window === 'undefined' ? null : window;
}

/** Testa se dá para gravar (Safari privado antigo lança `QuotaExceededError`). */
function probe(storage: StorageLike | null): boolean {
  if (storage === null) return false;
  try {
    storage.setItem(PROBE_KEY, '1');
    storage.removeItem(PROBE_KEY);
    return true;
  } catch {
    return false;
  }
}

interface ReadResult {
  readonly stored: StoredPreferences;
  readonly ok: boolean;
}

export function createPreferencesStore(options: PreferencesStoreOptions = {}): PreferencesStore {
  const storage = options.storage === undefined ? defaultStorage() : options.storage;
  const eventTarget = options.eventTarget === undefined ? defaultEventTarget() : options.eventTarget;
  const key = options.key ?? PREFERENCES_STORAGE_KEY;
  const listeners = new Set<() => void>();

  function read(): ReadResult {
    if (storage === null) return { stored: parsePreferences(null), ok: false };
    try {
      return { stored: parsePreferences(storage.getItem(key)), ok: true };
    } catch {
      return { stored: parsePreferences(null), ok: false };
    }
  }

  const initial = read();
  let snapshot: PreferencesSnapshot = { prefs: initial.stored.prefs, persistent: initial.ok && probe(storage) };

  function publish(prefs: Preferences, persistent: boolean): void {
    if (persistent === snapshot.persistent && samePreferences(prefs, snapshot.prefs)) return;
    snapshot = { prefs: samePreferences(prefs, snapshot.prefs) ? snapshot.prefs : prefs, persistent };
    for (const listener of [...listeners]) listener();
  }

  function write(op: PreferencesWriteOp): boolean {
    const fresh = read();
    // Sem leitura possível, a base é a memória (o jogo segue sem salvar).
    const base = fresh.ok ? fresh.stored.prefs : snapshot.prefs;
    const result = applyPreferencesOp(base, op);
    const passthroughStars = op.op === 'reset-stars' ? {} : fresh.stored.passthroughStars;
    const dropsUnknownStars = op.op === 'reset-stars' && Object.keys(fresh.stored.passthroughStars).length > 0;
    // Sem gravação, `persistent` só pode cair (leitura falhou), nunca subir.
    let persistent = fresh.ok && snapshot.persistent;
    if (fresh.ok && storage !== null && (result.changed || dropsUnknownStars)) {
      try {
        storage.setItem(key, serializePreferences(result.prefs, fresh.stored.passthrough, passthroughStars));
        persistent = true;
      } catch {
        persistent = false;
      }
    }
    publish(result.prefs, persistent);
    return result.changed;
  }

  function onStorage(event: StorageEvent): void {
    if (event.key !== null && event.key !== key) return;
    const fresh = read();
    publish(fresh.stored.prefs, fresh.ok ? snapshot.persistent : false);
  }

  eventTarget?.addEventListener('storage', onStorage);

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    setLevel: (level) => void write({ op: 'set-level', level }),
    setSound: (on) => void write({ op: 'set-sound', on }),
    setVoice: (on) => void write({ op: 'set-voice', on }),
    recordStars: (starsKey, stars) => write({ op: 'record-stars', key: starsKey, stars }),
    resetStars: () => void write({ op: 'reset-stars' }),
    refresh() {
      const fresh = read();
      publish(fresh.stored.prefs, fresh.ok ? snapshot.persistent : false);
    },
    dispose() {
      eventTarget?.removeEventListener('storage', onStorage);
    },
  };
}

let singleton: PreferencesStore | null = null;

/** Store único da aplicação, criado no primeiro uso. */
export function getPreferencesStore(): PreferencesStore {
  singleton ??= createPreferencesStore();
  return singleton;
}

/** Fachada do store único (criação preguiçosa: nada acontece no import). */
export const preferencesStore: PreferencesStore = {
  subscribe: (listener) => getPreferencesStore().subscribe(listener),
  getSnapshot: () => getPreferencesStore().getSnapshot(),
  setLevel: (level) => getPreferencesStore().setLevel(level),
  setSound: (on) => getPreferencesStore().setSound(on),
  setVoice: (on) => getPreferencesStore().setVoice(on),
  recordStars: (key, stars) => getPreferencesStore().recordStars(key, stars),
  resetStars: () => getPreferencesStore().resetStars(),
  refresh: () => getPreferencesStore().refresh(),
  dispose: () => {
    singleton?.dispose();
    singleton = null;
  },
};
