// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { registerSW } from 'virtual:pwa-register';

const listeners = new Set<() => void>();
let registered = false;

/** The browser registration is shared by all mounts, including StrictMode remounts. */
export function subscribeToOfflineReady(listener: () => void): () => void {
  listeners.add(listener);
  if (!registered && import.meta.env.PROD && 'serviceWorker' in navigator) {
    registered = true;
    registerSW({ onOfflineReady: () => listeners.forEach(notify => notify()) });
  }
  return () => { listeners.delete(listener); };
}
