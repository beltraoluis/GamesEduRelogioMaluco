// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSpeech } from '../useSpeech';
import { useSound } from '../useSound';
import * as engine from '../../audio/sfxEngine';
import { createSpeechEngine } from '../../audio/speechEngine';
import { usePrefersReducedMotion } from '../usePrefersReducedMotion';
import { msg, t } from '../../domain/messages';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe('sound and speech', () => {
  it('plays all six effects only when enabled', () => {
    const start = vi.fn(), stop = vi.fn();
    class AudioMock {
      state = 'running'; currentTime = 0; destination = {};
      createOscillator() { return { type: '', frequency: { value: 0 }, connect: () => ({ connect: vi.fn() }), start, stop }; }
      createGain() { return { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() } }; }
    }
    vi.stubGlobal('AudioContext', AudioMock);
    for (const name of ['pick', 'drop', 'wrong', 'tick', 'success', 'fanfare'] as const) engine.play(name);
    expect(start).toHaveBeenCalledTimes(17); expect(stop).toHaveBeenCalledTimes(17);
    const { result, rerender } = renderHook(({ enabled }) => useSound(enabled), { initialProps: { enabled: false } });
    result.current.play('pick'); expect(start).toHaveBeenCalledTimes(17);
    rerender({ enabled: true }); result.current.play('pick');
  });
  it('selects Brazilian voice, speaks messages and handles completion', () => {
    const cancel = vi.fn(), speak = vi.fn();
    const voice = { lang: 'pt-BR' };
    vi.stubGlobal('speechSynthesis', { cancel, speak, getVoices: () => [voice], addEventListener: vi.fn(), removeEventListener: vi.fn() });
    class Utterance { text: string; lang = ''; rate = 1; pitch = 1; voice?: unknown; onend?: () => void; onerror?: () => void; constructor(text: string) { this.text = text; } }
    vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
    const { result, rerender, unmount } = renderHook(({ enabled }) => useSpeech(enabled), { initialProps: { enabled: true } });
    act(() => result.current.speakMessage(msg('help.digital.hour', t('Olá'))));
    expect(speak).toHaveBeenCalled(); expect(result.current.speaking).toBe(true);
    const utterance = speak.mock.calls[0]?.[0] as Utterance;
    expect(utterance.voice).toBe(voice); expect(utterance.lang).toBe('pt-BR');
    act(() => utterance.onend?.()); expect(result.current.speaking).toBe(false);
    act(() => result.current.speak('outra')); rerender({ enabled: false });
    expect(result.current.speaking).toBe(false); unmount(); expect(cancel).toHaveBeenCalled();
  });
  it('subscribes to reduced-motion changes and cleans up', () => {
    let listener = () => {}; const remove = vi.fn();
    const media = { matches: true, addEventListener: vi.fn((_type, cb: () => void) => { listener = cb; }), removeEventListener: remove };
    vi.stubGlobal('matchMedia', () => media);
    const { result, unmount } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(true); media.matches = false; act(() => listener()); expect(result.current).toBe(false);
    unmount(); expect(remove).toHaveBeenCalled();
  });
});
it('chooses a Portuguese fallback and ignores callbacks from cancelled speech', () => {
  const speak = vi.fn(), cancel = vi.fn(), listener = vi.fn();
  const voice = { lang: 'pt-PT' };
  vi.stubGlobal('speechSynthesis', { speak, cancel, getVoices: () => [voice], addEventListener: listener, removeEventListener: vi.fn() });
  class Utterance { lang = ''; rate = 1; pitch = 1; voice?: unknown; onend?: () => void; onerror?: () => void; }
  vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
  const engine = createSpeechEngine(), onEnd = vi.fn();
  engine.speak('teste', onEnd); const utterance = speak.mock.calls[0]?.[0] as Utterance;
  expect(utterance.voice).toBe(voice); engine.cancel(); utterance.onerror?.(); expect(onEnd).not.toHaveBeenCalled(); engine.dispose();
});
