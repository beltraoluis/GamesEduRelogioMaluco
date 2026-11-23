// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

const listeners = new Set<() => void>();
let registered = false;

function notifyOfflineReady(): void {
  listeners.forEach((notify) => notify());
}

function trackInstallingWorker(worker: ServiceWorker | null): void {
  if (!worker) return;
  worker.addEventListener('statechange', () => {
    if (worker.state === 'activated') {
      notifyOfflineReady();
    }
  });
}

/**
 * Registra o Service Worker uma única vez no boot em produção, sem recarregar
 * automaticamente (a notificação de atualização é feita por `controllerchange`
 * em `useServiceWorkerUpdate`, conforme ADR-003).
 */
export function registerPwa(): void {
  if (registered || !import.meta.env.PROD || !('serviceWorker' in navigator)) {
    return;
  }
  registered = true;
  const baseUrl = import.meta.env.BASE_URL || './';
  void navigator.serviceWorker
    .register(`${baseUrl}sw.js`, { scope: baseUrl })
    .then((registration) => {
      if (registration.active) {
        notifyOfflineReady();
      }
      trackInstallingWorker(registration.installing);
      trackInstallingWorker(registration.waiting);
      registration.addEventListener('updatefound', () => {
        trackInstallingWorker(registration.installing);
      });
    })
    .catch(() => {
      // Falha de registro offline não bloqueia a execução do jogo.
    });
}

/** Late subscribers validate existing caches on mount in usePwaInstall. */
export function subscribeToOfflineReady(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
