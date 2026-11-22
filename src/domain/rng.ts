// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import type { Rng } from './types';

export interface SeededRng extends Rng {
  readonly state: () => number;
}

export function mulberry32(seed: number): SeededRng {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = Math.imul(a ^ (a >>> 15), a | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  return Object.assign(next, { state: (): number => a });
}

export function randInt(min: number, max: number, rng: Rng): number {
  if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
    throw new RangeError('randInt');
  }
  return min + Math.floor(rng() * (max - min + 1));
}

export function pick<T>(items: readonly T[], rng: Rng): T {
  if (!items.length) throw new RangeError('pick');
  return items[Math.floor(rng() * items.length)]!;
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
