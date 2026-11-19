// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { describe, expect, it } from 'vitest';

import {
  adjacentHours,
  angleDistance,
  angleToHour,
  angleToMinute,
  clockMath,
  hourHandAngle,
  minuteHandAngle,
  normalizeAngle,
  pickHand,
  randomTime,
  sameReading,
  secondHandAngle,
  shortestRotation,
  timeKey,
  withMinute,
} from '../clockMath';
import { getLevel, LEVELS } from '../levels';
import { mulberry32 } from '../rng';
import type { MinuteStep } from '../types';

describe('ângulos dos ponteiros', () => {
  it('hora, minuto e segundo', () => {
    expect(hourHandAngle({ h: 3, m: 0 })).toBe(90);
    expect(hourHandAngle({ h: 15, m: 30 })).toBe(105);
    expect(hourHandAngle({ h: 0, m: 0 })).toBe(0);
    expect(minuteHandAngle({ h: 0, m: 15 })).toBe(90);
    expect(minuteHandAngle({ h: 0, m: 15, s: 30 })).toBe(90);
    expect(minuteHandAngle({ h: 0, m: 15, s: 30 }, true)).toBe(93);
    expect(minuteHandAngle({ h: 0, m: 15 }, true)).toBe(90);
    expect(secondHandAngle({ h: 0, m: 0, s: 10 })).toBe(60);
    expect(secondHandAngle({ h: 0, m: 0 })).toBe(0);
  });

  it('11:59 <-> 12:00 (ponteiro das horas quase no 12)', () => {
    expect(hourHandAngle({ h: 11, m: 59 })).toBe(359.5);
    expect(hourHandAngle({ h: 12, m: 0 })).toBe(0);
    expect(angleDistance(359.5, 0)).toBe(0.5);
    expect(shortestRotation(359.5, 0)).toBe(360);
    expect(shortestRotation(354, 0)).toBe(360);
    expect(shortestRotation(360, 359.5)).toBe(359.5);
  });

  it('normalizeAngle e angleDistance', () => {
    expect(normalizeAngle(-30)).toBe(330);
    expect(normalizeAngle(725)).toBe(5);
    expect(angleDistance(10, 350)).toBe(20);
    expect(angleDistance(0, 180)).toBe(180);
    expect(angleDistance(90, 90)).toBe(0);
    expect(angleDistance(-90, 90)).toBe(180);
  });

  it('shortestRotation gira pelo caminho mais curto e acumula', () => {
    expect(shortestRotation(null, 123)).toBe(123);
    expect(shortestRotation(0, 90)).toBe(90);
    expect(shortestRotation(0, 270)).toBe(-90);
    expect(shortestRotation(720, 10)).toBe(730);
    expect(shortestRotation(-350, 0)).toBe(-360);
    expect(shortestRotation(0, 180)).toBe(-180);
    let acc: number | null = null;
    for (let m = 0; m <= 120; m++) {
      const next: number = shortestRotation(acc, ((m % 60) * 6) as number);
      if (acc !== null) expect(Math.abs(next - acc)).toBeLessThanOrEqual(6);
      acc = next;
    }
    expect(acc).toBe(720);
  });
});

describe('quantização do arrasto', () => {
  it('angleToMinute por passo', () => {
    expect(angleToMinute(90, 1)).toBe(15);
    expect(angleToMinute(93, 1)).toBe(16);
    expect(angleToMinute(359, 1)).toBe(0);
    expect(angleToMinute(-6, 1)).toBe(59);
    expect(angleToMinute(100, 5)).toBe(15);
    expect(angleToMinute(130, 15)).toBe(15);
    expect(angleToMinute(140, 15)).toBe(30);
    expect(angleToMinute(350, 15)).toBe(0);
    for (const step of [60, 15, 5, 1] as MinuteStep[]) {
      for (let a = 0; a < 360; a += 7) {
        const m = angleToMinute(a, step);
        expect(m % step === 0 || step === 60).toBe(true);
        expect(m).toBeGreaterThanOrEqual(0);
        expect(m).toBeLessThan(60);
      }
    }
    expect(angleToMinute(200, 60)).toBe(0);
  });

  it('angleToHour preserva a metade do dia (AM/PM)', () => {
    expect(angleToHour(90, { h: 9, m: 0 })).toBe(3);
    expect(angleToHour(90, { h: 21, m: 0 })).toBe(15);
    expect(angleToHour(0, { h: 13, m: 0 })).toBe(12);
    expect(angleToHour(0, { h: 1, m: 0 })).toBe(0);
    expect(angleToHour(359, { h: 23, m: 0 })).toBe(12);
    // Com minutos, o ponteiro avança: 105 graus às xx:30 é o 3.
    expect(angleToHour(105, { h: 8, m: 30 })).toBe(3);
    expect(angleToHour(105, { h: 20, m: 30 })).toBe(15);
    expect(angleToHour(-30, { h: 14, m: 0 })).toBe(23);
    for (let h = 0; h < 24; h++) {
      for (const m of [0, 15, 30, 59]) {
        expect(angleToHour(hourHandAngle({ h, m }), { h, m })).toBe(h);
      }
    }
  });

  it('pickHand', () => {
    const t = { h: 3, m: 0 }; // horas em 90, minutos em 0
    expect(pickHand(5, 90, t)).toBe('minute');
    expect(pickHand(85, 90, t)).toBe('hour');
    expect(pickHand(80, 40, t)).toBe('hour');
    // Empate favorece minutos.
    expect(pickHand(45, 90, t)).toBe('minute');
    // Perto do centro, mas longe do ponteiro das horas: vale o mais próximo.
    expect(pickHand(350, 30, t)).toBe('minute');
    // Ponteiros sobrepostos às 12:00: perto do centro escolhe as horas.
    expect(pickHand(0, 30, { h: 12, m: 0 })).toBe('hour');
    expect(pickHand(0, 80, { h: 12, m: 0 })).toBe('minute');
  });
});

describe('withMinute e linkHands', () => {
  it('sem linkHands só muda o minuto', () => {
    expect(withMinute({ h: 9, m: 50 }, 5, false)).toEqual({ h: 9, m: 5 });
  });

  it('mesmo minuto devolve a mesma referência', () => {
    const t = { h: 9, m: 10 };
    expect(withMinute(t, 10, true)).toBe(t);
  });

  it('cruzar o 12 avança ou recua a hora (com volta 23 <-> 0)', () => {
    expect(withMinute({ h: 11, m: 59 }, 0, true)).toEqual({ h: 12, m: 0 });
    expect(withMinute({ h: 12, m: 0 }, 59, true)).toEqual({ h: 11, m: 59 });
    expect(withMinute({ h: 23, m: 50 }, 2, true)).toEqual({ h: 0, m: 2 });
    expect(withMinute({ h: 0, m: 5 }, 55, true)).toEqual({ h: 23, m: 55 });
    expect(withMinute({ h: 9, m: 20 }, 40, true)).toEqual({ h: 9, m: 40 });
    expect(withMinute({ h: 9, m: 30 }, 5, true)).toEqual({ h: 9, m: 5 });
  });

  it('preserva os segundos', () => {
    expect(withMinute({ h: 9, m: 59, s: 12 }, 0, true)).toEqual({ h: 10, m: 0, s: 12 });
  });
});

describe('leitura, chaves e horas vizinhas', () => {
  it('sameReading compara em 12 h', () => {
    expect(sameReading({ h: 15, m: 10 }, { h: 3, m: 10 })).toBe(true);
    expect(sameReading({ h: 0, m: 0 }, { h: 12, m: 0 })).toBe(true);
    expect(sameReading({ h: 3, m: 10 }, { h: 3, m: 11 })).toBe(false);
    expect(sameReading({ h: 4, m: 10 }, { h: 3, m: 10 })).toBe(false);
  });

  it('timeKey', () => {
    expect(timeKey({ h: 9, m: 5 })).toBe('9:5');
  });

  it('adjacentHours com wrap corrigido (regressão ADR-002 §3)', () => {
    expect(adjacentHours(12, false)).toEqual([1, 11]);
    expect(adjacentHours(1, false)).toEqual([2, 12]);
    expect(adjacentHours(6, false)).toEqual([7, 5]);
    expect(adjacentHours(23, true)).toEqual([0, 22]);
    expect(adjacentHours(0, true)).toEqual([1, 23]);
    expect(adjacentHours(12, true)).toEqual([13, 11]);
    for (let d = 1; d <= 12; d++) {
      for (const n of adjacentHours(d, false)) {
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(12);
      }
    }
  });
});

describe('randomTime', () => {
  it('respeita o nível e evita horas usadas', () => {
    for (const level of LEVELS) {
      const rng = mulberry32(level.id * 1000);
      const used = new Set<string>();
      for (let i = 0; i < 8; i++) {
        const t = randomTime(level, used, rng);
        expect(used.has(timeKey(t))).toBe(false);
        used.add(timeKey(t));
        if (level.h24) {
          expect(t.h).toBeGreaterThanOrEqual(0);
          expect(t.h).toBeLessThanOrEqual(23);
        } else {
          expect(t.h).toBeGreaterThanOrEqual(1);
          expect(t.h).toBeLessThanOrEqual(12);
        }
        expect(t.m % level.step === 0 || level.step === 60).toBe(true);
        if (level.step === 60) expect(t.m).toBe(0);
      }
    }
  });

  it('é determinístico pela seed', () => {
    const l = getLevel(3);
    expect(randomTime(l, new Set(), mulberry32(5))).toEqual(randomTime(l, new Set(), mulberry32(5)));
  });

  it('desiste após 50 tentativas quando tudo está usado', () => {
    const l = getLevel(1);
    const all = new Set(Array.from({ length: 12 }, (_, i) => `${i + 1}:0`));
    let calls = 0;
    const base = mulberry32(1);
    const rng = () => {
      calls++;
      return base();
    };
    const t = randomTime(l, all, rng);
    expect(all.has(timeKey(t))).toBe(true);
    expect(calls).toBe(50);
  });
});

describe('clockMath (objeto da API)', () => {
  it('expõe todas as funções do contrato', () => {
    const names = [
      'pad', 'to12', 'periodOf', 'atmosphereOf', 'numberWord', 'wordToNumber', 'phraseParts', 'phraseText', 'phrase24',
      'hourHandAngle', 'minuteHandAngle', 'secondHandAngle', 'angleDistance', 'shortestRotation', 'angleToMinute',
      'angleToHour', 'pickHand', 'withMinute', 'sameReading', 'timeKey', 'adjacentHours', 'hourPool', 'minutePool', 'randomTime',
    ];
    expect(Object.keys(clockMath).sort()).toEqual([...names].sort());
    for (const n of names) expect(typeof (clockMath as Record<string, unknown>)[n]).toBe('function');
  });
});
