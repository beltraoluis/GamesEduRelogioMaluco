// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { useLayoutEffect, useRef, useState } from 'react';
import type { AnalogClockDragApi, AnalogClockDragOptions, ClockTime, HandName } from '../contracts';
import type { PointerEvent, KeyboardEvent } from 'react';
import { angleToHour, angleToMinute, pickHand, withMinute, CLOCK_CENTER } from '../domain/clockMath';

export function useAnalogClockDrag(options: AnalogClockDragOptions): AnalogClockDragApi & { bind: AnalogClockDragApi['bind'] & { onLostPointerCapture: (event: PointerEvent<SVGSVGElement>) => void } } {
  const [dragging, setDragging] = useState<HandName | null>(null);
  const active = useRef<{ id: number; hand: HandName } | null>(null);
  const timeRef = useRef(options.time);
  useLayoutEffect(() => { timeRef.current = options.time; }, [options.time]);
  const point = (e: PointerEvent<SVGSVGElement>) => {
    try {
      const ctm = e.currentTarget.getScreenCTM();
      if (!ctm) return null;
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
      const x = p.x - CLOCK_CENTER, y = p.y - CLOCK_CENTER;
      return { angle: (Math.atan2(x, -y) * 180 / Math.PI + 360) % 360, radius: Math.hypot(x, y) };
    } catch { return null; }
  };
  const change = (time: ClockTime, hand: HandName) => { timeRef.current = time; options.onChange(time, hand); };
  const move = (e: PointerEvent<SVGSVGElement>) => {
    if (!active.current || active.current.id !== e.pointerId) return;
    const p = point(e); if (!p) return;
    const t = timeRef.current;
    if (active.current.hand === 'hour') {
      let h = angleToHour(p.angle, t);
      if (options.linkHands) {
        // No relógio livre, acompanhe a posição mais próxima no ciclo de 24 horas.
        const delta = h - t.h;
        if (Math.abs(delta) > 6) h = (h + 12) % 24;
      }
      change({ ...t, h }, 'hour');
    } else {
      change(withMinute(t, angleToMinute(p.angle, options.minuteStep), options.linkHands), 'minute');
    }
  };
  const finish = (e: PointerEvent<SVGSVGElement>) => {
    if (active.current?.id !== e.pointerId) return;
    const hand = active.current.hand;
    active.current = null; setDragging(null); options.onRelease?.(hand);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };
  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    if (!options.interactive) return;
    const t = timeRef.current;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault(); change({ ...t, h: (t.h + (e.key === 'ArrowRight' ? 1 : 23)) % 24 }, 'hour');
    } else if (!options.lockMinute && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault(); const total = t.m + (e.key === 'ArrowUp' ? options.minuteStep : -options.minuteStep);
      change({ ...t, m: (total + 60) % 60, h: (t.h + (options.linkHands ? Math.floor(total / 60) : 0) + 24) % 24 }, 'minute');
    }
  };
  return { dragging, bind: { tabIndex: options.interactive ? 0 : -1, onKeyDown,
    onPointerDown(e) {
      if (!options.interactive || !e.isPrimary || e.button !== 0 || active.current) return;
      const p = point(e); if (!p) return;
      const hand: HandName = options.lockMinute ? 'hour' : pickHand(p.angle, p.radius, timeRef.current);
      const g = e.currentTarget.querySelector<SVGGElement>(`[data-hand="${hand}"]`);
      if (g) { const transform = getComputedStyle(g).transform; const match = /^matrix\(([^)]+)\)$/.exec(transform); if (match) { const values = match[1]?.split(',').map(Number); const a = values?.[0], b = values?.[1]; if (a !== undefined && b !== undefined && Number.isFinite(a) && Number.isFinite(b)) { const angle = Math.atan2(b, a) * 180 / Math.PI; g.style.transition = 'none'; g.style.transform = `rotate(${angle}deg)`; } } }
      active.current = { id: e.pointerId, hand }; setDragging(hand); e.currentTarget.setPointerCapture(e.pointerId); options.onGrab?.(hand);
    }, onPointerMove: move, onPointerUp: finish, onPointerCancel: finish, onLostPointerCapture: finish } };
}
