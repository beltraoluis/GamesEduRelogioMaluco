// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { useCallback, useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
import type { PwaApi, InstallOutcome } from '@/contracts';

interface InstallEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

async function hasOfflineCache(): Promise<boolean> {
  if (!('caches' in window) || !('serviceWorker' in navigator)) return false;
  const controller = navigator.serviceWorker.controller;
  if (!controller || new URL(controller.scriptURL).pathname !== new URL('sw.js', document.baseURI).pathname) return false;
  try {
    const keys = await caches.keys();
    if (keys.some(key => /^relogio-maluco-v\d+$/.test(key))) return false;
    for (const key of keys.filter(key => key.startsWith('workbox-precache-v2-'))) {
      const cache = await caches.open(key);
      if (await cache.match(new URL('index.html', document.baseURI).href, { ignoreSearch: true })) return true;
    }
  } catch { /* Cache Storage may be unavailable. */ }
  return false;
}

export function usePwaInstall(): PwaApi {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [isStandalone, setStandalone] = useState(standalone);
  const [online, setOnline] = useState(navigator.onLine);
  const [offlineReady, setOfflineReady] = useState(false);
  useEffect(() => {
    let active = true;
    const validate = () => { void hasOfflineCache().then(value => { if (active) setOfflineReady(value); }); };
    const capture = (event: Event) => { event.preventDefault(); setPrompt(event as InstallEvent); };
    const installed = () => { setPrompt(null); setStandalone(true); };
    const connectivity = () => setOnline(navigator.onLine);
    const media = window.matchMedia('(display-mode: standalone)');
    const modeChanged = () => setStandalone(standalone());
    window.addEventListener('beforeinstallprompt', capture);
    window.addEventListener('appinstalled', installed);
    window.addEventListener('online', connectivity); window.addEventListener('offline', connectivity);
    media.addEventListener('change', modeChanged);
    navigator.serviceWorker?.addEventListener('controllerchange', validate);
    if (import.meta.env.PROD && 'serviceWorker' in navigator) registerSW({ onOfflineReady: validate });
    validate();
    return () => { active = false; window.removeEventListener('beforeinstallprompt', capture); window.removeEventListener('appinstalled', installed); window.removeEventListener('online', connectivity); window.removeEventListener('offline', connectivity); media.removeEventListener('change', modeChanged); navigator.serviceWorker?.removeEventListener('controllerchange', validate); };
  }, []);
  const install = useCallback(async (): Promise<InstallOutcome> => {
    if (!prompt || isStandalone) return 'unavailable';
    setPrompt(null);
    try { await prompt.prompt(); return (await prompt.userChoice).outcome; } catch { return 'unavailable'; }
  }, [prompt, isStandalone]);
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const safari = /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent);
  return { canInstall: !!prompt && !isStandalone, install, isStandalone, online, offlineReady, showIosInstallTip: ios && safari && !isStandalone && !prompt };
}
