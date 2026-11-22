// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import type { CSSProperties, ReactElement } from 'react';

import type { ConfettiProps } from '@/contracts';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

import styles from './Confetti.module.css';

export { usePrefersReducedMotion };

const CONFETTI_COLORS = [
  '#ffb703',
  '#fb8500',
  '#d62839',
  '#1560bd',
  '#0f766e',
  '#7b2cbf',
  '#2e7d32',
] as const;

interface ParticleSpec {
  readonly id: string;
  readonly leftPercent: number;
  readonly color: string;
  readonly dxPx: number;
  readonly rotDeg: number;
  readonly delayMs: number;
  readonly durationMs: number;
}

function buildParticles(seq: number, count: number): readonly ParticleSpec[] {
  const safeCount = Math.max(0, Math.min(count, 120));
  const out: ParticleSpec[] = [];
  for (let i = 0; i < safeCount; i++) {
    const hash = ((seq * 1103515245 + (i + 1) * 12345) >>> 0) % 10000;
    const leftPercent = ((i * 97 + seq * 31) % 96) + 2;
    const color = CONFETTI_COLORS[(i + seq) % CONFETTI_COLORS.length] ?? '#ffb703';
    const dxPx = (hash % 161) - 80;
    const rotDeg = 180 + (hash % 720);
    const delayMs = (i * 23) % 300;
    const durationMs = 1200 + (hash % 900);
    out.push({
      id: `${seq}-${i}`,
      leftPercent,
      color,
      dxPx,
      rotDeg,
      delayMs,
      durationMs,
    });
  }
  return out;
}

export function Confetti({ burst }: ConfettiProps): ReactElement | null {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (prefersReducedMotion || burst === null || burst.count <= 0) {
    return null;
  }

  const particles = buildParticles(burst.seq, burst.count);

  return (
    <div
      className={styles.confettiContainer}
      aria-hidden="true"
      data-confetti-seq={burst.seq}
      data-motion="particle"
    >
      {particles.map((p) => {
        const style: CSSProperties & Record<string, string> = {
          left: `${p.leftPercent}%`,
          backgroundColor: p.color,
          '--confetti-dx': `${p.dxPx}px`,
          '--confetti-rot': `${p.rotDeg}deg`,
          '--confetti-delay': `${p.delayMs}ms`,
          '--confetti-duration': `${p.durationMs}ms`,
        };
        return (
          <i
            key={p.id}
            className={styles.particle}
            style={style}
            data-confetti-particle="true"
            data-motion="particle"
          />
        );
      })}
    </div>
  );
}

export default Confetti;
