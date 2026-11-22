// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { afterEach, expect, it, vi } from 'vitest';
import { registerPwa, subscribeToOfflineReady } from '../pwaRegistration';

afterEach(() => {
  delete (navigator as unknown as { serviceWorker?: unknown }).serviceWorker;
  vi.unstubAllEnvs();
});

it('registers once across remounts and only notifies active subscribers on activation', async () => {
  vi.stubEnv('PROD', true);
  let stateChangeHandler: (() => void) | undefined;
  const installingWorker = {
    state: 'installing',
    addEventListener: vi.fn((event: string, cb: () => void) => {
      if (event === 'statechange') stateChangeHandler = cb;
    }),
  };
  const registration = {
    active: null,
    installing: installingWorker,
    waiting: null,
    addEventListener: vi.fn(),
  };
  const registerMock = vi.fn(() => Promise.resolve(registration));
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { register: registerMock },
  });

  const first = vi.fn();
  const second = vi.fn();

  registerPwa();
  registerPwa();

  const unsubscribeFirst = subscribeToOfflineReady(first);
  unsubscribeFirst();
  const unsubscribeSecond = subscribeToOfflineReady(second);

  expect(registerMock).toHaveBeenCalledTimes(1);
  await Promise.resolve();

  installingWorker.state = 'activated';
  stateChangeHandler?.();

  expect(first).not.toHaveBeenCalled();
  expect(second).toHaveBeenCalledTimes(1);

  unsubscribeSecond();
  stateChangeHandler?.();
  expect(second).toHaveBeenCalledTimes(1);
});
