// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SpeechApi, Message } from '../contracts';
import { toPlainText } from '../domain/messages';
import { createSpeechEngine } from '../audio/speechEngine';

export function useSpeech(enabled = true): SpeechApi {
  const [speaking, setSpeaking] = useState(false);
  const engine = useRef<ReturnType<typeof createSpeechEngine> | null>(null);
  const supported = typeof window !== 'undefined' && Boolean(window.speechSynthesis) && typeof SpeechSynthesisUtterance !== 'undefined';
  const cancel = useCallback(() => { engine.current?.cancel(); setSpeaking(false); }, []);
  useEffect(() => {
    const instance = createSpeechEngine();
    engine.current = instance;
    const hidden = () => { if (document.visibilityState === 'hidden') cancel(); };
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('pagehide', cancel);
    return () => { document.removeEventListener('visibilitychange', hidden); window.removeEventListener('pagehide', cancel); instance.dispose(); engine.current = null; };
  }, [cancel]);
  useEffect(() => { if (!enabled) engine.current?.cancel(); }, [enabled]);
  const speak = useCallback((text: string) => {
    if (!enabled || !engine.current?.supported) return;
    setSpeaking(true);
    engine.current.speak(text, () => setSpeaking(false));
  }, [enabled]);
  const speakMessage = useCallback((message: Message) => speak(toPlainText(message)), [speak]);
  return { supported, enabled, speaking: enabled && speaking, speak, speakMessage, cancel };
}
