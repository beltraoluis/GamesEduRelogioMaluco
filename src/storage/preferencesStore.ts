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
 *   `localStorage.clear()`) é só um sinal para reler o estado atual: o
 *   conteúdo (`oldValue`/`newValue`) e a ordem de entrega não são usados,
 *   porque o evento pode chegar atrasado (enfileirado antes de uma operação
 *   local e entregue depois dela). Se a releitura falha, a sessão é mantida.
 *   O handler nunca grava.
 *
 * Limite (sem relógio no formato salvo): uma mudança externa descoberta
 * depois de operações feitas com a leitura bloqueada tem ordem
 * indeterminada em relação a elas. Nesse caso vale a regra não destrutiva:
 * o `set-*` local vence e a rodada local é preservada, mesmo que isso faça
 * sobreviver um recorde anterior a um reset que esta aba não observou.
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
 *   mudança externa descoberta depois pode ter acontecido antes OU depois
 *   dela: a ordem é indeterminada (ver `rebase`).
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
   * Incorpora uma releitura bem-sucedida do storage.
   *
   * Operações feitas com leitura OK (`blind: false`) releram o storage logo
   * antes; o que esta releitura revela de novo aconteceu DEPOIS delas, então
   * a mudança externa vence: campo alterado descarta o `set-*` pendente e
   * reset externo descarta as estrelas pendentes (ADR-002: reset depois da
   * rodada apaga a rodada; reset observado antes dela não a afeta, porque a
   * rodada é aplicada sobre a base já zerada).
   *
   * Operações às cegas (`blind: true`) têm ordem indeterminada em relação à
   * mudança: são preservadas (o `set-*` local vence; a rodada local fica).
   *
   * Um reset externo invalida o que os resets locais pendentes tinham visto:
   * eles e as operações de estrelas anteriores a eles são descartados, para
   * não apagar recordes gravados depois do reset externo.
   */
  function rebase(next: StoredPreferences): void {
    const known = baseKnown;
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
      if (!known || op.blind) return true;
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
    if (fresh.ok) rebase(fresh.stored);
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
   * Evento de outra aba: só um SINAL para reler o estado atual. O conteúdo
   * do evento é ignorado (pode estar atrasado em relação a gravações e
   * releituras locais); se a releitura falhar, a sessão é mantida.
   * ADR-002: só atualiza a memória; nunca grava.
   */
  function onStorage(event: StorageEvent): void {
    if (event.key !== null && event.key !== key) return;
    if (event.storageArea !== null && event.storageArea !== storage) return;
    sync();
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
