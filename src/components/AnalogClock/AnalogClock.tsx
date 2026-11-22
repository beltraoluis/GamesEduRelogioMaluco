// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { AnalogClockProps } from '../../contracts';
import { useAnalogClockDrag } from '../../hooks/useAnalogClockDrag';
import { clockMath } from '../../domain/clockMath';
import styles from './AnalogClock.module.css';

export function AnalogClock({ time, label, interactive = false, minuteStep = 1, lockMinute = false, linkHands = false, showSeconds = false, minuteLabels = false, highlight, size = 'md', onChange, onGrab }: AnalogClockProps) {
  const hour = useRef<SVGGElement>(null), minute = useRef<SVGGElement>(null), second = useRef<SVGGElement>(null);
  const previousDrag = useRef<string | null>(null);
  const rotations = useRef<{ hour: number | null; minute: number | null; second: number | null }>({ hour: null, minute: null, second: null });
  const [announcement, setAnnouncement] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyboard = useRef(false);
  const drag = useAnalogClockDrag({ time, interactive, minuteStep, lockMinute, linkHands, onChange: (t, hand) => { onChange?.(t, hand); if (keyboard.current) { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setAnnouncement(`${clockMath.pad(t.h)}:${clockMath.pad(t.m)}`), 400); } }, ...(onGrab ? { onGrab } : {}) });
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useLayoutEffect(() => {
    for (const [name, node, angle] of [['hour', hour.current, clockMath.hourHandAngle(time)], ['minute', minute.current, clockMath.minuteHandAngle(time, showSeconds)], ['second', second.current, clockMath.secondHandAngle(time)]] as const) {
      if (!node) continue;
      let previous = rotations.current[name];
      if (drag.dragging === name && node.style.transition === 'none') {
        const parts = /^matrix\(([^)]+)\)$/.exec(getComputedStyle(node).transform)?.[1]?.split(',').map(Number);
        if (parts?.[0] !== undefined && parts[1] !== undefined && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) previous = Math.atan2(parts[1], parts[0]) * 180 / Math.PI;
      }
      if (drag.dragging === name && previousDrag.current !== name) { rotations.current[name] = previous; continue; }
      const next = clockMath.shortestRotation(previous, angle); rotations.current[name] = next;
      if (drag.dragging !== name) node.style.transition = '';
      node.style.transform = `rotate(${next}deg)`;
    }
    previousDrag.current = drag.dragging;
  }, [time, showSeconds, drag.dragging]);
  const highlightTarget = highlight?.target, highlightSeq = highlight?.seq;
  useEffect(() => {
    if (!highlightTarget) return;
    const nodes = highlightTarget === 'both' ? [hour.current, minute.current] : [highlightTarget === 'hour' ? hour.current : minute.current];
    const animations = nodes.flatMap(node => node && typeof node.animate === 'function' ? [node.animate([{ opacity: 1 }, { opacity: 0.4 }, { opacity: 1 }], { duration: 550 })] : []);
    animations.forEach(anim => { void anim.finished.catch(() => {}); });
    return () => animations.forEach(anim => anim.cancel());
  }, [highlightTarget, highlightSeq]);
  return <div className={styles.container} data-size={size} data-interactive={interactive}><svg viewBox="0 0 220 220" role="group" aria-label={label} {...drag.bind} onKeyDown={e => { keyboard.current = true; drag.bind.onKeyDown(e); keyboard.current = false; }}><circle cx="110" cy="110" r="108" fill="var(--color-warning-accent)" /><circle cx="110" cy="110" r="100" fill="var(--color-surface-dial)" /><g aria-hidden="true">{Array.from({ length: 60 }, (_, i) => { const a = i * Math.PI / 30, s = Math.sin(a), c = Math.cos(a), r = i % 5 ? 94 : 90; return <line key={i} x1={110 + r * s} y1={110 - r * c} x2={110 + 99 * s} y2={110 - 99 * c} stroke="var(--color-ink-muted)" strokeWidth={i % 5 ? 1 : 2} />; })}{Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6, s = Math.sin(a), c = Math.cos(a), mx = 110 + 82 * s, my = 110 - 82 * c; return <g key={i}><text x={110 + 66 * s} y={110 - 66 * c} className={styles.number}>{i || 12}</text>{minuteLabels && <g><rect x={mx - 8} y={my - 5} width="16" height="10" rx="5" fill="var(--color-minute-soft)" /><text x={mx} y={my} className={styles.minuteLabel}>{clockMath.pad(i * 5)}</text></g>}</g>; })}</g><g ref={hour} data-hand="hour" className={styles.hand}><path d="M105 115L105 77Q105 74 102 74L110 58 118 74Q115 74 115 77L115 115Z" fill="var(--color-hour)" stroke="var(--color-hour)" strokeLinejoin="round" /><circle cx="110" cy="79" r="2.5" fill="var(--color-surface-card)" /></g><g ref={minute} data-hand="minute" className={styles.hand}><path d="M107 117L107 38Q110 32 113 38L113 117Z" fill="var(--color-minute)" /><line x1="110" y1="50" x2="110" y2="100" stroke="var(--color-minute-soft)" strokeWidth="1.5" /><circle data-minute-eyelet="" cx="110" cy="43" r="3" fill="var(--color-surface-dial)" stroke="var(--color-minute)" strokeWidth="1" /></g>{showSeconds && <g ref={second} className={styles.hand}><line x1="110" y1="130" x2="110" y2="28" stroke="var(--color-second)" strokeWidth="2.5" /><circle cx="110" cy="127" r="5" fill="var(--color-second)" /></g>}<circle cx="110" cy="110" r="6" fill="var(--color-visor-bezel)" /></svg><span className={styles.srOnly} aria-live="polite">{announcement}</span></div>;
}
