// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import type { ReactElement } from 'react';

import type { MascotProps, MascotSize } from '@/contracts';

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
  const isNight = ambient === 'night';

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
        {/* Alça superior e duas sinetas rosas gêmeas sempre presentes */}
        <g
          className={mood === 'celebrate' ? styles.bellsCelebrate : undefined}
          data-mascot-bells="true"
          data-motion="decorative"
        >
          <path
            d="M32 20 C42 4, 78 4, 88 20"
            fill="none"
            stroke="#6c584c"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <rect x={56} y={6} width={8} height={14} rx={3} fill="#6c584c" />
          <circle
            cx={28}
            cy={24}
            r={14}
            fill="#ff8fab"
            stroke="#fb8500"
            strokeWidth={2.5}
            data-bell="left"
          />
          <circle cx={24} cy={20} r={4} fill="#ffd6e0" opacity={0.75} />
          <circle
            cx={92}
            cy={24}
            r={14}
            fill="#ff8fab"
            stroke="#fb8500"
            strokeWidth={2.5}
            data-bell="right"
          />
          <circle cx={88} cy={20} r={4} fill="#ffd6e0" opacity={0.75} />
        </g>

        {/* Pés de madeira/metal do despertador */}
        <line
          x1={34}
          y1={104}
          x2={24}
          y2={116}
          stroke="#6c584c"
          strokeWidth={7}
          strokeLinecap="round"
        />
        <line
          x1={86}
          y1={104}
          x2={96}
          y2={116}
          stroke="#6c584c"
          strokeWidth={7}
          strokeLinecap="round"
        />

        {/* Caixa principal e aro conforme ambient */}
        <circle
          cx={60}
          cy={64}
          r={46}
          fill={isNight ? '#312e81' : '#ffb703'}
          stroke={isNight ? '#818cf8' : '#1560bd'}
          strokeWidth={3.5}
        />
        <circle
          cx={60}
          cy={64}
          r={37}
          fill={isNight ? '#fff9e6' : '#fffdf5'}
          stroke="#e2d9c5"
          strokeWidth={1.5}
        />

        {/* Detalhe noturno quando ambient="night" (sem ocultar as sinetas rosas) */}
        {isNight ? (
          <g data-mascot-night-star="true">
            <path
              d="M60 12 L62 17 L67 19 L62 21 L60 26 L58 21 L53 19 L58 17 Z"
              fill="#fde047"
            />
          </g>
        ) : null}

        {/* Ponteiro-nariz do Tic */}
        <line
          x1={60}
          y1={64}
          x2={60}
          y2={40}
          stroke="#d62839"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <circle cx={60} cy={64} r={3} fill="#1560bd" />

        {/* Bochechas rosadas */}
        <circle cx={38} cy={72} r={5} fill="#ff9aa2" opacity={0.85} />
        <circle cx={82} cy={72} r={5} fill="#ff9aa2" opacity={0.85} />

        {/* Expressões por mood */}
        {mood === 'happy' ? (
          <g data-mood-layer="happy">
            <ellipse cx={46} cy={56} rx={5} ry={7} fill="#1e2832" />
            <circle cx={44.5} cy={53.5} r={1.8} fill="#ffffff" />
            <ellipse cx={74} cy={56} rx={5} ry={7} fill="#1e2832" />
            <circle cx={72.5} cy={53.5} r={1.8} fill="#ffffff" />
            <path
              d="M46 74 Q60 88 74 74"
              fill="none"
              stroke="#1e2832"
              strokeWidth={4}
              strokeLinecap="round"
            />
          </g>
        ) : null}

        {mood === 'think' ? (
          <g data-mood-layer="think">
            <path
              d="M39 45 Q46 41 53 45"
              fill="none"
              stroke="#1e2832"
              strokeWidth={2.8}
              strokeLinecap="round"
            />
            <path
              d="M67 43 Q74 38 81 44"
              fill="none"
              stroke="#1e2832"
              strokeWidth={2.8}
              strokeLinecap="round"
            />
            <ellipse cx={48} cy={54} rx={4.8} ry={6.5} fill="#1e2832" />
            <circle cx={49.5} cy={51.5} r={1.6} fill="#ffffff" />
            <ellipse cx={76} cy={54} rx={4.8} ry={6.5} fill="#1e2832" />
            <circle cx={77.5} cy={51.5} r={1.6} fill="#ffffff" />
            <circle
              cx={60}
              cy={79}
              r={5.2}
              fill="none"
              stroke="#1e2832"
              strokeWidth={3.5}
            />
          </g>
        ) : null}

        {mood === 'celebrate' ? (
          <g data-mood-layer="celebrate">
            <path
              d="M39 58 Q46 48 53 58"
              fill="none"
              stroke="#1e2832"
              strokeWidth={3.8}
              strokeLinecap="round"
            />
            <path
              d="M67 58 Q74 48 81 58"
              fill="none"
              stroke="#1e2832"
              strokeWidth={3.8}
              strokeLinecap="round"
            />
            <path
              d="M44 73 Q60 92 76 73 Z"
              fill="#d62839"
              stroke="#1e2832"
              strokeWidth={3.5}
              strokeLinejoin="round"
            />
            {/* Linhas acústicas e estrelas de celebração */}
            <path
              d="M10 18 Q6 12 12 8 M110 18 Q114 12 108 8"
              fill="none"
              stroke="#fb8500"
              strokeWidth={2.8}
              strokeLinecap="round"
            />
            <path
              d="M14 40 L16 44 L20 46 L16 48 L14 52 L12 48 L8 46 L12 44 Z"
              fill="#ffb703"
            />
            <path
              d="M106 40 L108 44 L112 46 L108 48 L106 52 L104 48 L100 46 L104 44 Z"
              fill="#ffb703"
            />
          </g>
        ) : null}

        {mood === 'hint' ? (
          <g data-mood-layer="hint">
            <ellipse cx={46} cy={56} rx={5} ry={7} fill="#1e2832" />
            <circle cx={44.5} cy={53.5} r={1.8} fill="#ffffff" />
            {/* Olho direito piscando amigavelmente */}
            <path
              d="M67 56 Q74 50 81 56"
              fill="none"
              stroke="#1e2832"
              strokeWidth={3.6}
              strokeLinecap="round"
            />
            <path
              d="M47 75 Q60 86 73 74"
              fill="none"
              stroke="#1e2832"
              strokeWidth={3.8}
              strokeLinecap="round"
            />
            {/* Halo luminoso de dica junto à sineta direita */}
            <circle
              cx={108}
              cy={20}
              r={7}
              fill="#ffb703"
              stroke="#fb8500"
              strokeWidth={2}
              data-hint-bulb="true"
            />
            <line
              x1={108}
              y1={8}
              x2={108}
              y2={10.5}
              stroke="#fb8500"
              strokeWidth={2}
              strokeLinecap="round"
            />
            <line
              x1={117}
              y1={20}
              x2={119.5}
              y2={20}
              stroke="#fb8500"
              strokeWidth={2}
              strokeLinecap="round"
            />
          </g>
        ) : null}
      </g>
    </svg>
  );
}

export default TicMascot;
