// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import type { ReactElement } from 'react';

import type { ProgressDotsProps } from '@/contracts';

import styles from './ProgressDots.module.css';

export type DotState = 'perfect' | 'completed' | 'current' | 'pending';

export function ProgressDots({
  total,
  current,
  results,
}: ProgressDotsProps): ReactElement {
  const safeTotal = Math.max(0, total);
  const displayIndex = safeTotal === 0 ? 0 : Math.min(current + 1, safeTotal);

  return (
    <div
      className={styles.progressDots}
      role="img"
      aria-label={`Pergunta ${displayIndex} de ${safeTotal}`}
      data-total={safeTotal}
      data-current={current}
    >
      {Array.from({ length: safeTotal }, (_, i) => {
        const m = results[i];
        const state: DotState =
          m !== undefined ? (m === 0 ? 'perfect' : 'completed') : i === current ? 'current' : 'pending';
        const dotClass = [styles.dot, styles[state]].filter(Boolean).join(' ');
        return (
          <span
            key={i}
            className={dotClass}
            data-dot-index={i}
            data-state={state}
            aria-hidden="true"
          >
            {(state === 'perfect' || state === 'completed') && (
              <svg viewBox="0 0 12 12" className={styles.glyph} aria-hidden="true" focusable="false">
                {state === 'perfect' ? (
                  <path
                    d="M2.5 6.3L5 8.8 9.5 3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : (
                  <circle cx={6} cy={6} r={2.2} fill="currentColor" />
                )}
              </svg>
            )}
          </span>
        );
      })}
    </div>
  );
}

export default ProgressDots;
