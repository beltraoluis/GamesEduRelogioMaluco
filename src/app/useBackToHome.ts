// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

export const HISTORY_STATE_KEY = 'relogioMaluco';
const AWAY = 'away';

function isAwayEntry(state: unknown): boolean {
  return (
    typeof state === 'object' &&
    state !== null &&
    (state as Record<string, unknown>)[HISTORY_STATE_KEY] === AWAY
  );
}

function pushAwayEntry(): void {
  const base: unknown = window.history.state;
  const extra = typeof base === 'object' && base !== null ? (base as Record<string, unknown>) : {};
  window.history.pushState({ ...extra, [HISTORY_STATE_KEY]: AWAY }, '');
}

function unmark(): void {
  const state: unknown = window.history.state;
  if (!isAwayEntry(state)) return;
  const rest = { ...(state as Record<string, unknown>) };
  delete rest[HISTORY_STATE_KEY];
  window.history.replaceState(Object.keys(rest).length === 0 ? null : rest, '');
}

export interface BackToHomeApi {
  goHome(): void;
}

export function useBackToHome(away: boolean, onHome: () => void): BackToHomeApi {
  const awayRef = useRef(away);
  const pushedRef = useRef(false);
  const onHomeRef = useRef(onHome);
  const backPendingRef = useRef(false);
  useLayoutEffect(() => {
    onHomeRef.current = onHome;
  });

  const push = useCallback((): void => {
    pushAwayEntry();
    pushedRef.current = true;
  }, []);

  useLayoutEffect(() => {
    awayRef.current = away;
    if (away) {
      if (!backPendingRef.current && !isAwayEntry(window.history.state)) push();
    } else {
      unmark();
      pushedRef.current = false;
    }
  }, [away, push]);

  useEffect(() => {
    const onPop = (event: PopStateEvent): void => {
      if (backPendingRef.current) {
        backPendingRef.current = false;
        if (awayRef.current && !isAwayEntry(window.history.state)) push();
        return;
      }
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
  }, [push]);

  const goHome = useCallback(() => {
    const consume = awayRef.current && pushedRef.current && isAwayEntry(window.history.state);
    awayRef.current = false;
    pushedRef.current = false;
    onHomeRef.current();
    if (consume) {
      backPendingRef.current = true;
      window.history.back();
    }
  }, []);

  return { goHome };
}
