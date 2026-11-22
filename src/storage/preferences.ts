// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { isLevelId } from '../domain/levels';
import type {
  ParsedPreferences,
  Preferences,
  PreferencesWriteOp,
  PreferencesWriteResult,
  Stars,
  StarsKey,
  StarsMap,
} from '../domain/types';

export const DEFAULT_PREFERENCES: Preferences = Object.freeze({
  level: 1,
  sound: true,
  voice: true,
  stars: Object.freeze({}),
});

export const STARS_KEY_PATTERN = /^(numbers|words|hands)-[1-4]$/;
const KNOWN_KEYS: ReadonlySet<string> = new Set(['level', 'sound', 'voice', 'stars']);

type UnknownRecord = Readonly<Record<string, unknown>>;

export interface StoredPreferences extends ParsedPreferences {
  readonly passthrough: UnknownRecord;
  readonly passthroughStars: UnknownRecord;
}

export function isStarsKey(key: string): key is StarsKey {
  return STARS_KEY_PATTERN.test(key);
}

export function isStars(value: unknown): value is Stars {
  return value === 1 || value === 2 || value === 3;
}

function isPlainObject(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function defaults(source: StoredPreferences['source']): StoredPreferences {
  return { prefs: DEFAULT_PREFERENCES, source, extra: {}, passthrough: {}, passthroughStars: {} };
}

export function parsePreferences(raw: string | null): StoredPreferences {
  if (raw === null) return defaults('default');
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return defaults('corrupt');
  }
  if (!isPlainObject(data)) return defaults('corrupt');

  let repaired = false;
  const field = <T>(key: string, valid: (v: unknown) => v is T, fallback: T): T => {
    if (!(key in data)) return fallback;
    const v = data[key];
    if (valid(v)) return v;
    repaired = true;
    return fallback;
  };
  const isBool = (v: unknown): v is boolean => typeof v === 'boolean';

  const level = field('level', isLevelId, 1);
  const sound = field('sound', isBool, true);
  const voice = field('voice', isBool, true);

  const stars: Partial<Record<StarsKey, Stars>> = {};
  const passthroughStars = Object.create(null) as Record<string, unknown>;
  if ('stars' in data) {
    const rawStars = data['stars'];
    if (isPlainObject(rawStars)) {
      for (const [k, v] of Object.entries(rawStars)) {
        if (!isStarsKey(k)) passthroughStars[k] = v;
        else if (isStars(v)) stars[k] = v;
        else repaired = true;
      }
    } else {
      repaired = true;
    }
  }

  const passthrough = Object.create(null) as Record<string, unknown>;
  for (const [k, v] of Object.entries(data)) {
    if (!KNOWN_KEYS.has(k)) passthrough[k] = v;
  }

  return {
    prefs: { level, sound, voice, stars },
    source: repaired ? 'repaired' : 'stored',
    extra: passthrough,
    passthrough,
    passthroughStars,
  };
}

export function serializePreferences(
  prefs: Preferences,
  passthrough: UnknownRecord = {},
  passthroughStars: UnknownRecord = {},
): string {
  return JSON.stringify({
    ...passthrough,
    level: prefs.level,
    sound: prefs.sound,
    voice: prefs.voice,
    stars: { ...passthroughStars, ...prefs.stars },
  });
}

function sameStars(a: StarsMap, b: StarsMap): boolean {
  const ka = Object.keys(a) as StarsKey[];
  return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k]);
}

export function samePreferences(a: Preferences, b: Preferences): boolean {
  return a.level === b.level && a.sound === b.sound && a.voice === b.voice && sameStars(a.stars, b.stars);
}

const unchanged = (prefs: Preferences): PreferencesWriteResult => ({ prefs, changed: false });

export function applyPreferencesOp(
  prefs: Preferences,
  op: PreferencesWriteOp,
): PreferencesWriteResult {
  switch (op.op) {
    case 'set-level':
      return !isLevelId(op.level) || op.level === prefs.level
        ? unchanged(prefs)
        : { prefs: { ...prefs, level: op.level }, changed: true };
    case 'set-sound':
      return op.on === prefs.sound
        ? unchanged(prefs)
        : { prefs: { ...prefs, sound: op.on }, changed: true };
    case 'set-voice':
      return op.on === prefs.voice
        ? unchanged(prefs)
        : { prefs: { ...prefs, voice: op.on }, changed: true };
    case 'record-stars':
      return !isStarsKey(op.key) || !isStars(op.stars) || op.stars <= (prefs.stars[op.key] ?? 0)
        ? unchanged(prefs)
        : { prefs: { ...prefs, stars: { ...prefs.stars, [op.key]: op.stars } }, changed: true };
    case 'reset-stars':
      return Object.keys(prefs.stars).length === 0
        ? unchanged(prefs)
        : { prefs: { ...prefs, stars: {} }, changed: true };
  }
}
