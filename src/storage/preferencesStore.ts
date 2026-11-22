// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { PREFERENCES_STORAGE_KEY } from '../contracts';
import type { LevelId, Preferences, PreferencesWriteOp, Stars, StarsKey, StarsMap } from '../domain/types';
import { applyPreferencesOp, parsePreferences, samePreferences, serializePreferences } from './preferences';
import type { StoredPreferences } from './preferences';

export interface PreferencesSnapshot {
  readonly prefs: Preferences;
  readonly persistent: boolean;
}

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface StorageEventTarget {
  addEventListener(type: 'storage', listener: (event: StorageEvent) => void): void;
  removeEventListener(type: 'storage', listener: (event: StorageEvent) => void): void;
}

export interface PreferencesStoreOptions {
  readonly storage?: StorageLike | null;
  readonly eventTarget?: StorageEventTarget | null;
  readonly key?: string;
}

export interface PreferencesStore {
  subscribe(listener: () => void): () => void;
  getSnapshot(): PreferencesSnapshot;
  setLevel(level: LevelId): void;
  setSound(on: boolean): void;
  setVoice(on: boolean): void;
  recordStars(key: StarsKey, stars: Stars): boolean;
  resetStars(): void;
  refresh(): void;
  dispose(): void;
}

const PROBE_KEY = `${PREFERENCES_STORAGE_KEY}:probe`;

function defaultStorage(): StorageLike | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function probe(storage: StorageLike | null): boolean {
  if (!storage) return false;
  try {
    storage.setItem(PROBE_KEY, '1');
    storage.removeItem(PROBE_KEY);
    return true;
  } catch {
    return false;
  }
}

type UnknownRecord = Readonly<Record<string, unknown>>;

type PendingOp =
  | (Exclude<PreferencesWriteOp, { readonly op: 'reset-stars' }> & { readonly blind: boolean })
  | {
      readonly op: 'reset-stars';
      readonly cleared: StarsMap;
      readonly clearedUnknown: UnknownRecord;
      readonly blind: boolean;
    };

interface Materialized {
  readonly prefs: Preferences;
  readonly passthroughStars: UnknownRecord;
}

function applyPending(state: Materialized, op: PendingOp): Materialized {
  if (op.op === 'reset-stars') {
    const stars: Partial<Record<StarsKey, Stars>> = {};
    for (const [k, v] of Object.entries(state.prefs.stars) as [StarsKey, Stars][]) {
      const gone = op.cleared[k];
      if (gone === undefined || v > gone) stars[k] = v;
    }
    const unknown: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(state.passthroughStars)) {
      if (!(k in op.clearedUnknown && JSON.stringify(op.clearedUnknown[k]) === JSON.stringify(v))) {
        unknown[k] = v;
      }
    }
    return { prefs: { ...state.prefs, stars }, passthroughStars: unknown };
  }
  const result = applyPreferencesOp(state.prefs, op);
  return result.changed ? { ...state, prefs: result.prefs } : state;
}

export function createPreferencesStore(options: PreferencesStoreOptions = {}): PreferencesStore {
  const storage = options.storage === undefined ? defaultStorage() : options.storage;
  const eventTarget: StorageEventTarget | null =
    options.eventTarget === undefined
      ? typeof window === 'undefined'
        ? null
        : window
      : options.eventTarget;
  const key = options.key ?? PREFERENCES_STORAGE_KEY;
  const listeners = new Set<() => void>();

  const read = (): { readonly stored: StoredPreferences; readonly ok: boolean } => {
    if (!storage) return { stored: parsePreferences(null), ok: false };
    try {
      return { stored: parsePreferences(storage.getItem(key)), ok: true };
    } catch {
      return { stored: parsePreferences(null), ok: false };
    }
  };

  const initial = read();
  let base = initial.stored;
  let baseKnown = initial.ok;
  let pending: readonly PendingOp[] = [];
  let writable = initial.ok && probe(storage);
  let snapshot: PreferencesSnapshot = { prefs: base.prefs, persistent: writable };

  const view = (): Materialized =>
    pending.reduce(applyPending, { prefs: base.prefs, passthroughStars: base.passthroughStars });

  const publish = (): void => {
    const prefs = view().prefs;
    const persistent = writable && pending.length === 0;
    const same = samePreferences(prefs, snapshot.prefs);
    if (persistent === snapshot.persistent && same) return;
    snapshot = { prefs: same ? snapshot.prefs : prefs, persistent };
    for (const fn of [...listeners]) fn();
  };

  const rebase = (next: StoredPreferences): void => {
    const known = baseKnown;
    const old = base.prefs;
    const starsReset =
      known &&
      (Object.entries(old.stars) as [StarsKey, Stars][]).some(
        ([k, v]) => (next.prefs.stars[k] ?? 0) < v,
      );

    let ops = pending;
    if (starsReset) {
      let lastReset = -1;
      ops.forEach((op, i) => {
        if (op.op === 'reset-stars') lastReset = i;
      });
      ops = ops.filter(
        (op, i) => !((op.op === 'record-stars' || op.op === 'reset-stars') && i <= lastReset),
      );
    }
    ops = ops.filter((op) => {
      if (!known || op.blind) return true;
      return op.op === 'set-level'
        ? next.prefs.level === old.level
        : op.op === 'set-sound'
          ? next.prefs.sound === old.sound
          : op.op === 'set-voice'
            ? next.prefs.voice === old.voice
            : !starsReset;
    });
    pending = ops.map((op) => (op.blind ? { ...op, blind: false } : op));
    base = next;
    baseKnown = true;
  };

  const flush = (): void => {
    if (!pending.length || !storage) return;
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
  };

  const sync = (): boolean => {
    const fresh = read();
    if (fresh.ok) rebase(fresh.stored);
    else writable = false;
    return fresh.ok;
  };

  const write = (op: PreferencesWriteOp): boolean => {
    const readable = sync();
    const blind = !readable;
    const cur = view();
    let entry: PendingOp | null = null;
    let changed: boolean;
    if (op.op === 'reset-stars') {
      changed = Object.keys(cur.prefs.stars).length > 0;
      if (changed || Object.keys(cur.passthroughStars).length > 0) {
        entry = {
          op: 'reset-stars',
          cleared: { ...cur.prefs.stars },
          clearedUnknown: { ...cur.passthroughStars },
          blind,
        };
      }
    } else {
      changed = applyPreferencesOp(cur.prefs, op).changed;
      if (changed) entry = { ...op, blind };
    }
    if (entry) pending = [...pending, entry];
    if (readable) flush();
    publish();
    return changed;
  };

  const onStorage = (e: StorageEvent): void => {
    if ((e.key !== null && e.key !== key) || (e.storageArea !== null && e.storageArea !== storage)) {
      return;
    }
    sync();
    publish();
  };

  eventTarget?.addEventListener('storage', onStorage);

  return {
    subscribe: (fn) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
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
        if (pending.length) flush();
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

export function getPreferencesStore(): PreferencesStore {
  return (singleton ??= createPreferencesStore());
}

export const preferencesStore: PreferencesStore = {
  subscribe: (fn) => getPreferencesStore().subscribe(fn),
  getSnapshot: () => getPreferencesStore().getSnapshot(),
  setLevel: (l) => getPreferencesStore().setLevel(l),
  setSound: (on) => getPreferencesStore().setSound(on),
  setVoice: (on) => getPreferencesStore().setVoice(on),
  recordStars: (k, s) => getPreferencesStore().recordStars(k, s),
  resetStars: () => getPreferencesStore().resetStars(),
  refresh: () => getPreferencesStore().refresh(),
  dispose: () => {
    singleton?.dispose();
    singleton = null;
  },
};
