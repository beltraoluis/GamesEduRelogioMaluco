// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import type { SfxName } from '../contracts';

import { content } from '../content/runtimeDomData';

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
  for (const [frequency, start, duration, wave, volume] of content.sounds[name]) {
    tone(audio, frequency, start, duration, wave, volume);
  }
}
