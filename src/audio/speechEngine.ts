// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

export function createSpeechEngine() {
  const synthesis = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
  let voices: SpeechSynthesisVoice[] = [];
  let generation = 0;
  const loadVoices = () => { voices = synthesis?.getVoices() ?? []; };
  loadVoices();
  synthesis?.addEventListener('voiceschanged', loadVoices);
  return {
    supported: Boolean(synthesis && typeof SpeechSynthesisUtterance !== 'undefined'),
    speak(text: string, onEnd: () => void) {
      if (!synthesis || typeof SpeechSynthesisUtterance === 'undefined') return;
      const current = ++generation;
      synthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      const voice = voices.find(v => v.lang.toLowerCase().replace('_', '-') === 'pt-br') ?? voices.find(v => v.lang.toLowerCase().startsWith('pt'));
      if (voice) utterance.voice = voice;
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      const finish = () => { if (generation === current) onEnd(); };
      utterance.onend = finish;
      utterance.onerror = finish;
      synthesis.speak(utterance);
    },
    cancel() { generation++; synthesis?.cancel(); },
    dispose() { generation++; synthesis?.removeEventListener('voiceschanged', loadVoices); synthesis?.cancel(); },
  };
}
