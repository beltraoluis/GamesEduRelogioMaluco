// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { StrictMode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useServiceWorkerUpdate } from '../useServiceWorkerUpdate';

function setup(controlled: boolean, strict = false) {
  const sw = new EventTarget() as EventTarget & { controller: object | null };
  sw.controller = controlled ? {} : null;
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: sw });
  const result = renderHook(() => useServiceWorkerUpdate(), strict ? { wrapper: StrictMode } : undefined);
  const change = () => act(() => sw.dispatchEvent(new Event('controllerchange')));
  return { ...result, change, sw };
}
afterEach(() => { delete (navigator as unknown as { serviceWorker?: unknown }).serviceWorker; });
describe('service worker update', () => {
  it('suppresses the initial controller', () => { const h = setup(false); h.change(); expect(h.result.current.updateReady).toBe(false); });
  it('detects the next controller in the same tab', () => { const h = setup(false); h.change(); h.change(); expect(h.result.current.updateReady).toBe(true); });
  it('detects an update in an already controlled tab', () => { const h = setup(true); h.change(); expect(h.result.current.updateReady).toBe(true); });
  it('dismisses until a subsequent update', () => { const h = setup(true); h.change(); h.change(); act(() => h.result.current.dismissToast()); expect(h.result.current.updateReady).toBe(false); h.change(); expect(h.result.current.updateReady).toBe(true); });
  it('does not reload on controller changes', () => { const h = setup(true); h.change(); expect(h.result.current.updateReady).toBe(true); });
  it('preserves the initial suppression under StrictMode', () => { const h = setup(false, true); h.change(); expect(h.result.current.updateReady).toBe(false); h.change(); expect(h.result.current.updateReady).toBe(true); });
  it('removes the listener when unmounted', () => { const h = setup(true); h.unmount(); h.change(); expect(h.result.current.updateReady).toBe(false); });
});
