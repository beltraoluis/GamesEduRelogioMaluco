// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

export function createSpeechEngine() {
  const synthesis = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
  let voices: SpeechSynthesisVoice[] = [];
  const loadVoices = () => { voices = synthesis?.getVoices() ?? []; };
  loadVoices();
  synthesis?.addEventListener('voiceschanged', loadVoices);
  return {
    supported: Boolean(synthesis && typeof SpeechSynthesisUtterance !== 'undefined'),
    speak(text: string, onEnd: () => void) {
      if (!synthesis || typeof SpeechSynthesisUtterance === 'undefined') return;
      synthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      const voice = voices.find(v => v.lang.toLowerCase().replace('_', '-') === 'pt-br') ?? voices.find(v => v.lang.toLowerCase().startsWith('pt'));
      if (voice) utterance.voice = voice;
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      utterance.onend = onEnd;
      utterance.onerror = onEnd;
      synthesis.speak(utterance);
    },
    cancel() { synthesis?.cancel(); },
    dispose() { synthesis?.removeEventListener('voiceschanged', loadVoices); synthesis?.cancel(); },
  };
}
