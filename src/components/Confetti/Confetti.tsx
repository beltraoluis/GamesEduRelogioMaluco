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

function particleStyle(seq: number, i: number): CSSProperties & Record<string, string> {
  const hash = ((seq * 1103515245 + (i + 1) * 12345) >>> 0) % 10000;
  return {
    left: `${((i * 97 + seq * 31) % 96) + 2}%`,
    backgroundColor: CONFETTI_COLORS[(i + seq) % CONFETTI_COLORS.length] ?? '#ffb703',
    '--confetti-dx': `${(hash % 161) - 80}px`,
    '--confetti-rot': `${180 + (hash % 720)}deg`,
    '--confetti-delay': `${(i * 23) % 300}ms`,
    '--confetti-duration': `${1200 + (hash % 900)}ms`,
  };
}

export function Confetti({ burst }: ConfettiProps): ReactElement | null {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (prefersReducedMotion || burst === null || burst.count <= 0) {
    return null;
  }

  const count = Math.min(Math.ceil(burst.count), 120);

  return (
    <div
      className={styles.confettiContainer}
      aria-hidden="true"
      data-confetti-seq={burst.seq}
      data-motion="particle"
    >
      {Array.from({ length: count }, (_, i) => (
          <i
            key={`${burst.seq}-${i}`}
            className={styles.particle}
            style={particleStyle(burst.seq, i)}
            data-confetti-particle="true"
            data-motion="particle"
          />
      ))}
    </div>
  );
}

export default Confetti;
