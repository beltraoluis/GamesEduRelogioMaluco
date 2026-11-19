// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { MouseEvent, PointerEvent, KeyboardEvent } from 'react';
import type { DragLayerApi, TileDragApi, TileDragOptions } from '../contracts';

export const DragLayerContext = createContext<DragLayerApi | null>(null);
export function useDragLayer(): DragLayerApi {
  const value = useContext(DragLayerContext);
  if (!value) throw new Error('DragLayerProvider ausente');
  return value;
}

export function useTileDrag(options: TileDragOptions): TileDragApi & { bind: TileDragApi['bind'] & { onClick: (e: MouseEvent<HTMLButtonElement>) => void } } {
  const layer = useDragLayer();
  const latest = useRef({ options, layer });
  useLayoutEffect(() => { latest.current = { options, layer }; });
  const [dragging, setDragging] = useState(false);
  const active = useRef<{ id: number; x: number; y: number; dragged: boolean; element: HTMLButtonElement } | null>(null);
  const suppress = useRef<{ pointerId: number; timestamp: number } | null>(null);
  const frame = useRef<number | null>(null);
  const cleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); cleanup.current?.(); if (active.current?.dragged) latest.current.layer.endDrag(false); active.current = null; }, []);
  const hit = (x: number, y: number) => document.elementFromPoint?.(x, y)?.closest<HTMLElement>('[data-slot-id]:not([data-filled])')?.dataset.slotId ?? null;
  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (!e.isPrimary || e.button !== 0 || options.disabled || active.current) return;
    const element = e.currentTarget; const id = e.pointerId;
    suppress.current = null;
    active.current = { id, x: e.clientX, y: e.clientY, dragged: false, element };
    element.setPointerCapture(id);
    const move = (event: globalThis.PointerEvent) => {
      const a = active.current; if (!a || a.id !== event.pointerId) return;
      if (!a.dragged && Math.hypot(event.clientX - a.x, event.clientY - a.y) > 8) {
        a.dragged = true; setDragging(true);
        const rect = element.getBoundingClientRect(); const o = latest.current.options;
        latest.current.layer.beginDrag({ tileId: o.tileId, group: o.group, label: o.label, x: a.x, y: a.y, width: rect.width, height: rect.height }); o.onPick?.(o.tileId);
      }
      if (a.dragged) { if (frame.current !== null) cancelAnimationFrame(frame.current); const x = event.clientX, y = event.clientY; frame.current = requestAnimationFrame(() => { frame.current = null; latest.current.layer.moveDrag(x, y, hit(x, y)); }); }
    };
    const finish = (event: globalThis.PointerEvent) => {
      const a = active.current; if (!a || a.id !== event.pointerId) return;
      active.current = null; cleanup.current?.(); cleanup.current = null;
      if (frame.current !== null) { cancelAnimationFrame(frame.current); frame.current = null; }
      setDragging(false);
      const o = latest.current.options;
      if (event.type === 'pointerup' && a.dragged) { const slot = hit(event.clientX, event.clientY); suppress.current = { pointerId: id, timestamp: Date.now() }; latest.current.layer.endDrag(!slot); if (slot) o.onDrop(o.tileId, slot); }
      else if (a.dragged) latest.current.layer.endDrag(false);
    };
    element.addEventListener('pointermove', move); element.addEventListener('pointerup', finish); element.addEventListener('pointercancel', finish); element.addEventListener('lostpointercapture', finish);
    cleanup.current = () => { element.removeEventListener('pointermove', move); element.removeEventListener('pointerup', finish); element.removeEventListener('pointercancel', finish); element.removeEventListener('lostpointercapture', finish); };
  };
  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (options.disabled) return;
    const pointerId = (e.nativeEvent as globalThis.PointerEvent).pointerId;
    const s = suppress.current;
    if (e.detail > 0 && s && Date.now() - s.timestamp < 400 && (pointerId === s.pointerId || pointerId === undefined)) { suppress.current = null; return; }
    options.onTap(options.tileId);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!options.disabled) options.onTap(options.tileId); } };
  return { dragging, bind: { onPointerDown, onClick, onKeyDown } };
}
