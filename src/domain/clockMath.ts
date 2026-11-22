// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

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

export const CLOCK_CENTER = 110;

export function normalizeAngle(angle: number): number {
  const a = angle % 360;
  return a < 0 ? a + 360 : a;
}

export const hourHandAngle = (time: ClockTime): number => (time.h % 12) * 30 + time.m * 0.5;

export const minuteHandAngle = (time: ClockTime, withSeconds = false): number =>
  time.m * 6 + (withSeconds ? (time.s ?? 0) * 0.1 : 0);

export const secondHandAngle = (time: ClockTime): number => (time.s ?? 0) * 6;

export function angleDistance(a: number, b: number): number {
  const d = normalizeAngle(a - b);
  return d > 180 ? 360 - d : d;
}

export const shortestRotation = (previousDeg: number | null, targetDeg: number): number =>
  previousDeg === null
    ? targetDeg
    : previousDeg + ((((targetDeg - previousDeg) % 360) + 540) % 360) - 180;

export const angleToMinute = (angle: number, step: MinuteStep): number =>
  (Math.round(normalizeAngle(angle) / 6 / step) * step) % 60;

export function angleToHour(angle: number, current: ClockTime): number {
  const raw = Math.round((normalizeAngle(angle) - current.m * 0.5) / 30);
  return (current.h >= 12 ? 12 : 0) + (((raw % 12) + 12) % 12);
}

export function pickHand(angle: number, radius: number, current: ClockTime): HandName {
  const dm = angleDistance(angle, minuteHandAngle(current));
  const dh = angleDistance(angle, hourHandAngle(current));
  return radius < 58 && dh < 45 ? 'hour' : dm <= dh ? 'minute' : 'hour';
}

export function withMinute(current: ClockTime, minute: number, linkHands: boolean): ClockTime {
  if (minute === current.m) return current;
  let h = current.h;
  if (linkHands) {
    if (current.m >= 45 && minute < 15) h = (h + 1) % 24;
    else if (current.m < 15 && minute >= 45) h = (h + 23) % 24;
  }
  return { ...current, h, m: minute };
}

export const sameReading = (a: ClockTime, b: ClockTime): boolean =>
  to12(a.h) === to12(b.h) && a.m === b.m;

export const timeKey = (time: ClockTime): string => `${time.h}:${time.m}`;

export const adjacentHours = (displayH: number, h24: boolean): readonly [number, number] =>
  h24 ? [(displayH + 1) % 24, (displayH + 23) % 24] : [to12(displayH + 1), to12(displayH + 11)];

export function randomTime(level: Level, used: ReadonlySet<string>, rng: Rng): ClockTime {
  let time: ClockTime = { h: 0, m: 0 };
  for (let i = 0; i < 50; i++) {
    time = {
      h: level.h24 ? randInt(0, 23, rng) : randInt(1, 12, rng),
      m: level.step === 60 ? 0 : randInt(0, 60 / level.step - 1, rng) * level.step,
    };
    if (!used.has(timeKey(time))) break;
  }
  return time;
}

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
