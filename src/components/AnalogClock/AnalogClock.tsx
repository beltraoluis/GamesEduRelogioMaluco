// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { AnalogClockProps } from '../../contracts';
import { renderedHandAngle, useAnalogClockDrag } from '../../hooks/useAnalogClockDrag';
import { hourHandAngle, minuteHandAngle, secondHandAngle, shortestRotation } from '../../domain/clockMath';
import { pad } from '../../domain/time';
import { SPRITE_URL } from '../../ui/icons/StarIcon';
import styles from './AnalogClock.module.css';

export function AnalogClock({
  time,
  label,
  interactive = false,
  minuteStep = 1,
  lockMinute = false,
  linkHands = false,
  showSeconds = false,
  minuteLabels = false,
  highlight,
  size = 'md',
  onChange,
  onGrab,
}: AnalogClockProps) {
  const hour = useRef<SVGGElement>(null);
  const minute = useRef<SVGGElement>(null);
  const second = useRef<SVGGElement>(null);
  const previousDrag = useRef<string | null>(null);
  const rotations = useRef<{ hour: number | null; minute: number | null; second: number | null }>({
    hour: null,
    minute: null,
    second: null,
  });
  const [announcement, setAnnouncement] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyboard = useRef(false);
  const drag = useAnalogClockDrag({
    time,
    interactive,
    minuteStep,
    lockMinute,
    linkHands,
    onChange: (t, hand) => {
      onChange?.(t, hand);
      if (keyboard.current) {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setAnnouncement(`${pad(t.h)}:${pad(t.m)}`), 400);
      }
    },
    ...(onGrab ? { onGrab } : {}),
  });
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useLayoutEffect(() => {
    for (const [name, node, angle] of [
      ['hour', hour.current, hourHandAngle(time)],
      ['minute', minute.current, minuteHandAngle(time, showSeconds)],
      ['second', second.current, secondHandAngle(time)],
    ] as const) {
      if (!node) continue;
      let previous = rotations.current[name];
      if (drag.dragging === name && node.style.transition === 'none') {
        previous = renderedHandAngle(node) ?? previous;
      }
      if (drag.dragging === name && previousDrag.current !== name) {
        rotations.current[name] = previous;
        continue;
      }
      const next = shortestRotation(previous, angle);
      rotations.current[name] = next;
      if (drag.dragging !== name) node.style.transition = '';
      node.style.transform = `rotate(${next}deg)`;
    }
    previousDrag.current = drag.dragging;
  }, [time, showSeconds, drag.dragging]);
  const highlightTarget = highlight?.target;
  const highlightSeq = highlight?.seq;
  useEffect(() => {
    if (!highlightTarget) return;
    const nodes =
      highlightTarget === 'both'
        ? [hour.current, minute.current]
        : [highlightTarget === 'hour' ? hour.current : minute.current];
    const animations = nodes.flatMap((node) =>
      node && typeof node.animate === 'function'
        ? [node.animate([{ opacity: 1 }, { opacity: 0.4 }, { opacity: 1 }], { duration: 550 })]
        : [],
    );
    animations.forEach((anim) => {
      void anim.finished.catch(() => {});
    });
    return () => animations.forEach((anim) => anim.cancel());
  }, [highlightTarget, highlightSeq]);
  return (
    <div className={styles.container} data-size={size} data-interactive={interactive}>
      <svg
        viewBox="0 0 220 220"
        role="group"
        aria-label={label}
        {...drag.bind}
        onKeyDown={(e) => {
          keyboard.current = true;
          drag.bind.onKeyDown(e);
          keyboard.current = false;
        }}
      >
        <circle cx="110" cy="110" r="108" fill="var(--color-warning-accent)" />
        <circle cx="110" cy="110" r="100" fill="var(--color-surface-dial)" />
        <g aria-hidden="true">
          <use href={`${SPRITE_URL}#clock-ticks`} />
          <use className={styles.number} href={`${SPRITE_URL}#clock-numbers`} />
          {minuteLabels && <use className={styles.minuteLabel} href={`${SPRITE_URL}#clock-minutes`} />}
        </g>
        <g ref={hour} data-hand="hour" className={styles.hand}>
          <use href={`${SPRITE_URL}#clock-hand-hour`} />
        </g>
        <g ref={minute} data-hand="minute" className={styles.hand}>
          <path d="M107 117 L107 38 Q110 32 113 38 L113 117 Z" fill="var(--color-minute)" />
          <line x1="110" y1="50" x2="110" y2="100" stroke="var(--color-minute-soft)" strokeWidth="1.5" />
          <circle
            data-minute-eyelet=""
            cx="110"
            cy="43"
            r="3"
            fill="var(--color-surface-dial)"
            stroke="var(--color-minute)"
            strokeWidth="1"
          />
        </g>
        {showSeconds && (
          <g ref={second} className={styles.hand}>
            <use href={`${SPRITE_URL}#clock-hand-second`} />
          </g>
        )}
        <circle cx="110" cy="110" r="6" fill="var(--color-visor-bezel)" />
      </svg>
      <span className={styles.srOnly} aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}
