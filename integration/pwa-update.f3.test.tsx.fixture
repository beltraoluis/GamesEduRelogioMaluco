// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
// F3: copy to src/app/__tests__/pwa-update-integration.test.tsx after composing F2a/F2b/F2c.
import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { App } from '../App';
import { HomeScreen } from '../../screens/HomeScreen';
import { GameScreen } from '../../screens/GameScreen';
import { ExploreScreen } from '../../screens/ExploreScreen';
import { ResultScreen } from '../../screens/ResultScreen';
import { useServiceWorkerUpdate } from '../../hooks/useServiceWorkerUpdate';

const screens = { Home: HomeScreen, Game: GameScreen, Explore: ExploreScreen, Result: ResultScreen };

afterEach(() => {
  cleanup();
  delete (navigator as unknown as { serviceWorker?: unknown }).serviceWorker;
  vi.unstubAllGlobals();
});

it('keeps an update during a real game, shows it only at home, dismisses and reloads by explicit click', async () => {
  const reload = vi.fn();
  const testWindow = Object.create(window) as Window;
  Object.defineProperty(testWindow, 'location', { value: { reload } });
  vi.stubGlobal('window', testWindow);
  const sw = Object.assign(new EventTarget(), { controller: {} });
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: sw });
  render(<StrictMode><App screens={screens} useUpdate={useServiceWorkerUpdate} sourceUrl="https://example.test/tree/abc" /></StrictMode>);
  fireEvent.click(screen.getByRole('button', { name: /números/i }));
  expect(document.querySelector('[data-screen="game"]')).toBeInTheDocument();
  act(() => { sw.dispatchEvent(new Event('controllerchange')); });
  expect(screen.queryByText('Nova versão pronta.')).not.toBeInTheDocument();
  expect(reload).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /voltar ao início/i }));
  expect(await screen.findByText('Nova versão pronta.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Agora não' }));
  expect(screen.queryByText('Nova versão pronta.')).not.toBeInTheDocument();
  expect(reload).not.toHaveBeenCalled();
  act(() => { sw.dispatchEvent(new Event('controllerchange')); });
  fireEvent.click(screen.getByRole('button', { name: 'Atualizar agora' }));
  expect(reload).toHaveBeenCalledTimes(1);
});
