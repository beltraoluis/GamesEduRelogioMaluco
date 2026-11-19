// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

/**
 * Store síncrono das preferências para `useSyncExternalStore` (ADR-002, seção 5).
 *
 * - `getSnapshot()` devolve a mesma referência enquanto nada muda;
 * - cada setter é uma operação: relê o `localStorage`, aplica só a sua
 *   mutação e grava (best-effort, sem atomicidade entre abas);
 * - falha de leitura/gravação (modo privado, `QuotaExceededError`) deixa
 *   `persistent: false` e o jogo segue em memória: o snapshot é a última
 *   versão conhecida do storage + as operações locais pendentes, que são
 *   gravadas na recuperação (próxima operação ou `refresh()`), reconciliadas
 *   com o que outras abas gravaram nesse meio-tempo (ver `rebase`);
 * - o evento `storage` de outra aba (inclusive `key === null`, de
 *   `localStorage.clear()`) só atualiza a memória, a partir do próprio
 *   `oldValue`/`newValue`; nunca regrava.
 *
 * Limite (sem relógio no formato salvo): com a leitura bloqueada e sem
 * evento, uma mudança externa descoberta depois tem ordem indistinguível das
 * operações locais às cegas. Nesse caso nada é prometido além da regra não
 * destrutiva: o `set-*` local vence e nenhuma estrela é perdida.
 */

import { PREFERENCES_STORAGE_KEY } from '../contracts';
import type { LevelId, Preferences, PreferencesWriteOp, Stars, StarsKey, StarsMap } from '../domain/types';
import { applyPreferencesOp, parsePreferences, samePreferences, serializePreferences } from './preferences';
import type { StoredPreferences } from './preferences';

export interface PreferencesSnapshot {
  readonly prefs: Preferences;
  /** `false` quando o `localStorage` está indisponível ou há operações ainda não gravadas. */
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
  /** Relê o armazenamento (ex.: ao voltar para a aba) e grava as operações pendentes. */
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

type UnknownRecord = Readonly<Record<string, unknown>>;

/**
 * Operação local ainda não gravada.
 *
 * - `blind`: feita sem conseguir reler o storage (leitura bloqueada). Uma
 *   mudança externa descoberta depois por releitura pode ter acontecido
 *   antes OU depois dela: a ordem é indistinguível (ver `rebase`).
 * - `reset-stars` guarda o que a criança/educador VIU ao apagar
 *   (`cleared`): reaplicado sobre uma base mais nova, só remove essas
 *   estrelas (valor <= o apagado), nunca recordes posteriores de outra aba.
 */
type PendingOp =
  | (Exclude<PreferencesWriteOp, { readonly op: 'reset-stars' }> & { readonly blind: boolean })
  | {
      readonly op: 'reset-stars';
      readonly cleared: StarsMap;
      readonly clearedUnknown: UnknownRecord;
      readonly blind: boolean;
    };

type ResetOp = Extract<PendingOp, { readonly op: 'reset-stars' }>;

interface Materialized {
  readonly prefs: Preferences;
  readonly passthroughStars: UnknownRecord;
}

const sameJson = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

const isStarOp = (op: PendingOp): boolean => op.op === 'record-stars' || op.op === 'reset-stars';

function applyReset(state: Materialized, op: ResetOp): Materialized {
  const stars: Partial<Record<StarsKey, Stars>> = {};
  for (const [k, v] of Object.entries(state.prefs.stars) as [StarsKey, Stars][]) {
    const gone = op.cleared[k];
    if (gone === undefined || v > gone) stars[k] = v;
  }
  const unknown: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(state.passthroughStars)) {
    if (!(k in op.clearedUnknown && sameJson(op.clearedUnknown[k], v))) unknown[k] = v;
  }
  return { prefs: { ...state.prefs, stars }, passthroughStars: unknown };
}

function applyPending(state: Materialized, op: PendingOp): Materialized {
  if (op.op === 'reset-stars') return applyReset(state, op);
  const result = applyPreferencesOp(state.prefs, op);
  return result.changed ? { ...state, prefs: result.prefs } : state;
}

/** Base (última versão conhecida do storage) + operações locais pendentes, em ordem. */
function replay(base: StoredPreferences, ops: readonly PendingOp[]): Materialized {
  return ops.reduce(applyPending, { prefs: base.prefs, passthroughStars: base.passthroughStars });
}

/** Estrelas só sobem, exceto num reset: alguma estrela sumiu ou caiu = outra aba apagou. */
function externalReset(oldBase: StoredPreferences, newBase: StoredPreferences): boolean {
  return (Object.entries(oldBase.prefs.stars) as [StarsKey, Stars][]).some(([k, v]) => (newBase.prefs.stars[k] ?? 0) < v);
}

function sameStored(a: StoredPreferences, b: StoredPreferences): boolean {
  return serializePreferences(a.prefs, a.passthrough, a.passthroughStars) === serializePreferences(b.prefs, b.passthrough, b.passthroughStars);
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
  /** Última versão do storage conhecida (lida, recebida por evento ou gravada aqui). */
  let base: StoredPreferences = initial.stored;
  /** `false` enquanto o storage nunca pôde ser observado. */
  let baseKnown = initial.ok;
  /** Operações locais que ainda não chegaram ao storage. */
  let pending: readonly PendingOp[] = [];
  /** A última tentativa de gravação (ou o teste inicial) funcionou. */
  let writable = initial.ok && probe(storage);
  let snapshot: PreferencesSnapshot = { prefs: base.prefs, persistent: writable };

  function view(): Materialized {
    return replay(base, pending);
  }

  function publish(): void {
    const prefs = view().prefs;
    const persistent = writable && pending.length === 0;
    if (persistent === snapshot.persistent && samePreferences(prefs, snapshot.prefs)) return;
    snapshot = { prefs: samePreferences(prefs, snapshot.prefs) ? snapshot.prefs : prefs, persistent };
    for (const listener of [...listeners]) listener();
  }

  /**
   * Incorpora uma nova observação do storage.
   *
   * `ordered = true` (evento `storage` com `newValue`, ou `clear()`): a
   * mudança externa aconteceu DEPOIS de todas as operações pendentes, então
   * ela vence: campo alterado descarta o `set-*` pendente e reset externo
   * descarta as operações de estrelas pendentes (ADR-002: reset depois da
   * rodada apaga a rodada).
   *
   * `ordered = false` (releitura): a mudança é posterior às operações feitas
   * com leitura OK (`blind: false`), que perdem como acima; mas pode ser
   * anterior ou posterior às operações às cegas. Nessa ambiguidade vale a
   * regra não destrutiva: o `set-*` local é mantido e nenhuma estrela é
   * perdida (o recorde local volta; o reset local só apaga o que viu).
   *
   * Um reset externo invalida o que os resets locais pendentes tinham visto:
   * eles e as operações de estrelas anteriores a eles são descartados, para
   * não apagar recordes gravados depois do reset externo.
   */
  function rebase(next: StoredPreferences, ordered: boolean): void {
    const known = baseKnown;
    const timely = ordered && known;
    const old = base.prefs;
    const levelChanged = next.prefs.level !== old.level;
    const soundChanged = next.prefs.sound !== old.sound;
    const voiceChanged = next.prefs.voice !== old.voice;
    const starsReset = known && externalReset(base, next);

    let ops = pending;
    if (starsReset) {
      let lastReset = -1;
      ops.forEach((op, i) => {
        if (op.op === 'reset-stars') lastReset = i;
      });
      ops = ops.filter((op, i) => !(isStarOp(op) && i <= lastReset));
    }
    ops = ops.filter((op) => {
      if (!known || (op.blind && !timely)) return true;
      switch (op.op) {
        case 'set-level':
          return !levelChanged;
        case 'set-sound':
          return !soundChanged;
        case 'set-voice':
          return !voiceChanged;
        case 'record-stars':
        case 'reset-stars':
          return !starsReset;
      }
    });
    // A partir daqui toda operação pendente é anterior ao que vier depois.
    pending = ops.map((op) => (op.blind ? { ...op, blind: false } : op));
    base = next;
    baseKnown = true;
  }

  /** Grava base + pendentes (só depois de uma releitura bem-sucedida). */
  function flush(): void {
    if (pending.length === 0 || storage === null) return;
    const m = view();
    try {
      storage.setItem(key, serializePreferences(m.prefs, base.passthrough, m.passthroughStars));
    } catch {
      writable = false;
      return;
    }
    base = { ...base, prefs: m.prefs, passthroughStars: m.passthroughStars, source: 'stored' };
    pending = [];
    writable = true;
  }

  /** Releitura; em falha mantém a memória (base + pendentes) e só derruba `persistent`. */
  function sync(): boolean {
    const fresh = read();
    if (fresh.ok) rebase(fresh.stored, false);
    else writable = false;
    return fresh.ok;
  }

  function write(op: PreferencesWriteOp): boolean {
    const readable = sync();
    const blind = !readable;
    const current = view();
    let entry: PendingOp | null = null;
    let changed: boolean;
    if (op.op === 'reset-stars') {
      changed = Object.keys(current.prefs.stars).length > 0;
      if (changed || Object.keys(current.passthroughStars).length > 0) {
        entry = { op: 'reset-stars', cleared: { ...current.prefs.stars }, clearedUnknown: { ...current.passthroughStars }, blind };
      }
    } else {
      changed = applyPreferencesOp(current.prefs, op).changed;
      if (changed) entry = { ...op, blind };
    }
    if (entry !== null) pending = [...pending, entry];
    if (readable) flush();
    publish();
    return changed;
  }

  /**
   * Evento de outra aba: observação ORDENADA (chega logo após a gravação).
   * Usa `oldValue`/`newValue` do próprio evento, então funciona mesmo com a
   * leitura bloqueada. Se `oldValue` difere da base conhecida, houve
   * mudanças não observadas antes desta (evento perdido): elas entram como
   * releitura (não ordenada). `key === null` é `localStorage.clear()`.
   * ADR-002: só atualiza a memória; nunca regrava.
   */
  function onStorage(event: StorageEvent): void {
    if (event.key !== null && event.key !== key) return;
    if (event.storageArea !== null && event.storageArea !== storage) return;
    if (event.key !== null) {
      const before = parsePreferences(event.oldValue);
      if (!baseKnown || !sameStored(before, base)) rebase(before, false);
    }
    rebase(parsePreferences(event.key === null ? null : event.newValue), true);
    publish();
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
      if (sync()) {
        if (pending.length > 0) flush();
        else if (!writable) writable = probe(storage);
      }
      publish();
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
