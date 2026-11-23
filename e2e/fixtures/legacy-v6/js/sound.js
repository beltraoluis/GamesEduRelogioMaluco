// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

// Efeitos sonoros gerados com Web Audio (sem arquivos: funciona offline)
// e leitura em voz alta com a síntese de voz do aparelho.

let ctx = null;
let soundOn = true;
let voiceOn = true;

export const setSoundOn = (v) => { soundOn = v; };
export const setVoiceOn = (v) => {
  voiceOn = v;
  if (!v && 'speechSynthesis' in window) speechSynthesis.cancel();
};

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, start, dur, type = 'sine', vol = 0.2) {
  if (!soundOn) return;
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t = c.currentTime + start;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export const sfx = {
  pick: () => tone(660, 0, 0.08, 'triangle', 0.15),
  drop: () => { tone(523, 0, 0.1, 'triangle', 0.18); tone(784, 0.07, 0.14, 'triangle', 0.18); },
  wrong: () => { tone(240, 0, 0.16, 'square', 0.06); tone(190, 0.14, 0.24, 'square', 0.06); },
  tick: () => tone(1400, 0, 0.025, 'square', 0.03),
  success: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.22, 'triangle', 0.18)),
  fanfare: () => [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.25, 'triangle', 0.18)),
};

let voices = [];
function loadVoices() {
  if ('speechSynthesis' in window) voices = speechSynthesis.getVoices();
}
if ('speechSynthesis' in window) {
  loadVoices();
  speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
}

export function speak(text) {
  if (!voiceOn || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'pt-BR';
  const v = voices.find((x) => x.lang?.toLowerCase().replace('_', '-') === 'pt-br')
    || voices.find((x) => x.lang?.toLowerCase().startsWith('pt'));
  if (v) u.voice = v;
  u.rate = 0.9;
  u.pitch = 1.1;
  speechSynthesis.speak(u);
}
