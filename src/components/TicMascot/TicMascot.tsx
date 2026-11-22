// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import type { ReactElement } from 'react';

import type { MascotProps, MascotSize } from '@/contracts';
import { SPRITE_URL } from '@/ui/icons/StarIcon';

import styles from './TicMascot.module.css';

const SIZE_PX: Readonly<Record<MascotSize, number>> = {
  sm: 64,
  md: 96,
  lg: 136,
};

export function TicMascot({
  mood,
  size,
  ambient = 'day',
  bounceSeq,
}: MascotProps): ReactElement {
  const pixelSize = SIZE_PX[size];
  const bounceClass =
    bounceSeq === undefined || bounceSeq <= 0
      ? undefined
      : bounceSeq % 2 === 0
        ? styles.bounceEven
        : styles.bounceOdd;

  const className = [styles.mascot, styles[size], bounceClass].filter(Boolean).join(' ');

  return (
    <svg
      viewBox="0 0 120 120"
      width={pixelSize}
      height={pixelSize}
      className={className}
      aria-hidden="true"
      focusable="false"
      data-mascot="tic"
      data-mood={mood}
      data-size={size}
      data-mascot-ambient={ambient}
      data-motion="bounce"
      {...(bounceSeq === undefined ? {} : { 'data-bounce-seq': String(bounceSeq) })}
    >
      <g className={mood === 'think' ? styles.thinkTilt : undefined}>
        <g
          className={mood === 'celebrate' ? styles.bellsCelebrate : undefined}
          data-mascot-bells="true"
          data-motion="decorative"
          data-bell="left"
          fill="#ff8fab"
        >
          <use data-bell="right" fill="#ff8fab" href={`${SPRITE_URL}#tic-bells`} />
        </g>
        <use href={`${SPRITE_URL}#tic-body-${ambient}`} />
        <g className={styles.clockHand}>
          <use href={`${SPRITE_URL}#tic-hand`} />
        </g>
        <g data-mood-layer={mood}>
          {mood !== 'celebrate' ? (
            <g className={styles.eyes}>
              <use href={`${SPRITE_URL}#tic-eyes-${mood}`} />
            </g>
          ) : null}
          <use href={`${SPRITE_URL}#tic-face-${mood}`} />
        </g>
      </g>
    </svg>
  );
}

export default TicMascot;
