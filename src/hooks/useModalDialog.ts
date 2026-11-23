// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

export function useModalDialog(open: boolean, onClose: () => void): RefObject<HTMLDialogElement | null> {
  const ref = useRef<HTMLDialogElement>(null);
  const controlledClose = useRef(false);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.setAttribute('closedby', 'any');
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) { controlledClose.current = true; dialog.close(); }
  }, [open]);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    let downOutside = false;
    const outside = (event: PointerEvent) => {
      const rect = dialog.getBoundingClientRect();
      return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
    };
    const down = (event: PointerEvent) => { downOutside = outside(event); };
    const up = (event: PointerEvent) => { if (!('closedBy' in dialog) && downOutside && outside(event)) onClose(); downOutside = false; };
    const close = () => { if (controlledClose.current) controlledClose.current = false; else onClose(); };
    dialog.addEventListener('pointerdown', down);
    dialog.addEventListener('pointerup', up);
    dialog.addEventListener('close', close);
    return () => { dialog.removeEventListener('pointerdown', down); dialog.removeEventListener('pointerup', up); dialog.removeEventListener('close', close); };
  }, [onClose]);
  return ref;
}
