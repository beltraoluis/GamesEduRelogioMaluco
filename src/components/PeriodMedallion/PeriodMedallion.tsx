// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import type { ReactElement } from 'react';

import type { Atmosphere, Period, PeriodMedallionProps } from '@/contracts';
import { SPRITE_URL } from '@/ui/icons/StarIcon';

import { content } from '@/content/runtimeDomData';

import styles from './PeriodMedallion.module.css';

const SIZE_MAP = {
  sm: 22,
  md: 28,
  lg: 36,
} as const;

export function normalizePeriodToAtmosphere(period: Period | Atmosphere): Atmosphere {
  return period.startsWith('da ') ? content.atmospheres[period as Period] : period as Atmosphere;
}

export function PeriodMedallion({
  period,
  size = 'md',
}: PeriodMedallionProps): ReactElement {
  const atmosphere = normalizePeriodToAtmosphere(period);
  const px = SIZE_MAP[size];

  return (
    <svg
      viewBox="0 0 32 32"
      width={px}
      height={px}
      className={styles.medallion}
      aria-hidden="true"
      focusable="false"
      data-period-medallion={atmosphere}
      data-period={period}
      data-size={size}
    >
      <g data-layer={atmosphere}>
        <use href={`${SPRITE_URL}#pm-${atmosphere}`} />
      </g>
    </svg>
  );
}

export default PeriodMedallion;
