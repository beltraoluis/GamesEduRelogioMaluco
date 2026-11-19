// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { describe, expect, it } from 'vitest';

import type { Preferences } from '../../domain/types';
import {
  applyPreferencesOp,
  DEFAULT_PREFERENCES,
  isStars,
  isStarsKey,
  parsePreferences,
  samePreferences,
  serializePreferences,
} from '../preferences';

describe('parsePreferences', () => {
  it('nada salvo -> default', () => {
    expect(parsePreferences(null)).toEqual({
      prefs: DEFAULT_PREFERENCES,
      source: 'default',
      extra: {},
      passthrough: {},
      passthroughStars: {},
    });
  });

  it('fixture do legado (save() de app.js) -> stored', () => {
    const raw = JSON.stringify({ level: 3, sound: false, voice: true, stars: { 'numbers-1': 3, 'words-2': 2, 'hands-4': 1 } });
    const p = parsePreferences(raw);
    expect(p.source).toBe('stored');
    expect(p.prefs).toEqual({ level: 3, sound: false, voice: true, stars: { 'numbers-1': 3, 'words-2': 2, 'hands-4': 1 } });
    expect(p.extra).toEqual({});
  });

  it('padrão do legado recém-gravado', () => {
    const p = parsePreferences('{"level":1,"sound":true,"voice":true,"stars":{}}');
    expect(p.source).toBe('stored');
    expect(samePreferences(p.prefs, DEFAULT_PREFERENCES)).toBe(true);
  });

  it('JSON inválido ou que não é objeto -> corrupt com padrões', () => {
    for (const raw of ['{oops', '', 'null', '[]', '5', '"texto"', 'true']) {
      const p = parsePreferences(raw);
      expect(p.source).toBe('corrupt');
      expect(p.prefs).toEqual(DEFAULT_PREFERENCES);
    }
  });

  it('level: 7 cai para 1 (repaired) e mantém o resto', () => {
    const p = parsePreferences('{"level":7,"sound":false,"voice":false,"stars":{"words-1":2}}');
    expect(p.source).toBe('repaired');
    expect(p.prefs).toEqual({ level: 1, sound: false, voice: false, stars: { 'words-1': 2 } });
  });

  it('level, sound e voice com tipo errado caem no padrão', () => {
    const p = parsePreferences('{"level":"2","sound":"yes","voice":0}');
    expect(p.source).toBe('repaired');
    expect(p.prefs).toEqual(DEFAULT_PREFERENCES);
  });

  it('campos ausentes usam o padrão sem marcar reparo', () => {
    const p = parsePreferences('{"level":4}');
    expect(p.source).toBe('stored');
    expect(p.prefs).toEqual({ ...DEFAULT_PREFERENCES, level: 4 });
  });

  it('stars: só chaves válidas com inteiros 1..3; desconhecidas preservadas', () => {
    const p = parsePreferences(
      JSON.stringify({
        stars: {
          'numbers-1': 4,
          'hands-2': 2.5,
          'words-3': '3',
          'words-0': 2,
          'numbers-1 ': 2,
          'hands-4': 1,
          'explore-1': 3,
          'clock-9': { x: 1 },
        },
      }),
    );
    expect(p.source).toBe('repaired');
    expect(p.prefs.stars).toEqual({ 'hands-4': 1 });
    expect(p.passthroughStars).toEqual({ 'words-0': 2, 'numbers-1 ': 2, 'explore-1': 3, 'clock-9': { x: 1 } });
  });

  it('stars que não é objeto -> {} (repaired)', () => {
    for (const stars of ['[]', '3', 'null', '"x"']) {
      const p = parsePreferences(`{"stars":${stars}}`);
      expect(p.source).toBe('repaired');
      expect(p.prefs.stars).toEqual({});
    }
  });

  it('chaves de topo desconhecidas vão para passthrough/extra (inclusive __proto__)', () => {
    const p = parsePreferences('{"level":2,"theme":"dark","future":{"a":[1]},"__proto__":{"polluted":true}}');
    expect(p.source).toBe('stored');
    expect(p.passthrough).toEqual({ theme: 'dark', future: { a: [1] }, ['__proto__']: { polluted: true } });
    expect(p.extra).toBe(p.passthrough);
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
    expect(Object.getPrototypeOf(p.passthrough)).toBeNull();
  });
});

describe('serializePreferences', () => {
  it('round-trip preservando chaves desconhecidas', () => {
    const raw = '{"theme":"dark","level":2,"sound":false,"voice":true,"stars":{"explore-1":3,"numbers-2":2}}';
    const p = parsePreferences(raw);
    const out = serializePreferences(p.prefs, p.passthrough, p.passthroughStars);
    expect(JSON.parse(out)).toEqual(JSON.parse(raw));
    expect(parsePreferences(out)).toEqual(p);
  });

  it('sem passthrough grava só o formato do legado', () => {
    expect(JSON.parse(serializePreferences(DEFAULT_PREFERENCES))).toEqual({ level: 1, sound: true, voice: true, stars: {} });
  });
});

describe('applyPreferencesOp', () => {
  const base: Preferences = { level: 2, sound: true, voice: false, stars: { 'numbers-1': 2 } };

  it('set-level / set-sound / set-voice', () => {
    expect(applyPreferencesOp(base, { op: 'set-level', level: 3 })).toEqual({ prefs: { ...base, level: 3 }, changed: true });
    expect(applyPreferencesOp(base, { op: 'set-sound', on: false })).toEqual({ prefs: { ...base, sound: false }, changed: true });
    expect(applyPreferencesOp(base, { op: 'set-voice', on: true })).toEqual({ prefs: { ...base, voice: true }, changed: true });
  });

  it('sem mudança devolve a mesma referência', () => {
    for (const r of [
      applyPreferencesOp(base, { op: 'set-level', level: 2 }),
      applyPreferencesOp(base, { op: 'set-sound', on: true }),
      applyPreferencesOp(base, { op: 'set-voice', on: false }),
      applyPreferencesOp(base, { op: 'record-stars', key: 'numbers-1', stars: 1 }),
      applyPreferencesOp(base, { op: 'record-stars', key: 'numbers-1', stars: 2 }),
      applyPreferencesOp({ ...base, stars: {} }, { op: 'reset-stars' }),
    ]) {
      expect(r.changed).toBe(false);
    }
    expect(applyPreferencesOp(base, { op: 'set-level', level: 2 }).prefs).toBe(base);
  });

  it('record-stars: máximo só na chave', () => {
    const r = applyPreferencesOp(base, { op: 'record-stars', key: 'numbers-1', stars: 3 });
    expect(r).toEqual({ prefs: { ...base, stars: { 'numbers-1': 3 } }, changed: true });
    const n = applyPreferencesOp(base, { op: 'record-stars', key: 'hands-4', stars: 1 });
    expect(n.prefs.stars).toEqual({ 'numbers-1': 2, 'hands-4': 1 });
  });

  it('valores inválidos em tempo de execução são ignorados', () => {
    expect(applyPreferencesOp(base, { op: 'set-level', level: 7 } as never).changed).toBe(false);
    expect(applyPreferencesOp(base, { op: 'record-stars', key: 'explore-1', stars: 3 } as never).changed).toBe(false);
    expect(applyPreferencesOp(base, { op: 'record-stars', key: 'hands-1', stars: 4 } as never).changed).toBe(false);
  });

  it('reset-stars preserva nível, som e voz', () => {
    expect(applyPreferencesOp(base, { op: 'reset-stars' })).toEqual({ prefs: { ...base, stars: {} }, changed: true });
  });
});

describe('validadores', () => {
  it('isStarsKey e isStars', () => {
    expect(['numbers-1', 'words-4', 'hands-2'].every(isStarsKey)).toBe(true);
    expect(['explore-1', 'numbers-5', 'numbers-1x', 'xnumbers-1'].some(isStarsKey)).toBe(false);
    expect([1, 2, 3].every(isStars)).toBe(true);
    expect([0, 4, 1.5, '1', null].some(isStars)).toBe(false);
  });

  it('samePreferences', () => {
    const a: Preferences = { level: 1, sound: true, voice: true, stars: { 'words-1': 2 } };
    expect(samePreferences(a, { ...a, stars: { 'words-1': 2 } })).toBe(true);
    expect(samePreferences(a, { ...a, stars: { 'words-1': 3 } })).toBe(false);
    expect(samePreferences(a, { ...a, stars: { 'words-1': 2, 'words-2': 1 } })).toBe(false);
    expect(samePreferences(a, { ...a, level: 2 })).toBe(false);
    expect(samePreferences(a, { ...a, voice: false })).toBe(false);
  });
});
