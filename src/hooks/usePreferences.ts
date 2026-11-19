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
 *
 * Comportamento do store que este hook expõe (descrição do aprovado em F1a,
 * sem mudar contratos, formato salvo nem a garantia best-effort do ADR-002 §5;
 * referência para o caso 5 de `docs/qa/edge-cases.md`):
 * - **Operações pendentes:** se a gravação falha (cota, modo privado), a
 *   operação fica em memória; o snapshot mostra a última versão conhecida do
 *   storage mais as operações locais, e `persistent` fica `false`. Na
 *   recuperação (próxima operação ou `refresh()`), as pendentes são gravadas
 *   sobre uma releitura, reconciliadas com o que outras abas gravaram.
 * - **Limite: operações "às cegas".** Feita com a LEITURA também bloqueada, a
 *   operação não sabe o que outras abas gravaram antes; sem relógio nem
 *   versão no formato legado, a ordem em relação a uma mudança externa
 *   descoberta depois é indeterminada. Vale a regra não destrutiva: o
 *   `set-*` local vence e a rodada local é preservada (mesmo que sobreviva um
 *   recorde anterior a um reset não observado). Com leitura OK, o que a
 *   releitura revela aconteceu depois, e a mudança externa vence (inclusive
 *   um reset externo, que descarta as estrelas pendentes).
 * - **Evento `storage` é só um sinal:** `oldValue`/`newValue` e a ordem de
 *   entrega não são usados (o evento pode chegar atrasado); ele só dispara
 *   uma releitura, e o handler nunca grava.
 * - **Sem loop entre abas:** sem pendências, `refresh()` não regrava as
 *   preferências; no máximo testa a gravação numa chave de sonda própria, que
 *   as outras abas ignoram.
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
