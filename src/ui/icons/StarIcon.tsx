// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import type { ReactElement } from 'react';

export type StarIconVariant = 'filled' | 'outline' | 'sparkle';

export interface StarIconProps {
  readonly filled?: boolean;
  readonly variant?: StarIconVariant;
  readonly size?: number;
  readonly className?: string | undefined;
  readonly title?: string | undefined;
}

const STAR_PATH =
  'M12 2.4l2.78 5.63 6.22.9-4.5 4.39 1.06 6.19L12 16.58 6.44 19.51 7.5 13.32 3 8.93l6.22-.9L12 2.4z';

export function StarIcon({
  filled = true,
  variant,
  size = 24,
  className,
  title,
}: StarIconProps): ReactElement {
  const resolvedVariant: StarIconVariant = variant ?? (filled ? 'filled' : 'outline');
  const isDecorative = title === undefined || title.length === 0;

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      strokeLinecap="round"
      strokeLinejoin="round"
      data-star-variant={resolvedVariant}
      {...(isDecorative ? { 'aria-hidden': 'true' } : { role: 'img', 'aria-label': title })}
      {...(className === undefined ? {} : { className })}
    >
      {!isDecorative ? <title>{title}</title> : null}
      {resolvedVariant === 'filled' ? (
        <>
          <path
            d={STAR_PATH}
            fill="var(--color-warning-accent, #ffb703)"
            stroke="var(--color-warning-warm, #fb8500)"
            strokeWidth={1.85}
          />
          <path
            d="M12 4.8l1.75 3.55 3.92.57-2.84 2.77.67 3.9L12 13.75"
            fill="#ffffff"
            opacity={0.22}
          />
        </>
      ) : null}
      {resolvedVariant === 'outline' ? (
        <>
          <path
            d={STAR_PATH}
            fill="var(--color-surface-elevated, #fff9e6)"
            stroke="var(--color-border-ledge, #cbbd9f)"
            strokeWidth={1.85}
          />
          <path
            d={STAR_PATH}
            fill="currentColor"
            opacity={0.08}
          />
        </>
      ) : null}
      {resolvedVariant === 'sparkle' ? (
        <>
          <path
            d={STAR_PATH}
            fill="var(--color-warning-accent, #ffb703)"
            stroke="var(--color-warning-warm, #fb8500)"
            strokeWidth={1.85}
          />
          <circle cx={19.5} cy={4.5} r={1.3} fill="var(--color-warning-warm, #fb8500)" opacity={0.85} />
          <circle cx={4.5} cy={5.5} r={1} fill="var(--color-warning-accent, #ffb703)" opacity={0.85} />
        </>
      ) : null}
    </svg>
  );
}

export default StarIcon;
