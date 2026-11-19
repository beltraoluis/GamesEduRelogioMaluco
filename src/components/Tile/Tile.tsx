// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { useEffect, useRef } from 'react';
import type { TileProps } from '../../contracts';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { useTileDrag } from '../../hooks/useTileDrag';
import styles from './Tile.module.css';
export function Tile({ tile, used, shakeSeq = 0, onDrop, onTap, onPick }: TileProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const reduced = usePrefersReducedMotion();
  const drag = useTileDrag({ tileId: tile.id, group: tile.group, label: tile.value, disabled: used, onDrop, onTap, ...(onPick ? { onPick } : {}) });
  useEffect(() => {
    if (!shakeSeq || !ref.current?.animate) return;
    const frames = reduced ? [{ outline: '2px solid transparent' }, { outline: '4px solid var(--color-minute)' }, { outline: '2px solid transparent' }] : [{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }];
    const anim = ref.current.animate(frames, { duration: 350 }); void anim.finished.catch(() => {}); return () => anim.cancel();
  }, [shakeSeq, reduced]);
  return <button ref={ref} type="button" className={styles.tile} data-group={tile.group} disabled={used} aria-label={`${tile.group === 'hour' ? 'Horas' : tile.group === 'minute' ? 'Minutos' : 'Período'}: ${tile.value}`} {...drag.bind}>{tile.value}</button>;
}
