// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { afterEach, expect, it, vi } from 'vitest';
import { registerPwa, subscribeToOfflineReady } from '../pwaRegistration';

const register = vi.hoisted(() => vi.fn());
vi.mock('virtual:pwa-register', () => ({ registerSW: register }));

afterEach(() => {
  delete (navigator as unknown as { serviceWorker?: unknown }).serviceWorker;
  vi.unstubAllEnvs();
  vi.resetModules();
  register.mockReset();
});

it('registers once across remounts and only notifies active subscribers', () => {
  vi.stubEnv('PROD', true);
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: {} });
  const first = vi.fn();
  const second = vi.fn();
  registerPwa();
  registerPwa();
  const unsubscribeFirst = subscribeToOfflineReady(first);
  unsubscribeFirst();
  const unsubscribeSecond = subscribeToOfflineReady(second);
  expect(register).toHaveBeenCalledTimes(1);
  const options = register.mock.calls[0]?.[0] as { onOfflineReady: () => void; onNeedReload: () => void };
  expect(options.onNeedReload).toBeTypeOf('function');
  expect(() => options.onNeedReload()).not.toThrow();
  options.onOfflineReady();
  expect(first).not.toHaveBeenCalled();
  expect(second).toHaveBeenCalledTimes(1);
  unsubscribeSecond();
  options.onOfflineReady();
  expect(second).toHaveBeenCalledTimes(1);
});
