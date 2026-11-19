// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import type { ReactElement } from 'react';

import type { Atmosphere, Period, PeriodMedallionProps } from '@/contracts';

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
      {atmosphere === 'madrugada' ? (
        <g data-layer="madrugada">
          <circle cx={16} cy={16} r={14.5} fill="#312e81" stroke="#7b2cbf" strokeWidth={2} />
          <path d="M4 22 Q16 18 28 22 L26 28 Q16 31 6 28 Z" fill="#4c1d95" />
          <path
            d="M16 5.5 L18.2 11.2 L24 13.5 L18.2 15.8 L16 21.5 L13.8 15.8 L8 13.5 L13.8 11.2 Z"
            fill="#fde047"
            stroke="#ffb703"
            strokeWidth={1}
          />
          <circle cx={9} cy={9} r={1.2} fill="#e0f2fe" />
          <circle cx={23.5} cy={8.5} r={1} fill="#e0f2fe" />
        </g>
      ) : null}

      {atmosphere === 'manha' ? (
        <g data-layer="manha">
          <circle cx={16} cy={16} r={14.5} fill="#e0f2fe" stroke="#7b2cbf" strokeWidth={2} />
          <path
            d="M16 7.5 V10.5 M9.2 10.5 L11.2 12.5 M22.8 10.5 L20.8 12.5"
            stroke="#fb8500"
            strokeWidth={2.2}
            strokeLinecap="round"
          />
          <path d="M9.5 21 A6.5 6.5 0 0 1 22.5 21 Z" fill="#ffb703" stroke="#fb8500" strokeWidth={1.5} />
          <path d="M4.5 21 H27.5" stroke="#1560bd" strokeWidth={2.2} strokeLinecap="round" />
          <path d="M7.5 24.5 H24.5" stroke="#93c5fd" strokeWidth={1.8} strokeLinecap="round" />
        </g>
      ) : null}

      {atmosphere === 'tarde' ? (
        <g data-layer="tarde">
          <circle cx={16} cy={16} r={14.5} fill="#fef3c7" stroke="#fb8500" strokeWidth={2} />
          <circle cx={15} cy={14} r={5.5} fill="#ffb703" stroke="#fb8500" strokeWidth={1.6} />
          <path
            d="M15 4.8 V6.8 M15 21.2 V23.2 M5.8 14 H7.8 M22.2 14 H24.2 M8.5 7.5 L10 9 M20 19 L21.5 20.5 M21.5 7.5 L20 9 M10 19 L8.5 20.5"
            stroke="#fb8500"
            strokeWidth={1.9}
            strokeLinecap="round"
          />
          <path
            d="M14.5 24.5 H23.5 A2.8 2.8 0 0 0 23.5 19 A3.8 3.8 0 0 0 16.5 17.8 A2.6 2.6 0 0 0 14.5 24.5 Z"
            fill="#ffffff"
            stroke="#e2d9c5"
            strokeWidth={1.2}
          />
        </g>
      ) : null}

      {atmosphere === 'noite' ? (
        <g data-layer="noite">
          <circle cx={16} cy={16} r={14.5} fill="#1e1b4b" stroke="#7b2cbf" strokeWidth={2} />
          <path
            d="M18.8 7.2 A8.2 8.2 0 1 0 24.2 21.5 A6.8 6.8 0 0 1 18.8 7.2 Z"
            fill="#fde047"
            stroke="#ffb703"
            strokeWidth={1.2}
          />
          <circle cx={22.5} cy={10.5} r={1.5} fill="#fde047" />
          <circle cx={24.5} cy={15.5} r={1.1} fill="#e0f2fe" />
        </g>
      ) : null}
    </svg>
  );
}

export default PeriodMedallion;
