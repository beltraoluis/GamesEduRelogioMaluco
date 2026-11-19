// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { useEffect, useRef } from 'react';
import { SLOT_ID_ATTRIBUTE } from '../../contracts';
import type { SlotProps } from '../../contracts';
import styles from './Slot.module.css';
export function Slot({ slot, filledWith, over, glowSeq = 0 }: SlotProps) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => { if (!glowSeq || !ref.current?.animate) return; const anim = ref.current.animate([{ opacity: 1 }, { opacity: 0.5 }, { opacity: 1 }], { duration: 600 }); void anim.finished.catch(() => {}); return () => anim.cancel(); }, [glowSeq]);
  return <span ref={ref} {...{ [SLOT_ID_ATTRIBUTE]: slot.id }} data-filled={filledWith === null ? undefined : ''} data-over={over ? '' : undefined} data-group={slot.group} className={styles.slot} aria-label={`${slot.label}: ${filledWith ?? 'vazia'}`} role="img"><span aria-hidden="true">{filledWith ?? '\u00a0'}</span></span>;
}
