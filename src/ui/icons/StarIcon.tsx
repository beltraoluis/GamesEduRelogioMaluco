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

export const SPRITE_URL = `${import.meta.env.BASE_URL}icons/sprite.svg`;

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
      strokeLinecap="round"
      strokeLinejoin="round"
      data-star-variant={resolvedVariant}
      {...(isDecorative ? { 'aria-hidden': 'true' } : { role: 'img', 'aria-label': title })}
      {...(className === undefined ? {} : { className })}
    >
      {!isDecorative ? <title>{title}</title> : null}
      <use href={`${SPRITE_URL}#star-${resolvedVariant}`} />
    </svg>
  );
}

export default StarIcon;
