// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { StrictMode } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useServiceWorkerUpdate } from '../useServiceWorkerUpdate';

let reload: ReturnType<typeof vi.fn>;

beforeEach(() => {
  reload = vi.fn();
  const testWindow = Object.create(window) as Window;
  Object.defineProperty(testWindow, 'location', { value: { reload } });
  vi.stubGlobal('window', testWindow);
});

afterEach(() => {
  cleanup();
  delete (navigator as unknown as { serviceWorker?: unknown }).serviceWorker;
  vi.unstubAllGlobals();
});

function setup(controlled: boolean, strict = false) {
  const sw = new EventTarget() as EventTarget & { controller: object | null };
  sw.controller = controlled ? {} : null;
  const add = vi.spyOn(sw, 'addEventListener');
  const remove = vi.spyOn(sw, 'removeEventListener');
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: sw });
  const hook = renderHook(() => useServiceWorkerUpdate(), strict ? { wrapper: StrictMode } : undefined);
  const change = () => act(() => { sw.dispatchEvent(new Event('controllerchange')); });
  return { ...hook, change, add, remove };
}

describe('ADR-003: service worker updates', () => {
  it('1: suppresses the first controller acquisition without reload', () => {
    const h = setup(false);
    h.change();
    expect(h.result.current.updateReady).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it('2: detects a later controller in the same tab without reload', () => {
    const h = setup(false);
    h.change();
    h.change();
    expect(h.result.current.updateReady).toBe(true);
    expect(reload).not.toHaveBeenCalled();
  });

  it('3: detects a controller change in an already controlled tab without reload', () => {
    const h = setup(true);
    h.change();
    expect(h.result.current.updateReady).toBe(true);
    expect(reload).not.toHaveBeenCalled();
  });

  it('4: dismisses repeated updates until a new controller arrives', () => {
    const h = setup(true);
    h.change();
    h.change();
    expect(h.result.current.updateReady).toBe(true);
    act(() => h.result.current.dismissToast());
    expect(h.result.current.updateReady).toBe(false);
    h.change();
    expect(h.result.current.updateReady).toBe(true);
    expect(reload).not.toHaveBeenCalled();
  });

  it('5: reloads exactly once per explicit apply', () => {
    const h = setup(true);
    h.change();
    expect(reload).not.toHaveBeenCalled();
    act(() => h.result.current.applyUpdate());
    expect(reload).toHaveBeenCalledTimes(1);
    act(() => h.result.current.applyUpdate());
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('7: StrictMode retains one effective listener and cleans it up', () => {
    const h = setup(false, true);
    expect(h.add).toHaveBeenCalledTimes(2);
    expect(h.remove).toHaveBeenCalledTimes(1);
    expect(h.remove.mock.calls[0]?.[1]).toBe(h.add.mock.calls[0]?.[1]);
    h.change();
    expect(h.result.current.updateReady).toBe(false);
    h.change();
    expect(h.result.current.updateReady).toBe(true);
    expect(reload).not.toHaveBeenCalled();
    h.unmount();
    expect(h.remove).toHaveBeenCalledTimes(2);
    expect(h.remove.mock.calls[1]?.[1]).toBe(h.add.mock.calls[1]?.[1]);
  });
});
