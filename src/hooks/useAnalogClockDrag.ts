// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import type { AnalogClockDragApi, AnalogClockDragOptions, ClockTime, HandName } from '../contracts';
import { angleToHour, angleToMinute, CLOCK_CENTER, pickHand, withMinute } from '../domain/clockMath';

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
    if (active.current?.id !== e.pointerId) return;
    const p = point(e); if (!p) return;
    const t = timeRef.current;
    if (active.current.hand === 'hour') {
      let h = angleToHour(p.angle, t);
      if (options.linkHands && Math.abs(h - t.h) > 6) h = (h + 12) % 24;
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
  return {
    dragging,
    bind: {
      tabIndex: options.interactive ? 0 : -1,
      onKeyDown,
      onPointerDown(e) {
        if (!options.interactive || !e.isPrimary || e.button !== 0 || active.current) return;
        const p = point(e); if (!p) return;
        const hand: HandName = options.lockMinute ? 'hour' : pickHand(p.angle, p.radius, timeRef.current);
        const g = e.currentTarget.querySelector<SVGGElement>(`[data-hand="${hand}"]`);
        const vals = g ? /^matrix\(([^)]+)\)$/.exec(getComputedStyle(g).transform)?.[1]?.split(',').map(Number) : undefined;
        if (g && vals?.[0] !== undefined && vals[1] !== undefined && Number.isFinite(vals[0]) && Number.isFinite(vals[1])) {
          g.style.transition = 'none';
          g.style.transform = `rotate(${Math.atan2(vals[1], vals[0]) * 180 / Math.PI}deg)`;
        }
        active.current = { id: e.pointerId, hand }; setDragging(hand); e.currentTarget.setPointerCapture(e.pointerId); options.onGrab?.(hand);
      },
      onPointerMove: move,
      onPointerUp: finish,
      onPointerCancel: finish,
      onLostPointerCapture: finish,
    },
  };
}
