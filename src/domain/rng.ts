// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

/**
 * PRNG determinístico (mulberry32) e utilidades de sorteio.
 *
 * O domínio nunca usa `Math.random`: toda aleatoriedade vem de um `Rng`
 * criado a partir de uma seed. O estado interno do mulberry32 é um único
 * uint32, então `GameState.rngState` basta para continuar a sequência.
 */

import type { Rng } from './types';

/** `Rng` com acesso ao estado interno (uint32) após o último sorteio. */
export interface SeededRng extends Rng {
  /** Estado atual; `mulberry32(rng.state())` continua a mesma sequência. */
  readonly state: () => number;
}

/** Cria um mulberry32 a partir de `seed` (qualquer número; usado como uint32). */
export function mulberry32(seed: number): SeededRng {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  return Object.assign(next, { state: (): number => a });
}

/** Inteiro uniforme em `[min, max]` (inclusivo). */
export function randInt(min: number, max: number, rng: Rng): number {
  if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
    throw new RangeError(`randInt: intervalo inválido [${min}, ${max}]`);
  }
  return min + Math.floor(rng() * (max - min + 1));
}

/** Elemento uniforme de `items` (lança erro se vazio). */
export function pick<T>(items: readonly T[], rng: Rng): T {
  if (items.length === 0) throw new RangeError('pick: lista vazia');
  return items[Math.floor(rng() * items.length)] as T;
}

/** Cópia embaralhada (Fisher-Yates); não altera `items`. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = a[i] as T;
    a[i] = a[j] as T;
    a[j] = tmp;
  }
  return a;
}
