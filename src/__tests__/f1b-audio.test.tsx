// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { act, fireEvent, render, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSpeech } from '../hooks/useSpeech';
import { useSound } from '../hooks/useSound';
import { useModalDialog } from '../hooks/useModalDialog';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('audio hooks', () => {
  it('handles a rejected audio resume', async () => {
    const resume = vi.fn().mockRejectedValue(new Error('locked'));
    class FakeAudio { state = 'suspended'; resume = resume; }
    vi.stubGlobal('AudioContext', FakeAudio);
    const { result } = renderHook(() => useSound());
    expect(() => result.current.unlock()).not.toThrow();
    await act(async () => { await Promise.resolve(); });
    expect(resume).toHaveBeenCalled();
  });

  it('cancels speech on page hide, hidden document and unmount, removing its voice listener', () => {
    const cancel = vi.fn();
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    vi.stubGlobal('speechSynthesis', { cancel, addEventListener, removeEventListener, getVoices: () => [] });
    vi.stubGlobal('SpeechSynthesisUtterance', class {});
    const { unmount } = renderHook(() => useSpeech());
    expect(addEventListener).toHaveBeenCalledWith('voiceschanged', expect.any(Function));
    act(() => window.dispatchEvent(new Event('pagehide')));
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    unmount();
    expect(cancel).toHaveBeenCalledTimes(3);
    expect(removeEventListener).toHaveBeenCalledWith('voiceschanged', expect.any(Function));
  });
});

describe('modal dialog', () => {
  it('requires both pointer events outside to close', () => {
    const close = vi.fn();
    function Example() {
      const ref = useModalDialog(false, close);
      return <dialog ref={ref} aria-label="Teste" />;
    }
    const { getByRole } = render(<Example />);
    const dialog = getByRole('dialog', { hidden: true });
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({ left: 0, right: 100, top: 0, bottom: 100 } as DOMRect);
    fireEvent.pointerDown(dialog, { clientX: 50, clientY: 50 });
    fireEvent.pointerUp(dialog, { clientX: 150, clientY: 150 });
    expect(close).not.toHaveBeenCalled();
    fireEvent.pointerDown(dialog, { clientX: 150, clientY: 150 });
    fireEvent.pointerUp(dialog, { clientX: 150, clientY: 150 });
    expect(close).toHaveBeenCalledTimes(1);
  });
});
