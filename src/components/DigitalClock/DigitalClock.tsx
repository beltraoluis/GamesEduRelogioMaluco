// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { DigitalClockProps } from '../../contracts';
import styles from './DigitalClock.module.css';
export function DigitalClock({ hours, minutes, label, glow, children }: DigitalClockProps & { readonly children?: ReactNode }) {
  const hour = useRef<HTMLSpanElement>(null), minute = useRef<HTMLSpanElement>(null);
  useEffect(() => { if (!glow) return; const node = glow.group === 'hour' ? hour.current : minute.current; if (!node?.animate) return; const anim = node.animate([{ opacity: 1 }, { opacity: 0.5 }, { opacity: 1 }], { duration: 600 }); void anim.finished.catch(() => {}); return () => anim.cancel(); }, [glow]);
  const h = String(hours).padStart(2, '0'), m = String(minutes).padStart(2, '0');
  return <div className={styles.clock} role="group" aria-label={label ?? `Relógio digital marcando ${h}:${m}`}>{children ?? <><span ref={hour} className={styles.hour}>{h}</span><span aria-hidden="true">:</span><span ref={minute} className={styles.minute}>{m}</span></>}</div>;
}
