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
  return (
    <div
      className={styles.starRating}
      data-animate={animate || undefined}
      role="img"
      aria-label={label}
      data-star-rating={value}
      data-size={size}
    >
      {STAR_INDICES.map((starIndex) => {
        const isFilled = starIndex <= value;
        return (
          <span
            key={starIndex}
            className={styles.starItem}
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
