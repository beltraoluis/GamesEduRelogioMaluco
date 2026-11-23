// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { describe, expect, it } from 'vitest';

import { mulberry32, pick, randInt, shuffle } from '../rng';

describe('rng', () => {
  it('mulberry32 é determinístico e fica em [0, 1)', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 1000; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });

  it('valor de referência estável (mulberry32 canônico)', () => {
    const r = mulberry32(0);
    expect(r()).toBeCloseTo(0.26642920868471265, 15);
  });

  it('state() continua a sequência', () => {
    const a = mulberry32(123);
    a();
    a();
    const resumed = mulberry32(a.state());
    expect(resumed()).toBe(a());
    expect(resumed.state()).toBe(a.state());
  });

  it('seeds negativas e fracionárias viram uint32', () => {
    expect(mulberry32(-1).state()).toBe(0xffffffff);
    expect(mulberry32(2 ** 32 + 5).state()).toBe(5);
  });

  it('randInt cobre o intervalo inclusivo', () => {
    const r = mulberry32(7);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const v = randInt(1, 6, r);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
      seen.add(v);
    }
    expect(seen.size).toBe(6);
    expect(randInt(3, 3, r)).toBe(3);
    expect(() => randInt(5, 1, r)).toThrow(RangeError);
    expect(() => randInt(0.5, 1, r)).toThrow(RangeError);
  });

  it('pick e shuffle', () => {
    const r = mulberry32(9);
    const items = [1, 2, 3, 4, 5];
    expect(items).toContain(pick(items, r));
    expect(() => pick([], r)).toThrow(RangeError);
    const s = shuffle(items, r);
    expect(s).not.toBe(items);
    expect([...s].sort()).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5]);
    expect(shuffle(items, mulberry32(3))).toEqual(shuffle(items, mulberry32(3)));
    expect(shuffle([], r)).toEqual([]);
  });
});
