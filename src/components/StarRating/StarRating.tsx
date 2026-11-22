// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import type { ReactElement } from 'react';

import type { StarRatingProps } from '@/contracts';
import { StarIcon } from '@/ui/icons/StarIcon';

import styles from './StarRating.module.css';

const STAR_INDICES = [1, 2, 3] as const;

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
      {STAR_INDICES.map((starIndex) => {
        const isFilled = starIndex <= value;
        const delayClass =
          starIndex === 1
            ? styles.delay1
            : starIndex === 2
              ? styles.delay2
              : styles.delay3;
        const itemClass = [
          styles.starItem,
          animate && isFilled ? styles.animate : undefined,
          animate && isFilled ? delayClass : undefined,
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <span
            key={starIndex}
            className={itemClass}
            data-star-index={starIndex}
            data-filled={String(isFilled)}
            data-motion="spring"
          >
            <StarIcon filled={isFilled} size={iconSize} />
          </span>
        );
      })}
    </div>
  );
}

export default StarRating;
