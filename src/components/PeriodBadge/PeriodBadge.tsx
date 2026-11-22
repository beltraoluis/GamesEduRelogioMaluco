// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import type { ReactElement } from 'react';

import { PeriodMedallion } from '@/components/PeriodMedallion';
import type { Period, PeriodBadgeProps } from '@/contracts';

import styles from './PeriodBadge.module.css';

const OPPOSITE_PERIOD: Readonly<Record<Period, Period>> = {
  'da madrugada': 'da tarde',
  'da manhã': 'da noite',
  'da tarde': 'da madrugada',
  'da noite': 'da manhã',
};

export function PeriodBadge({ period, onToggle }: PeriodBadgeProps): ReactElement {
  const shortLabel = period.replace(/^da\s+/u, '');
  const oppositePeriod = OPPOSITE_PERIOD[period];

  return (
    <div className={styles.badge} data-period-badge={period}>
      <PeriodMedallion period={period} size="sm" />
      <span className={styles.label}>{shortLabel}</span>
      {onToggle !== undefined ? (
        <button
          type="button"
          className={styles.toggleBtn}
          onClick={onToggle}
          aria-label={`Trocar período (atual: ${period})`}
        >
          <span>trocar</span>
          <PeriodMedallion period={oppositePeriod} size="sm" />
        </button>
      ) : null}
    </div>
  );
}

export default PeriodBadge;
