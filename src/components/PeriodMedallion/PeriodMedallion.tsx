// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import type { ReactElement } from 'react';

import type { Atmosphere, Period, PeriodMedallionProps } from '@/contracts';
import { SPRITE_URL } from '@/ui/icons/StarIcon';

import styles from './PeriodMedallion.module.css';

const SIZE_MAP = {
  sm: 22,
  md: 28,
  lg: 36,
} as const;

export function normalizePeriodToAtmosphere(period: Period | Atmosphere): Atmosphere {
  switch (period) {
    case 'da madrugada':
    case 'madrugada':
      return 'madrugada';
    case 'da manhã':
    case 'manha':
      return 'manha';
    case 'da tarde':
    case 'tarde':
      return 'tarde';
    case 'da noite':
    case 'noite':
      return 'noite';
  }
}

export function PeriodMedallion({
  period,
  size = 'md',
}: PeriodMedallionProps): ReactElement {
  const atmosphere = normalizePeriodToAtmosphere(period);
  const px = SIZE_MAP[size];
  const className = [styles.medallion, styles[size]].filter(Boolean).join(' ');

  return (
    <svg
      viewBox="0 0 32 32"
      width={px}
      height={px}
      className={className}
      aria-hidden="true"
      focusable="false"
      data-period-medallion={atmosphere}
      data-period={period}
    >
      <g data-layer={atmosphere}>
        <use href={`${SPRITE_URL}#pm-${atmosphere}`} />
      </g>
    </svg>
  );
}

export default PeriodMedallion;
