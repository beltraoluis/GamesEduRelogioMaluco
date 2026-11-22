// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import type { SfxName } from '../contracts';

let context: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (context?.state === 'closed') context = null;
  const AudioConstructor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioConstructor) return null;
  try { return context ??= new AudioConstructor(); } catch { return null; }
}

export function unlock(): void {
  const audio = getContext();
  if (audio?.state === 'suspended') void audio.resume().catch(() => {});
}

function tone(audio: AudioContext, frequency: number, start: number, duration: number, type: OscillatorType, volume: number): void {
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  const time = audio.currentTime + start;
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(volume, time + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(time);
  oscillator.stop(time + duration + 0.05);
}

export function play(name: SfxName): void {
  const audio = getContext();
  if (!audio) return;
  if (audio.state === 'suspended') void audio.resume().catch(() => {});
  const emit = (frequency: number, start: number, duration: number, type: OscillatorType, volume: number) => tone(audio, frequency, start, duration, type, volume);
  switch (name) {
    case 'pick': emit(660, 0, 0.08, 'triangle', 0.15); break;
    case 'drop': emit(523, 0, 0.1, 'triangle', 0.18); emit(784, 0.07, 0.14, 'triangle', 0.18); break;
    case 'wrong': emit(240, 0, 0.16, 'square', 0.06); emit(190, 0.14, 0.24, 'square', 0.06); break;
    case 'tick': emit(1400, 0, 0.025, 'square', 0.03); break;
    case 'success': [523, 659, 784, 1047].forEach((f, i) => emit(f, i * 0.09, 0.22, 'triangle', 0.18)); break;
    case 'fanfare': [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => emit(f, i * 0.12, 0.25, 'triangle', 0.18)); break;
  }
}
