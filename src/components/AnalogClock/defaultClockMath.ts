// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import type { ClockMathApi, ClockTime, MinuteStep } from '../../contracts';

export type ClockGeometry = Pick<ClockMathApi, 'hourHandAngle' | 'minuteHandAngle' | 'secondHandAngle' | 'angleDistance' | 'shortestRotation' | 'angleToMinute' | 'angleToHour' | 'pickHand' | 'withMinute'>;
const normalize = (n: number) => ((n % 360) + 360) % 360;
const hourHandAngle = (t: ClockTime) => (t.h % 12) * 30 + t.m * 0.5;
const minuteHandAngle = (t: ClockTime, withSeconds = false) => t.m * 6 + (withSeconds ? (t.s ?? 0) * 0.1 : 0);
const angleDistance = (a: number, b: number) => { const d = normalize(a - b); return Math.min(d, 360 - d); };
export const defaultClockMath: ClockGeometry = {
  hourHandAngle, minuteHandAngle,
  secondHandAngle: t => (t.s ?? 0) * 6,
  angleDistance,
  shortestRotation: (previous, target) => previous === null ? target : previous + ((normalize(target - previous) + 180) % 360 - 180),
  angleToMinute: (angle: number, step: MinuteStep) => (Math.round(normalize(angle) / (step * 6)) * step) % 60,
  angleToHour: (angle, current) => (Math.round((normalize(angle) - current.m * 0.5) / 30) % 12 + 12) % 12 + (current.h >= 12 ? 12 : 0),
  pickHand: (angle, radius, time) => radius < 45 || angleDistance(angle, hourHandAngle(time)) < angleDistance(angle, minuteHandAngle(time)) ? 'hour' : 'minute',
  withMinute: (current, minute, linked) => ({ ...current, m: minute, h: (current.h + (linked && current.m > 45 && minute < 15 ? 1 : linked && current.m < 15 && minute > 45 ? 23 : 0)) % 24 }),
};
