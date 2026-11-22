// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import type { ReactElement } from 'react';

import type { ProgressDotsProps } from '@/contracts';
import { SPRITE_URL } from '@/ui/icons/StarIcon';

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
        const mistakes = results[i];
        const state: DotState =
          mistakes !== undefined
            ? mistakes === 0
              ? 'perfect'
              : 'completed'
            : i === current
              ? 'current'
              : 'pending';


        return (
          <span
            key={i}
            className={styles.dot}
            data-dot-index={i}
            data-state={state}
            aria-hidden="true"
          >
            {state === 'perfect' || state === 'completed' ? (
              <svg
                viewBox="0 0 12 12"
                className={styles.glyph}
                aria-hidden="true"
                focusable="false"
              >
                <use href={`${SPRITE_URL}#dot-${state}`} />
              </svg>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}

export default ProgressDots;
