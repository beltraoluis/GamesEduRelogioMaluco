// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

/**
 * Matemática pura do relógio: geometria dos ponteiros, quantização do
 * arrasto, horas vizinhas e sorteio de horas.
 *
 * `clockMath` implementa estruturalmente `ClockMathApi` (`src/contracts`).
 * O ESLint proíbe `domain/` de importar `contracts`, por isso a conformidade
 * é verificada por tipo em `src/storage/__tests__/contracts.test.ts`.
 *
 * Ângulos em graus, sentido horário a partir do 12 (0 = topo).
 */

import { hourPool, minutePool } from './levels';
import { randInt } from './rng';
import {
  atmosphereOf,
  numberWord,
  pad,
  periodOf,
  phrase24,
  phraseParts,
  phraseText,
  to12,
  wordToNumber,
} from './time';
import type { ClockTime, HandName, Level, MinuteStep, Rng } from './types';

/** Centro do viewBox 220x220. */
export const CLOCK_CENTER = 110;

/** Raio abaixo do qual um toque perto do ponteiro das horas o escolhe. */
const HOUR_PICK_RADIUS = 58;
/** Distância angular máxima para o toque "colar" no ponteiro das horas. */
const HOUR_PICK_ANGLE = 45;

/** Máximo de sorteios em `randomTime` antes de aceitar uma repetição. */
const RANDOM_TIME_ATTEMPTS = 50;

/** Ângulo normalizado em `[0, 360)`. */
export function normalizeAngle(angle: number): number {
  const a = angle % 360;
  return a < 0 ? a + 360 : a;
}

/** `(h % 12) * 30 + m * 0.5`. */
export function hourHandAngle(time: ClockTime): number {
  return (time.h % 12) * 30 + time.m * 0.5;
}

/** `m * 6` (+ `s * 0.1` com `withSeconds`). */
export function minuteHandAngle(time: ClockTime, withSeconds = false): number {
  return time.m * 6 + (withSeconds ? (time.s ?? 0) * 0.1 : 0);
}

/** `s * 6` (0 sem segundos). */
export function secondHandAngle(time: ClockTime): number {
  return (time.s ?? 0) * 6;
}

/** Menor distância angular entre dois ângulos (0–180). */
export function angleDistance(a: number, b: number): number {
  const d = normalizeAngle(a - b);
  return d > 180 ? 360 - d : d;
}

/**
 * Ângulo acumulado que gira pelo caminho mais curto a partir de
 * `previousDeg` (evita a "volta inteira" do CSS ao passar de 354 para 0).
 * Sem ângulo anterior, devolve `targetDeg`.
 */
export function shortestRotation(previousDeg: number | null, targetDeg: number): number {
  if (previousDeg === null) return targetDeg;
  return previousDeg + ((((targetDeg - previousDeg) % 360) + 540) % 360) - 180;
}

/** Ângulo -> minuto quantizado pelo passo (0–59). */
export function angleToMinute(angle: number, step: MinuteStep): number {
  return (Math.round(normalizeAngle(angle) / 6 / step) * step) % 60;
}

/**
 * Ângulo -> hora 0–23. Desconta o avanço do ponteiro pelos minutos de
 * `current` e preserva a metade do dia (manhã/tarde) de `current`.
 */
export function angleToHour(angle: number, current: ClockTime): number {
  const raw = Math.round((normalizeAngle(angle) - current.m * 0.5) / 30);
  const hh = ((raw % 12) + 12) % 12;
  return (current.h >= 12 ? 12 : 0) + hh;
}

/**
 * Ponteiro mais provável para um toque em `(angle, radius)` no viewBox 220:
 * perto do centro e do ponteiro das horas escolhe as horas; senão, o mais
 * próximo em ângulo (empate favorece os minutos).
 */
export function pickHand(angle: number, radius: number, current: ClockTime): HandName {
  const dm = angleDistance(angle, minuteHandAngle(current));
  const dh = angleDistance(angle, hourHandAngle(current));
  if (radius < HOUR_PICK_RADIUS && dh < HOUR_PICK_ANGLE) return 'hour';
  return dm <= dh ? 'minute' : 'hour';
}

/**
 * Muda o minuto. Com `linkHands` (explorar), cruzar o 12 no sentido horário
 * (de 45–59 para 0–14) avança a hora; no anti-horário, recua.
 */
export function withMinute(current: ClockTime, minute: number, linkHands: boolean): ClockTime {
  if (minute === current.m) return current;
  let h = current.h;
  if (linkHands) {
    if (current.m >= 45 && minute < 15) h = (h + 1) % 24;
    else if (current.m < 15 && minute >= 45) h = (h + 23) % 24;
  }
  return { ...current, h, m: minute };
}

/** Mesma leitura no analógico: `to12(h)` e `m` iguais. */
export function sameReading(a: ClockTime, b: ClockTime): boolean {
  return to12(a.h) === to12(b.h) && a.m === b.m;
}

/** `"h:m"` para evitar repetição na rodada. */
export function timeKey(time: ClockTime): string {
  return `${time.h}:${time.m}`;
}

/**
 * Horas vizinhas `[seguinte, anterior]` com volta: nos níveis de 12 h,
 * `to12(displayH +- 1)` (12 -> 1 e 11; 1 -> 2 e 12); no de 24 h,
 * `(displayH +- 1 + 24) % 24` (23 -> 0 e 22; 0 -> 1 e 23).
 */
export function adjacentHours(displayH: number, h24: boolean): readonly [number, number] {
  if (h24) return [(displayH + 1) % 24, (displayH + 23) % 24];
  return [to12(displayH + 1), to12(displayH + 11)];
}

/** Sorteia uma hora do nível que não esteja em `used` (até 50 tentativas). */
export function randomTime(level: Level, used: ReadonlySet<string>, rng: Rng): ClockTime {
  let time: ClockTime = { h: 0, m: 0 };
  for (let attempt = 0; attempt < RANDOM_TIME_ATTEMPTS; attempt++) {
    const h = level.h24 ? randInt(0, 23, rng) : randInt(1, 12, rng);
    const m = level.step === 60 ? 0 : randInt(0, 60 / level.step - 1, rng) * level.step;
    time = { h, m };
    if (!used.has(timeKey(time))) break;
  }
  return time;
}

/** Implementação de `ClockMathApi` (contrato em `src/contracts`). */
export const clockMath = {
  pad,
  to12,
  periodOf,
  atmosphereOf,
  numberWord,
  wordToNumber,
  phraseParts,
  phraseText,
  phrase24,
  hourHandAngle,
  minuteHandAngle,
  secondHandAngle,
  angleDistance,
  shortestRotation,
  angleToMinute,
  angleToHour,
  pickHand,
  withMinute,
  sameReading,
  timeKey,
  adjacentHours,
  hourPool,
  minutePool,
  randomTime,
} as const;
