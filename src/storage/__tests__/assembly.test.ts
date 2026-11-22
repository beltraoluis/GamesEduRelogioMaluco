// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { expect, it } from 'vitest';
import { applyPreferencesOp, parsePreferences, serializePreferences } from '../preferences';
  it('salva o melhor resultado por dificuldade e preserva o progresso anterior', () => {
    const old = parsePreferences(JSON.stringify({ level: 3, sound: false, voice: true, stars: { 'numbers-3': 2 } })).prefs;
    const saved = applyPreferencesOp(old, { op: 'record-stars', key: 'assemble-3', stars: 3 }).prefs;
    expect(parsePreferences(serializePreferences(saved)).prefs).toEqual({ ...old, stars: { 'numbers-3': 2, 'assemble-3': 3 } });
    expect(applyPreferencesOp(saved, { op: 'record-stars', key: 'assemble-3', stars: 1 }).changed).toBe(false);
    expect(applyPreferencesOp(saved, { op: 'reset-stars' }).prefs.stars).toEqual({});
  });
