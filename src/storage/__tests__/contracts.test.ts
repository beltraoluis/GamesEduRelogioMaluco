// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

/**
 * Conformidade do domínio com `src/contracts`. Fica em `storage/__tests__`
 * porque o ESLint proíbe `src/domain/**` (inclusive testes) de importar
 * `contracts`; `storage` pode importar os dois.
 */

import { describe, expect, expectTypeOf, it } from 'vitest';

import { PREFERENCES_STORAGE_KEY, ROUND_LENGTH } from '../../contracts';
import type { ClockMathApi } from '../../contracts';
import { clockMath } from '../../domain/clockMath';
import { DEFAULT_ROUND_LENGTH } from '../../domain/scoring';

describe('contratos', () => {
  it('clockMath implementa ClockMathApi', () => {
    const api: ClockMathApi = clockMath;
    expectTypeOf(clockMath).toExtend<ClockMathApi>();
    expect(api.to12(0)).toBe(12);
    expect(api.adjacentHours(12, false)).toEqual([1, 11]);
  });

  it('constantes alinhadas', () => {
    expect(DEFAULT_ROUND_LENGTH).toBe(ROUND_LENGTH);
    expect(PREFERENCES_STORAGE_KEY).toBe('relogio-maluco-v1');
  });
});
