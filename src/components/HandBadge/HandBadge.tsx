// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import type { ReactElement } from 'react';

import type { HandBadgeProps } from '@/contracts';

import styles from './HandBadge.module.css';

export function HandBadge({ kind, size = 'inline' }: HandBadgeProps): ReactElement {
  const px = size === 'md' ? 24 : 20;
  const className = [styles.handBadge, styles[size]].filter(Boolean).join(' ');

  return (
    <svg
      viewBox="0 0 24 24"
      width={px}
      height={px}
      className={className}
      aria-hidden="true"
      focusable="false"
      data-hand-badge={kind}
      data-size={size}
    >
      {kind === 'hour-hand' ? (
        <g data-badge-layer="hour-hand">
          {/* Moldura circular azul (redundância geométrica das Horas) */}
          <circle
            cx={12}
            cy={12}
            r={10}
            fill="var(--color-hour-soft, #e8f1fc)"
            stroke="var(--color-hour, #1560bd)"
            strokeWidth={2.2}
          />
          {/* Ponteiro curto e largo com seta arredondada */}
          <line
            x1={7}
            y1={12}
            x2={14.5}
            y2={12}
            stroke="var(--color-hour, #1560bd)"
            strokeWidth={3.4}
            strokeLinecap="round"
          />
          <path
            d="M13 8.8 L17.2 12 L13 15.2"
            fill="none"
            stroke="var(--color-hour, #1560bd)"
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx={7} cy={12} r={2} fill="var(--color-hour-ledge, #0d4285)" />
        </g>
      ) : null}

      {kind === 'minute-hand' ? (
        <g data-badge-layer="minute-hand">
          {/* Moldura em losango arredondado (redundância geométrica dos Minutos) */}
          <path
            d="M12 2.2 L21.8 12 L12 21.8 L2.2 12 Z"
            fill="var(--color-minute-soft, #fff5f6)"
            stroke="var(--color-minute, #d62839)"
            strokeWidth={2.2}
            strokeLinejoin="round"
          />
          {/* Ponteiro longo e esguio com ilhós circular vazado */}
          <line
            x1={6.2}
            y1={12}
            x2={13.2}
            y2={12}
            stroke="var(--color-minute, #d62839)"
            strokeWidth={2.2}
            strokeLinecap="round"
          />
          <circle
            cx={15.2}
            cy={12}
            r={2}
            fill="var(--color-minute-soft, #fff5f6)"
            stroke="var(--color-minute, #d62839)"
            strokeWidth={2}
          />
          <line
            x1={17.2}
            y1={12}
            x2={18.8}
            y2={12}
            stroke="var(--color-minute, #d62839)"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </g>
      ) : null}

      {kind === 'period' ? (
        <g data-badge-layer="period">
          {/* Moldura pílula/octógono roxo (redundância geométrica do Período 24h) */}
          <rect
            x={2}
            y={4}
            width={20}
            height={16}
            rx={8}
            fill="var(--color-period-soft, #f3eafa)"
            stroke="var(--color-period, #7b2cbf)"
            strokeWidth={2.2}
          />
          {/* Sol + meia-lua */}
          <circle cx={9.5} cy={12} r={3.2} fill="#ffb703" stroke="#7b2cbf" strokeWidth={1.4} />
          <path
            d="M15.8 8.8 A3.6 3.6 0 1 0 18.2 14.8 A2.9 2.9 0 0 1 15.8 8.8 Z"
            fill="var(--color-period, #7b2cbf)"
          />
        </g>
      ) : null}

      {kind === 'colon' ? (
        <g data-badge-layer="colon">
          <rect
            x={5}
            y={2.5}
            width={14}
            height={19}
            rx={4.5}
            fill="var(--color-visor-bg, #1e2832)"
            stroke="var(--color-visor-bezel, #263238)"
            strokeWidth={1.5}
          />
          <circle cx={12} cy={8.5} r={2.3} fill="var(--color-colon-on-dark, #ffb703)" />
          <circle cx={12} cy={15.5} r={2.3} fill="var(--color-colon-on-dark, #ffb703)" />
        </g>
      ) : null}
    </svg>
  );
}

export default HandBadge;
