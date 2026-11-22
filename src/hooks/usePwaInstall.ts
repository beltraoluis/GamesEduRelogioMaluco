// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { useCallback, useEffect, useRef, useState } from 'react';

import type { InstallOutcome, PwaApi } from '@/contracts';

import { subscribeToOfflineReady } from './pwaRegistration';

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const standalone = (): boolean =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

async function hasOfflineCache(): Promise<boolean> {
  const sw = navigator.serviceWorker?.controller;
  if (
    !('caches' in window) ||
    !sw ||
    new URL(sw.scriptURL).pathname !== new URL('sw.js', document.baseURI).pathname
  ) {
    return false;
  }
  try {
    const keys = await caches.keys();
    if (keys.some((k) => /^relogio-maluco-v\d+$/.test(k))) return false;
    const indexUrl = new URL('index.html', document.baseURI).href;
    for (const k of keys) {
      if (
        k.startsWith('workbox-precache-v2-') &&
        (await (await caches.open(k)).match(indexUrl, { ignoreSearch: true }))
      ) {
        return true;
      }
    }
  } catch { /* ignore */ }
  return false;
}

export function usePwaInstall(): PwaApi {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const promptRef = useRef<InstallEvent | null>(null);
  const [isStandalone, setStandalone] = useState(standalone);
  const [online, setOnline] = useState(navigator.onLine);
  const [offlineReady, setOfflineReady] = useState(false);

  useEffect(() => {
    let active = true;
    let gen = 0;
    const validate = () => {
      const cur = ++gen;
      void hasOfflineCache().then((v) => {
        if (active && cur === gen) setOfflineReady(v);
      });
    };
    const capture = (e: Event) => {
      e.preventDefault();
      promptRef.current = e as InstallEvent;
      setPrompt(promptRef.current);
    };
    const installed = () => {
      promptRef.current = null;
      setPrompt(null);
      setStandalone(true);
    };
    const conn = () => setOnline(navigator.onLine);
    const media = window.matchMedia('(display-mode: standalone)');
    const modeChanged = () => setStandalone(standalone());
    const sw = navigator.serviceWorker;

    window.addEventListener('beforeinstallprompt', capture);
    window.addEventListener('appinstalled', installed);
    window.addEventListener('online', conn);
    window.addEventListener('offline', conn);
    media.addEventListener('change', modeChanged);
    sw?.addEventListener('controllerchange', validate);
    const unsub = subscribeToOfflineReady(validate);
    validate();

    return () => {
      active = false;
      unsub();
      window.removeEventListener('beforeinstallprompt', capture);
      window.removeEventListener('appinstalled', installed);
      window.removeEventListener('online', conn);
      window.removeEventListener('offline', conn);
      media.removeEventListener('change', modeChanged);
      sw?.removeEventListener('controllerchange', validate);
    };
  }, []);

  const install = useCallback(async (): Promise<InstallOutcome> => {
    const e = promptRef.current;
    if (!e || isStandalone) return 'unavailable';
    promptRef.current = null;
    setPrompt(null);
    try {
      await e.prompt();
      return (await e.userChoice).outcome;
    } catch {
      return 'unavailable';
    }
  }, [isStandalone]);

  const ua = navigator.userAgent;
  const ios =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return {
    canInstall: !!prompt && !isStandalone,
    install,
    isStandalone,
    online,
    offlineReady,
    showIosInstallTip: ios && safari && !isStandalone && !prompt,
  };
}
