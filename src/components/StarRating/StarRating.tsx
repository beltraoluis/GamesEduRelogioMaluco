// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import type { ReactElement } from 'react';

import type { StarRatingProps } from '@/contracts';
import { StarIcon } from '@/ui/icons/StarIcon';

import styles from './StarRating.module.css';

const DELAYS = [styles.delay1, styles.delay2, styles.delay3] as const;

export function StarRating({
  value,
  label,
  size = 'sm',
  animate = false,
}: StarRatingProps): ReactElement {
  const iconSize = size === 'lg' ? 44 : 22;
  const rootClass = [styles.starRating, size === 'lg' ? styles.lg : undefined]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={rootClass}
      role="img"
      aria-label={label}
      data-star-rating={value}
      data-size={size}
    >
      {([1, 2, 3] as const).map((i) => {
        const filled = i <= value;
        const itemClass = [
          styles.starItem,
          animate && filled ? styles.animate : undefined,
          animate && filled ? DELAYS[i - 1] : undefined,
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <span
            key={i}
            className={itemClass}
            data-star-index={i}
            data-filled={String(filled)}
            data-motion="spring"
          >
            <StarIcon filled={filled} size={iconSize} />
          </span>
        );
      })}
    </div>
  );
}

export default StarRating;
