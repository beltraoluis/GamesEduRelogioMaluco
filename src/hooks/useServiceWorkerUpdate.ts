// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ServiceWorkerUpdateApi } from '@/contracts';

export function useServiceWorkerUpdate(): ServiceWorkerUpdateApi {
  const [updateReady, setUpdateReady] = useState(false);
  const hadControllerRef = useRef(typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller !== null);
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const serviceWorker = navigator.serviceWorker;
    const onChange = () => {
      if (!hadControllerRef.current) { hadControllerRef.current = true; return; }
      setUpdateReady(true);
    };
    serviceWorker.addEventListener('controllerchange', onChange);
    return () => serviceWorker.removeEventListener('controllerchange', onChange);
  }, []);
  const applyUpdate = useCallback(() => window.location.reload(), []);
  const dismissToast = useCallback(() => setUpdateReady(false), []);
  return { updateReady, applyUpdate, dismissToast };
}
