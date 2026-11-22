// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent, PointerEvent } from 'react';
import { SLOT_ID_ATTRIBUTE, type DragLayerApi, type TileDragApi, type TileDragOptions } from '../contracts';

export const DragLayerContext = createContext<DragLayerApi | null>(null);
export function useDragLayer(): DragLayerApi {
  const v = useContext(DragLayerContext);
  if (!v) throw new Error('DragLayerProvider ausente');
  return v;
}

const EVENTS = ['pointermove', 'pointerup', 'pointercancel', 'lostpointercapture'] as const;

export function useTileDrag(options: TileDragOptions): TileDragApi & { bind: TileDragApi['bind'] & { onClick: (e: MouseEvent<HTMLButtonElement>) => void } } {
  const layer = useDragLayer();
  const latest = useRef({ options, layer });
  useLayoutEffect(() => { latest.current = { options, layer }; });
  const [dragging, setDragging] = useState(false);
  const active = useRef<{ id: number; x: number; y: number; dragged: boolean; element: HTMLButtonElement } | null>(null);
  const suppress = useRef<{ pointerId: number; timestamp: number } | null>(null);
  const frame = useRef<number | null>(null);
  const cleanup = useRef<(() => void) | null>(null);
  const cancelFrame = () => { if (frame.current !== null) { cancelAnimationFrame(frame.current); frame.current = null; } };
  useEffect(() => () => { cancelFrame(); cleanup.current?.(); if (active.current?.dragged) latest.current.layer.endDrag(false); active.current = null; }, []);
  const hit = (x: number, y: number) => document.elementFromPoint?.(x, y)?.closest<HTMLElement>(`[${SLOT_ID_ATTRIBUTE}]:not([data-filled])`)?.dataset.slotId ?? null;
  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (!e.isPrimary || e.button !== 0 || options.disabled || active.current) return;
    const el = e.currentTarget, id = e.pointerId;
    suppress.current = null;
    active.current = { id, x: e.clientX, y: e.clientY, dragged: false, element: el };
    el.setPointerCapture(id);
    const onEv = (ev: globalThis.PointerEvent) => {
      const a = active.current; if (!a || a.id !== ev.pointerId) return;
      if (ev.type === 'pointermove') {
        if (!a.dragged && Math.hypot(ev.clientX - a.x, ev.clientY - a.y) > 8) {
          a.dragged = true; setDragging(true);
          const r = el.getBoundingClientRect(), o = latest.current.options;
          latest.current.layer.beginDrag({ tileId: o.tileId, group: o.group, label: o.label, x: a.x, y: a.y, width: r.width, height: r.height });
          o.onPick?.(o.tileId);
        }
        if (a.dragged) { cancelFrame(); const x = ev.clientX, y = ev.clientY; frame.current = requestAnimationFrame(() => { frame.current = null; latest.current.layer.moveDrag(x, y, hit(x, y)); }); }
        return;
      }
      active.current = null; cleanup.current?.(); cleanup.current = null; cancelFrame(); setDragging(false);
      const o = latest.current.options;
      if (ev.type === 'pointerup' && a.dragged) {
        const slot = hit(ev.clientX, ev.clientY);
        suppress.current = { pointerId: id, timestamp: Date.now() };
        latest.current.layer.endDrag(!slot);
        if (slot) o.onDrop(o.tileId, slot);
      } else if (a.dragged) {
        latest.current.layer.endDrag(false);
      }
    };
    EVENTS.forEach((t) => el.addEventListener(t, onEv));
    cleanup.current = () => EVENTS.forEach((t) => el.removeEventListener(t, onEv));
  };
  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (options.disabled) return;
    const pid = (e.nativeEvent as globalThis.PointerEvent).pointerId, s = suppress.current;
    if (e.detail > 0 && s && Date.now() - s.timestamp < 400 && (pid === s.pointerId || pid === undefined)) { suppress.current = null; return; }
    options.onTap(options.tileId);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!options.disabled) options.onTap(options.tileId); }
  };
  return { dragging, bind: { onPointerDown, onClick, onKeyDown } };
}
