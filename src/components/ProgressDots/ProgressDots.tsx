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

  const items: ReactElement[] = [];
  for (let i = 0; i < safeTotal; i++) {
    const mistakes = results[i];
    let state: DotState = 'pending';
    if (mistakes !== undefined) {
      state = mistakes === 0 ? 'perfect' : 'completed';
    } else if (i === current) {
      state = 'current';
    }

    const stateClass =
      state === 'perfect'
        ? styles.perfect
        : state === 'completed'
          ? styles.completed
          : state === 'current'
            ? styles.current
            : undefined;

    const dotClass = [styles.dot, stateClass].filter(Boolean).join(' ');

    items.push(
      <span
        key={i}
        className={dotClass}
        data-dot-index={i}
        data-state={state}
        aria-hidden="true"
      >
        {state === 'perfect' ? (
          <svg
            viewBox="0 0 12 12"
            className={styles.glyph}
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M2.5 6.3 L5 8.8 L9.5 3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
        {state === 'completed' ? (
          <svg
            viewBox="0 0 12 12"
            className={styles.glyph}
            aria-hidden="true"
            focusable="false"
          >
            <circle cx={6} cy={6} r={2.2} fill="currentColor" />
          </svg>
        ) : null}
      </span>,
    );
  }

  return (
    <div
      className={styles.progressDots}
      role="img"
      aria-label={`Pergunta ${displayIndex} de ${safeTotal}`}
      data-total={safeTotal}
      data-current={current}
    >
      {items}
    </div>
  );
}

export default ProgressDots;
