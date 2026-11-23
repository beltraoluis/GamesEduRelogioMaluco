// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { useSyncExternalStore } from 'react';

const query = '(prefers-reduced-motion: reduce)';
function subscribe(callback: () => void): () => void {
  const media = window.matchMedia(query);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}
function snapshot(): boolean { return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches; }
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? subscribe : () => () => {}, snapshot, () => false);
}
