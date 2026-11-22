// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import type { CSSProperties, ReactElement } from 'react';

import type { ConfettiProps } from '@/contracts';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

import styles from './Confetti.module.css';

export { usePrefersReducedMotion };

const COLORS = ['#ffb703', '#fb8500', '#d62839', '#1560bd', '#0f766e', '#7b2cbf', '#2e7d32'] as const;

export function Confetti({ burst }: ConfettiProps): ReactElement | null {
  const reduced = usePrefersReducedMotion();
  if (reduced || !burst || burst.count <= 0) return null;
  const { seq } = burst;
  const n = Math.min(burst.count, 120);

  return (
    <div
      className={styles.confettiContainer}
      aria-hidden="true"
      data-confetti-seq={seq}
      data-motion="particle"
    >
      {Array.from({ length: n }, (_, i) => {
        const h = ((seq * 1103515245 + (i + 1) * 12345) >>> 0) % 10000;
        const style: CSSProperties & Record<string, string> = {
          left: `${((i * 97 + seq * 31) % 96) + 2}%`,
          backgroundColor: COLORS[(i + seq) % COLORS.length]!,
          '--confetti-dx': `${(h % 161) - 80}px`,
          '--confetti-rot': `${180 + (h % 720)}deg`,
          '--confetti-delay': `${(i * 23) % 300}ms`,
          '--confetti-duration': `${1200 + (h % 900)}ms`,
        };
        return (
          <i
            key={`${seq}-${i}`}
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
