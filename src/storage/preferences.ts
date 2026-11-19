// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

/**
 * Leitura tolerante, gravação e operações puras das preferências salvas em
 * `localStorage['relogio-maluco-v1']` (formato do legado:
 * `{ level, sound, voice, stars }`).
 */

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

/** Chaves de estrelas válidas: `numbers-1` ... `hands-4`. */
export const STARS_KEY_PATTERN = /^(numbers|words|hands)-[1-4]$/;

const KNOWN_KEYS: ReadonlySet<string> = new Set(['level', 'sound', 'voice', 'stars']);

type UnknownRecord = Readonly<Record<string, unknown>>;

/** Resultado da leitura, com as chaves desconhecidas separadas. */
export interface StoredPreferences extends ParsedPreferences {
  /** Chaves de topo desconhecidas (mesmo conteúdo de `extra`). */
  readonly passthrough: UnknownRecord;
  /** Entradas de `stars` com chave desconhecida (ex.: modos futuros). */
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

function emptyRecord(): Record<string, unknown> {
  return Object.create(null) as Record<string, unknown>;
}

function defaults(source: StoredPreferences['source']): StoredPreferences {
  return { prefs: DEFAULT_PREFERENCES, source, extra: {}, passthrough: {}, passthroughStars: {} };
}

/**
 * Lê o JSON salvo sem nunca lançar erro.
 * - `null` (nada salvo) -> `default`;
 * - JSON ilegível ou que não é objeto (inclusive `"null"`) -> `corrupt`;
 * - campo presente com tipo/valor inválido (ex.: `level: 7`) -> padrão do
 *   campo e `repaired`; campos ausentes usam o padrão sem marcar reparo;
 * - chaves desconhecidas são preservadas em `passthrough`/`passthroughStars`.
 */
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

  const level = field('level', isLevelId, DEFAULT_PREFERENCES.level);
  const sound = field('sound', isBool, DEFAULT_PREFERENCES.sound);
  const voice = field('voice', isBool, DEFAULT_PREFERENCES.voice);

  const stars: Partial<Record<StarsKey, Stars>> = {};
  // Sem protótipo: uma chave "__proto__" vira propriedade comum, não protótipo.
  const passthroughStars = emptyRecord();
  if ('stars' in data) {
    const rawStars = data['stars'];
    if (isPlainObject(rawStars)) {
      for (const [key, value] of Object.entries(rawStars)) {
        if (!isStarsKey(key)) passthroughStars[key] = value;
        else if (isStars(value)) stars[key] = value;
        else repaired = true;
      }
    } else {
      repaired = true;
    }
  }

  const passthrough = emptyRecord();
  for (const [key, value] of Object.entries(data)) {
    if (!KNOWN_KEYS.has(key)) passthrough[key] = value;
  }

  return {
    prefs: { level, sound, voice, stars },
    source: repaired ? 'repaired' : 'stored',
    extra: passthrough,
    passthrough,
    passthroughStars,
  };
}

/** JSON a gravar: chaves desconhecidas preservadas + campos conhecidos. */
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
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((k) => a[k] === b[k]);
}

/** Igualdade estrutural de preferências. */
export function samePreferences(a: Preferences, b: Preferences): boolean {
  return a.level === b.level && a.sound === b.sound && a.voice === b.voice && sameStars(a.stars, b.stars);
}

const unchanged = (prefs: Preferences): PreferencesWriteResult => ({ prefs, changed: false });

/**
 * Aplica uma operação sobre `prefs` (normalmente a releitura do storage).
 * Sem mudança, devolve a mesma referência com `changed: false`.
 */
export function applyPreferencesOp(prefs: Preferences, op: PreferencesWriteOp): PreferencesWriteResult {
  switch (op.op) {
    case 'set-level':
      if (!isLevelId(op.level) || op.level === prefs.level) return unchanged(prefs);
      return { prefs: { ...prefs, level: op.level }, changed: true };
    case 'set-sound':
      if (op.on === prefs.sound) return unchanged(prefs);
      return { prefs: { ...prefs, sound: op.on }, changed: true };
    case 'set-voice':
      if (op.on === prefs.voice) return unchanged(prefs);
      return { prefs: { ...prefs, voice: op.on }, changed: true };
    case 'record-stars': {
      if (!isStarsKey(op.key) || !isStars(op.stars)) return unchanged(prefs);
      const best = prefs.stars[op.key] ?? 0;
      if (op.stars <= best) return unchanged(prefs);
      return { prefs: { ...prefs, stars: { ...prefs.stars, [op.key]: op.stars } }, changed: true };
    }
    case 'reset-stars':
      if (Object.keys(prefs.stars).length === 0) return unchanged(prefs);
      return { prefs: { ...prefs, stars: {} }, changed: true };
  }
}
