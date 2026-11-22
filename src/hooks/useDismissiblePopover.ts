// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

export interface DismissiblePopoverApi<C extends HTMLElement> {
  readonly open: boolean;
  readonly setOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
  readonly containerRef: RefObject<C | null>;
  readonly triggerRef: RefObject<HTMLButtonElement | null>;
  readonly panelRef: RefObject<HTMLDivElement | null>;
  readonly close: (restoreFocus: boolean) => void;
}

export function useDismissiblePopover<C extends HTMLElement>(): DismissiblePopoverApi<C> {
  const containerRef = useRef<C>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    try {
      panelRef.current?.hidePopover?.();
    } catch {
      // Ignora caso não esteja aberto na top-layer nativa.
    }
    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && containerRef.current && !containerRef.current.contains(target)) {
        close(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close(true);
      }
    };
    document.addEventListener('click', handleOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, close]);

  return { open, setOpen, containerRef, triggerRef, panelRef, close };
}
