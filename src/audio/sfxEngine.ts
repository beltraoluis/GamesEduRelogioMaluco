// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import type { SfxName } from '../contracts';

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (ctx?.state === 'closed') ctx = null;
  const Ctor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try { return (ctx ??= new Ctor()); } catch { return null; }
}

export function unlock(): void {
  const a = getCtx();
  if (a?.state === 'suspended') void a.resume().catch(() => {});
}

export function play(name: SfxName): void {
  const a = getCtx();
  if (!a) return;
  if (a.state === 'suspended') void a.resume().catch(() => {});
  const emit = (f: number, s: number, d: number, type: OscillatorType, v: number) => {
    const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + s;
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(a.destination);
    o.start(t); o.stop(t + d + 0.05);
  };
  if (name === 'pick') emit(660, 0, 0.08, 'triangle', 0.15);
  else if (name === 'drop') { emit(523, 0, 0.1, 'triangle', 0.18); emit(784, 0.07, 0.14, 'triangle', 0.18); }
  else if (name === 'wrong') { emit(240, 0, 0.16, 'square', 0.06); emit(190, 0.14, 0.24, 'square', 0.06); }
  else if (name === 'tick') emit(1400, 0, 0.025, 'square', 0.03);
  else if (name === 'success') [523, 659, 784, 1047].forEach((f, i) => emit(f, i * 0.09, 0.22, 'triangle', 0.18));
  else [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => emit(f, i * 0.12, 0.25, 'triangle', 0.18));
}
