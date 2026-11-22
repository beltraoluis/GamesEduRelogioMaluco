// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import type { ReactElement } from 'react';

import type { HandBadgeProps } from '@/contracts';
import { SPRITE_URL } from '@/ui/icons/StarIcon';

import styles from './HandBadge.module.css';

export function HandBadge({ kind, size = 'inline' }: HandBadgeProps): ReactElement {
  const px = size === 'md' ? 24 : 20;

  return (
    <svg
      viewBox="0 0 24 24"
      width={px}
      height={px}
      className={styles.handBadge}
      aria-hidden="true"
      focusable="false"
      data-hand-badge={kind}
      data-size={size}
    >
      <g data-badge-layer={kind}>
        <use href={`${SPRITE_URL}#hb-${kind}`} />
      </g>
    </svg>
  );
}

export default HandBadge;
