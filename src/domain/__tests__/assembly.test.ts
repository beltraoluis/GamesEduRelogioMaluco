// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { describe, expect, it } from 'vitest';
import { POSITIONS, assemblyLabel, assemblyReducer, dialPosition, initialAssembly } from '../assembly';

describe('montagem do relógio', () => {
  it('orienta horas e minutos sem inverter o topo e os pontos cardeais', () => {
    expect(POSITIONS.map(p => assemblyLabel('hours', p))).toEqual(['12','1','2','3','4','5','6','7','8','9','10','11']);
    expect(POSITIONS.map(p => assemblyLabel('minutes', p))).toEqual(['00','05','10','15','20','25','30','35','40','45','50','55']);
    expect(dialPosition(0)).toEqual({ left: '50%', top: '11%' });
    expect(dialPosition(3)).toEqual({ left: '89%', top: '50%' });
    expect(dialPosition(6).top).toBe('89%');
    expect(dialPosition(9).left).toBe('11%');
  });
  it('permite corrigir erros e ignora encaixes ocupados, inválidos e duplicados', () => {
    let state = initialAssembly();
    state = assemblyReducer(state, { type: 'place', piece: 0, target: 1 });
    expect(state.mistakes).toBe(1); expect(state.placed).toEqual([]);
    state = assemblyReducer(state, { type: 'place', piece: 0, target: 0 });
    expect(state.placed).toEqual([0]);
    for (const action of [ { type: 'place', piece: 0, target: 0 }, { type: 'place', piece: 1, target: 0 },
      { type: 'place', piece: 99, target: 1 }, { type: 'place', piece: 1, target: -1 } ] as const) {
      expect(assemblyReducer(state, action)).toBe(state);
    }
  });
  it('exige as 12 peças antes de avançar e preserva os erros entre as etapas', () => {
    let state = assemblyReducer(initialAssembly(), { type: 'place', piece: 2, target: 3 });
    for (const p of POSITIONS.slice(0, 11)) state = assemblyReducer(state, { type: 'place', piece: p, target: p });
    expect(assemblyReducer(state, { type: 'minutes' })).toBe(state);
    state = assemblyReducer(state, { type: 'place', piece: 11, target: 11 });
    state = assemblyReducer(state, { type: 'minutes' });
    expect(state.phase).toBe('minutes'); expect(state.placed).toEqual([]); expect(state.mistakes).toBe(1);
    expect(assemblyReducer(state, { type: 'minutes' })).toBe(state);
  });
});
