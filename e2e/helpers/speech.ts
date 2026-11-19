// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import type { Page } from '@playwright/test';

export interface SpeechProbeSnapshot {
  readonly cancelCount: number;
  readonly speakCount: number;
  readonly lastText: string | null;
  readonly speaking: boolean;
}

declare global {
  interface Window {
    __speechProbe?: {
      cancelCount: number;
      speakCount: number;
      lastText: string | null;
      speaking: boolean;
    };
  }
}

/** Instala um `speechSynthesis` instrumentado antes de qualquer script da página. */
export async function installSpeechProbe(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const probe = {
      cancelCount: 0,
      speakCount: 0,
      lastText: null as string | null,
      speaking: false,
    };
    window.__speechProbe = probe;

    const utteranceListeners = new WeakMap<SpeechSynthesisUtterance, { end?: () => void }>();

    class FakeUtterance {
      text: string;
      lang = 'pt-BR';
      rate = 1;
      pitch = 1;
      volume = 1;
      onend: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => void) | null = null;
      onerror: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisErrorEvent) => void) | null = null;
      onstart: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => void) | null = null;
      constructor(text?: string) {
        this.text = text ?? '';
      }
      addEventListener() {
        /* no-op for probe */
      }
      removeEventListener() {
        /* no-op */
      }
      dispatchEvent() {
        return false;
      }
    }

    const synthesis = {
      pending: false,
      paused: false,
      get speaking() {
        return probe.speaking;
      },
      getVoices() {
        return [] as SpeechSynthesisVoice[];
      },
      speak(utterance: SpeechSynthesisUtterance) {
        probe.speakCount += 1;
        probe.lastText = utterance.text;
        probe.speaking = true;
        utteranceListeners.set(utterance, {});
        queueMicrotask(() => {
          utterance.onstart?.(new Event('start') as SpeechSynthesisEvent);
        });
      },
      cancel() {
        probe.cancelCount += 1;
        probe.speaking = false;
      },
      pause() {
        /* no-op */
      },
      resume() {
        /* no-op */
      },
      addEventListener() {
        /* no-op */
      },
      removeEventListener() {
        /* no-op */
      },
      dispatchEvent() {
        return false;
      },
    };

    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      writable: true,
      value: FakeUtterance,
    });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      writable: true,
      value: synthesis,
    });
  });
}

export async function readSpeechProbe(page: Page): Promise<SpeechProbeSnapshot> {
  return page.evaluate(() => {
    const probe = window.__speechProbe;
    if (!probe) {
      return { cancelCount: 0, speakCount: 0, lastText: null, speaking: false };
    }
    return {
      cancelCount: probe.cancelCount,
      speakCount: probe.speakCount,
      lastText: probe.lastText,
      speaking: probe.speaking,
    };
  });
}

/** Dispara fala via API da página (botão Ouvir) e confirma que o probe registrou. */
export async function expectSpeakingAfterListen(page: Page, listenButton: import('@playwright/test').Locator): Promise<void> {
  const before = await readSpeechProbe(page);
  await listenButton.click();
  await page.waitForFunction(
    (prev) => (window.__speechProbe?.speakCount ?? 0) > prev,
    before.speakCount,
  );
}
