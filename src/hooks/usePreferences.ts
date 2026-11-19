// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

/**
 * `usePreferences()` (contrato `PreferencesApi`, ADR-002 §5).
 *
 * - leitura por `useSyncExternalStore` sobre o store síncrono de
 *   `storage/preferencesStore` (snapshot estável: só re-renderiza quando
 *   preferências ou `persistent` mudam de fato);
 * - cada setter é uma operação do store (releitura imediata do
 *   `localStorage` + aplicação + gravação), best-effort e sem atomicidade
 *   entre abas;
 * - ao voltar para a aba (`visibilitychange` visível, `focus` ou `pageshow`
 *   de bfcache) o store é relido com `refresh()`: cobre eventos `storage`
 *   perdidos enquanto a aba estava congelada e grava operações que ficaram
 *   pendentes por falha de armazenamento.
 */

import { useEffect, useMemo, useSyncExternalStore } from 'react';

import type { PreferencesApi } from '../contracts';
import { preferencesStore } from '../storage/preferencesStore';
import type { PreferencesStore } from '../storage/preferencesStore';

/** Liga `refresh()` aos sinais de "a aba voltou a ficar ativa". */
function subscribeRefresh(store: Pick<PreferencesStore, 'refresh'>): () => void {
  if (typeof window === 'undefined') return () => {};
  const refresh = (): void => store.refresh();
  const onVisibility = (): void => {
    if (document.visibilityState === 'visible') refresh();
  };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('focus', refresh);
  window.addEventListener('pageshow', refresh);
  return () => {
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('focus', refresh);
    window.removeEventListener('pageshow', refresh);
  };
}

/**
 * @param store injetável em testes; padrão: o store único da aplicação.
 *   Deve ser estável entre renderizações.
 */
export function usePreferences(store: PreferencesStore = preferencesStore): PreferencesApi {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  useEffect(() => subscribeRefresh(store), [store]);

  const actions = useMemo(
    () => ({
      setLevel: store.setLevel,
      setSound: store.setSound,
      setVoice: store.setVoice,
      recordStars: store.recordStars,
      resetStars: store.resetStars,
    }),
    [store],
  );

  return useMemo(
    () => ({ prefs: snapshot.prefs, persistent: snapshot.persistent, ...actions }),
    [snapshot, actions],
  );
}
