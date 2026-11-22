// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { StrictMode } from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePwaInstall } from '../usePwaInstall';

const subscription = vi.hoisted(() => ({ callback: undefined as (() => void) | undefined, unsubscribe: vi.fn() }));
vi.mock('../pwaRegistration', () => ({
  subscribeToOfflineReady: (callback: () => void) => {
    subscription.callback = callback;
    return subscription.unsubscribe;
  },
}));

let sw: EventTarget & { controller: { scriptURL: string } | null };
let match: ReturnType<typeof vi.fn>;
let keys: ReturnType<typeof vi.fn>;
let media: EventTarget & { matches: boolean };

beforeEach(() => {
  media = Object.assign(new EventTarget(), { matches: false });
  vi.stubGlobal('matchMedia', vi.fn(() => media));
  sw = Object.assign(new EventTarget(), { controller: { scriptURL: new URL('sw.js', document.baseURI).href } });
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: sw });
  Object.defineProperty(navigator, 'standalone', { configurable: true, value: false });
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Version/17.0 Mobile Safari/604.1' });
  match = vi.fn().mockResolvedValue(new Response('cached'));
  keys = vi.fn().mockResolvedValue(['workbox-precache-v2-test']);
  vi.stubGlobal('caches', { keys, open: vi.fn().mockResolvedValue({ match }) });
  subscription.unsubscribe.mockClear();
});

afterEach(() => {
  cleanup();
  delete (navigator as unknown as { serviceWorker?: unknown }).serviceWorker;
  delete (navigator as unknown as { standalone?: unknown }).standalone;
  delete (navigator as unknown as { userAgent?: unknown }).userAgent;
  vi.unstubAllGlobals();
});

describe('usePwaInstall', () => {
  it('validates the controller, index entry and absence of legacy cache', async () => {
    const h = renderHook(() => usePwaInstall());
    await waitFor(() => expect(h.result.current.offlineReady).toBe(true));
    expect(match).toHaveBeenCalledWith(new URL('index.html', document.baseURI).href, { ignoreSearch: true });
    keys.mockResolvedValue(['workbox-precache-v2-test', 'relogio-maluco-v6']);
    act(() => sw.dispatchEvent(new Event('controllerchange')));
    await waitFor(() => expect(h.result.current.offlineReady).toBe(false));
    keys.mockResolvedValue(['workbox-precache-v2-test']);
    match.mockResolvedValue(undefined);
    act(() => subscription.callback?.());
    await waitFor(() => expect(match).toHaveBeenCalledTimes(2));
    expect(h.result.current.offlineReady).toBe(false);
    sw.controller = { scriptURL: new URL('old-sw.js', document.baseURI).href };
    match.mockResolvedValue(new Response('cached'));
    act(() => sw.dispatchEvent(new Event('controllerchange')));
    await waitFor(() => expect(h.result.current.offlineReady).toBe(false));
  });

  it('shows the iOS Safari tip when navigator.standalone is explicitly false', () => {
    const h = renderHook(() => usePwaInstall());
    expect(h.result.current.isStandalone).toBe(false);
    expect(h.result.current.showIosInstallTip).toBe(true);
    act(() => { media.matches = true; media.dispatchEvent(new Event('change')); });
    expect(h.result.current.isStandalone).toBe(true);
    expect(h.result.current.showIosInstallTip).toBe(false);
  });

  it('captures and consumes the install prompt once, including concurrent calls', async () => {
    const h = renderHook(() => usePwaInstall());
    const prompt = vi.fn().mockResolvedValue(undefined);
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt, userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    });
    act(() => window.dispatchEvent(event));
    expect(event.defaultPrevented).toBe(true);
    expect(h.result.current.canInstall).toBe(true);
    expect(h.result.current.showIosInstallTip).toBe(false);
    let outcomes: string[] = [];
    await act(async () => { outcomes = await Promise.all([h.result.current.install(), h.result.current.install()]); });
    expect(outcomes).toEqual(['accepted', 'unavailable']);
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(h.result.current.canInstall).toBe(false);
    act(() => window.dispatchEvent(new Event('appinstalled')));
    expect(h.result.current.isStandalone).toBe(true);
  });

  it('removes its listeners and offline subscription on unmount under StrictMode', () => {
    const add = vi.spyOn(sw, 'addEventListener');
    const remove = vi.spyOn(sw, 'removeEventListener');
    const mediaAdd = vi.spyOn(media, 'addEventListener');
    const mediaRemove = vi.spyOn(media, 'removeEventListener');
    const h = renderHook(() => usePwaInstall(), { wrapper: StrictMode });
    expect(add).toHaveBeenCalledTimes(2);
    expect(remove).toHaveBeenCalledTimes(1);
    h.unmount();
    expect(remove).toHaveBeenCalledTimes(2);
    expect(remove.mock.calls[1]?.[1]).toBe(add.mock.calls[1]?.[1]);
    expect(mediaRemove).toHaveBeenCalledTimes(2);
    expect(mediaRemove.mock.calls[1]?.[1]).toBe(mediaAdd.mock.calls[1]?.[1]);
    expect(subscription.unsubscribe).toHaveBeenCalledTimes(2);
  });
});
