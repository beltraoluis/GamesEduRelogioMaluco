// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { createPortal } from 'react-dom';
import type { DragGhost } from '../../contracts';
import { DragLayerContext, useDragLayer } from '../../hooks/useTileDrag';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import styles from './DragLayer.module.css';
export { useDragLayer };
export function DragLayerProvider({ children }: { readonly children: ReactNode }) {
  const [ghost, setGhost] = useState<DragGhost | null>(null);
  const [overSlotId, setOver] = useState<string | null>(null);
  const origin = useRef({ x: 0, y: 0 });
  const beginDrag = useCallback((g: Omit<DragGhost, 'returning'>) => { origin.current = { x: g.x, y: g.y }; setGhost({ ...g, returning: false }); }, []);
  const moveDrag = useCallback((x: number, y: number, over: string | null) => { setGhost(g => g ? { ...g, x, y } : null); setOver(over); }, []);
  const endDrag = useCallback((returnToOrigin: boolean) => { setOver(null); setGhost(g => returnToOrigin && g ? { ...g, returning: true } : null); }, []);
  const clear = useCallback(() => setGhost(null), []);
  const value = useMemo(() => ({ ghost, overSlotId, beginDrag, moveDrag, endDrag }), [ghost, overSlotId, beginDrag, moveDrag, endDrag]);
  return <DragLayerContext.Provider value={value}>{children}<DragLayer origin={origin} clear={clear} /></DragLayerContext.Provider>;
}
export function DragLayer({ origin, clear }: { readonly origin?: RefObject<{ x: number; y: number }> ; readonly clear?: () => void }) {
  const { ghost } = useDragLayer();
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  useEffect(() => {
    if (!ghost?.returning || !ref.current || !clear) return;
    if (reducedMotion || !ref.current.animate || !origin?.current) { clear(); return; }
    const anim = ref.current.animate([{ transform: 'translate(-50%, -50%)' }, { transform: `translate(calc(-50% + ${origin.current.x - ghost.x}px), calc(-50% + ${origin.current.y - ghost.y}px))` }], { duration: 220, easing: 'ease-out' });
    void anim.finished.then(clear).catch(() => {});
    return () => anim.cancel();
  }, [ghost, origin, clear, reducedMotion]);
  if (!ghost || typeof document === 'undefined') return null;
  return createPortal(<div ref={ref} className={styles.ghost} data-group={ghost.group} style={{ left: ghost.x, top: ghost.y, width: ghost.width, height: ghost.height }}>{ghost.label}</div>, document.getElementById('drag-layer') ?? document.body);
}
