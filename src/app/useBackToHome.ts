// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

/**
 * Botão voltar do sistema (Android/navegador) sem roteador.
 *
 * - ao sair do início (`away` passa a `true`), empilha UMA entrada de
 *   histórico marcada; trocas entre telas "fora do início" (jogo -> resultado
 *   -> jogo) não empilham mais nada;
 * - `popstate` com o app fora do início chama `onHome` (volta ao início em
 *   vez de sair do app);
 * - `goHome()` (botões "Início"/"Voltar" do app) volta ao início na hora e
 *   consome a entrada empilhada com `history.back()`, para que o próximo
 *   voltar do sistema saia do app como esperado. O `popstate` gerado por esse
 *   `back()` encontra o app já no início e é ignorado;
 * - entrada marcada encontrada com o app no início (recarga numa tela
 *   interna, botão avançar) é desmarcada com `replaceState`.
 */

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

/** Chave do objeto `history.state` usada pelo app. */
export const HISTORY_STATE_KEY = 'relogioMaluco';

const AWAY = 'away';

function isAwayEntry(state: unknown): boolean {
  return typeof state === 'object' && state !== null && (state as Record<string, unknown>)[HISTORY_STATE_KEY] === AWAY;
}

function unmark(): void {
  const state: unknown = window.history.state;
  if (!isAwayEntry(state)) return;
  const rest = { ...(state as Record<string, unknown>) };
  delete rest[HISTORY_STATE_KEY];
  window.history.replaceState(Object.keys(rest).length === 0 ? null : rest, '');
}

export interface BackToHomeApi {
  /** Rota interna de volta ao início (sempre use esta, não `onHome` direto). */
  goHome(): void;
}

/**
 * @param away a tela atual não é o início.
 * @param onHome muda a tela para o início (e cancela a fala etc.).
 */
export function useBackToHome(away: boolean, onHome: () => void): BackToHomeApi {
  /** Espelho síncrono de `away` (atualizado também por `goHome`, antes do render). */
  const awayRef = useRef(away);
  /** Esta sessão empilhou a entrada marcada atual. */
  const pushedRef = useRef(false);
  /** Última `onHome` (chamada por `popstate` e por `goHome`). */
  const onHomeRef = useRef(onHome);
  useLayoutEffect(() => {
    onHomeRef.current = onHome;
  });

  useEffect(() => {
    awayRef.current = away;
    if (away) {
      if (!isAwayEntry(window.history.state)) {
        const base: unknown = window.history.state;
        const extra = typeof base === 'object' && base !== null ? (base as Record<string, unknown>) : {};
        window.history.pushState({ ...extra, [HISTORY_STATE_KEY]: AWAY }, '');
        pushedRef.current = true;
      }
    } else {
      unmark();
      pushedRef.current = false;
    }
  }, [away]);

  useEffect(() => {
    const onPop = (event: PopStateEvent): void => {
      if (awayRef.current) {
        awayRef.current = false;
        pushedRef.current = false;
        onHomeRef.current();
        return;
      }
      if (isAwayEntry(event.state)) unmark();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const goHome = useCallback(() => {
    const consume = awayRef.current && pushedRef.current && isAwayEntry(window.history.state);
    awayRef.current = false;
    pushedRef.current = false;
    onHomeRef.current();
    if (consume) window.history.back();
  }, []);

  return { goHome };
}
