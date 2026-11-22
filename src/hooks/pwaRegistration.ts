// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { registerSW } from 'virtual:pwa-register';

const listeners = new Set<() => void>();
let registered = false;

/** Register once at boot, independent of UI mounts and StrictMode. */
export function registerPwa(): void {
  if (!registered && import.meta.env.PROD && 'serviceWorker' in navigator) {
    registered = true;
    registerSW({
      onOfflineReady: () => listeners.forEach(notify => notify()),
      // The plugin otherwise reloads after a waiting worker takes control.
      onNeedReload: () => {},
    });
  }
}

/** Late subscribers validate existing caches on mount in usePwaInstall. */
export function subscribeToOfflineReady(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
