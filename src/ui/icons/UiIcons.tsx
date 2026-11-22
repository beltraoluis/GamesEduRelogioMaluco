// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import type { ReactElement } from 'react';

import { SpriteIcon, StarIcon } from './StarIcon';

export const UI_ICON_NAMES = [
  'DigitalBlocks',
  'PuzzleWords',
  'ClockHands',
  'CompassExplore',
  'PeriodMadrugada',
  'PeriodManha',
  'PeriodTarde',
  'PeriodNoite',
  'TeacherBook',
  'InstallApp',
  'OfflineCheck',
  'BellOn',
  'VolumeOn',
  'BellOff',
  'VolumeOff',
  'VoiceOn',
  'VoiceOff',
  'SparkleStar',
  'StarFilled',
  'StarOutline',
  'HintBulb',
  'SpeakWave',
  'CheckBadge',
  'NextArrow',
  'StopwatchNow',
  'HourglassTime',
  'RefreshArrow',
  'HomeWorkshop',
  'MinuteHandBadge',
  'HourHandBadge',
  'BackArrow',
  'CloseCross',
  'ChevronLeft',
  'ChevronRight',
  'ChevronDown',
  'TrophyCup',
] as const;

export type UiIconName = (typeof UI_ICON_NAMES)[number];

export interface UiIconProps {
  readonly name: UiIconName;
  readonly size?: number;
  readonly className?: string | undefined;
  readonly title?: string | undefined;
}

const ALIAS: Partial<Record<UiIconName, string>> = {
  OfflineCheck: 'CheckBadge',
  VolumeOn: 'BellOn',
  VolumeOff: 'BellOff',
};

export function UiIcon({ name, size = 24, className, title }: UiIconProps): ReactElement {
  if (name === 'StarFilled' || name === 'StarOutline' || name === 'SparkleStar') {
    const variant = name === 'StarFilled' ? 'filled' : name === 'StarOutline' ? 'outline' : 'sparkle';
    return (
      <StarIcon
        filled={name !== 'StarOutline'}
        variant={variant}
        size={size}
        className={className}
        title={title}
      />
    );
  }

  return <SpriteIcon symbol={`ui-${ALIAS[name] ?? name}`} data-ui-icon={name} size={size} title={title} className={className} />;
}

export default UiIcon;
