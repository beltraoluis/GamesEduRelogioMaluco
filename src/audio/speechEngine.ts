// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

export function createSpeechEngine() {
  const syn = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
  let voices: SpeechSynthesisVoice[] = [];
  let gen = 0;
  const load = () => { voices = syn?.getVoices() ?? []; };
  load();
  syn?.addEventListener('voiceschanged', load);
  const supported = Boolean(syn && typeof SpeechSynthesisUtterance !== 'undefined');
  return {
    supported,
    speak(text: string, onEnd: () => void) {
      if (!syn || !supported) return;
      const cur = ++gen;
      syn.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'pt-BR';
      const v = voices.find((x) => x.lang.toLowerCase().replace('_', '-') === 'pt-br') ?? voices.find((x) => x.lang.toLowerCase().startsWith('pt'));
      if (v) u.voice = v;
      u.rate = 0.9; u.pitch = 1.1;
      u.onend = u.onerror = () => { if (gen === cur) onEnd(); };
      syn.speak(u);
    },
    cancel() { gen++; syn?.cancel(); },
    dispose() { gen++; syn?.removeEventListener('voiceschanged', load); syn?.cancel(); },
  };
}
