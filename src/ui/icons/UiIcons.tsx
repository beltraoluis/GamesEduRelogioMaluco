// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import type { ReactElement } from 'react';

import { StarIcon } from './StarIcon';

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

function renderGlyph(name: UiIconName): ReactElement {
  switch (name) {
    case 'DigitalBlocks':
      return (
        <>
          <rect x={2.5} y={5} width={8.5} height={14} rx={2.5} fill="currentColor" opacity={0.22} />
          <rect x={13} y={5} width={8.5} height={14} rx={2.5} fill="currentColor" opacity={0.14} />
          <rect x={2.5} y={5} width={8.5} height={14} rx={2.5} stroke="currentColor" strokeWidth={2.25} />
          <rect x={13} y={5} width={8.5} height={14} rx={2.5} stroke="currentColor" strokeWidth={2.25} />
          <circle cx={12} cy={9.5} r={1} fill="currentColor" />
          <circle cx={12} cy={14.5} r={1} fill="currentColor" />
        </>
      );
    case 'PuzzleWords':
      return (
        <>
          <path
            d="M4 6.5h16a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z"
            fill="currentColor"
            opacity={0.22}
          />
          <path
            d="M4 6.5h16a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z"
            stroke="currentColor"
            strokeWidth={2.25}
          />
          <path d="M6.5 10.5h5M6.5 13.5h11" stroke="currentColor" strokeWidth={2.25} />
        </>
      );
    case 'ClockHands':
      return (
        <>
          <circle cx={12} cy={12} r={9} fill="currentColor" opacity={0.22} />
          <circle cx={12} cy={12} r={9} stroke="currentColor" strokeWidth={2.25} />
          <path d="M12 12V6.5M12 12l4.5 2.5" stroke="currentColor" strokeWidth={2.25} />
          <circle cx={12} cy={12} r={1.6} fill="currentColor" />
        </>
      );
    case 'CompassExplore':
      return (
        <>
          <circle cx={11} cy={11} r={7.5} fill="currentColor" opacity={0.22} />
          <circle cx={11} cy={11} r={7.5} stroke="currentColor" strokeWidth={2.25} />
          <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth={2.5} />
          <path d="M13.8 8.2l-1.6 4.2-4.2 1.6 1.6-4.2 4.2-1.6z" stroke="currentColor" strokeWidth={1.85} />
        </>
      );
    case 'PeriodMadrugada':
      return (
        <>
          <circle cx={12} cy={12} r={9} fill="currentColor" opacity={0.22} />
          <path
            d="M12 5.5l1.4 3.1 3.1 1.4-3.1 1.4L12 14.5l-1.4-3.1-3.1-1.4 3.1-1.4L12 5.5z"
            stroke="currentColor"
            strokeWidth={2}
          />
          <path d="M5 17.5h14" stroke="currentColor" strokeWidth={2} />
        </>
      );
    case 'PeriodManha':
      return (
        <>
          <path d="M7 16a5 5 0 0 1 10 0" fill="currentColor" opacity={0.22} />
          <path d="M7 16a5 5 0 0 1 10 0" stroke="currentColor" strokeWidth={2.25} />
          <path d="M4 16h16M12 6v2.5M6.3 9.8l1.8 1.8M17.7 9.8l-1.8 1.8" stroke="currentColor" strokeWidth={2.25} />
        </>
      );
    case 'PeriodTarde':
      return (
        <>
          <circle cx={12} cy={12} r={4.5} fill="currentColor" opacity={0.22} />
          <circle cx={12} cy={12} r={4.5} stroke="currentColor" strokeWidth={2.25} />
          <path
            d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6"
            stroke="currentColor"
            strokeWidth={2.25}
          />
        </>
      );
    case 'PeriodNoite':
      return (
        <>
          <path
            d="M14.5 4.5a7.5 7.5 0 1 0 5 13.2A6.5 6.5 0 0 1 14.5 4.5z"
            fill="currentColor"
            opacity={0.22}
          />
          <path
            d="M14.5 4.5a7.5 7.5 0 1 0 5 13.2A6.5 6.5 0 0 1 14.5 4.5z"
            stroke="currentColor"
            strokeWidth={2.25}
          />
        </>
      );
    case 'TeacherBook':
      return (
        <>
          <path
            d="M3 6.5A2.5 2.5 0 0 1 5.5 4H12v15H5.5A2.5 2.5 0 0 0 3 21.5v-15zM21 6.5A2.5 2.5 0 0 0 18.5 4H12v15h6.5a2.5 2.5 0 0 1 2.5 2.5v-15z"
            fill="currentColor"
            opacity={0.22}
          />
          <path
            d="M3 6.5A2.5 2.5 0 0 1 5.5 4H12v15H5.5A2.5 2.5 0 0 0 3 21.5v-15zM21 6.5A2.5 2.5 0 0 0 18.5 4H12v15h6.5a2.5 2.5 0 0 1 2.5 2.5v-15z"
            stroke="currentColor"
            strokeWidth={2.25}
          />
        </>
      );
    case 'InstallApp':
      return (
        <>
          <rect x={5} y={3} width={14} height={18} rx={3} fill="currentColor" opacity={0.22} />
          <rect x={5} y={3} width={14} height={18} rx={3} stroke="currentColor" strokeWidth={2.25} />
          <path d="M12 7.5v7M9 12l3 3 3-3M9 17.5h6" stroke="currentColor" strokeWidth={2.25} />
        </>
      );
    case 'OfflineCheck':
    case 'CheckBadge':
      return (
        <>
          <circle cx={12} cy={12} r={9} fill="currentColor" opacity={0.22} />
          <circle cx={12} cy={12} r={9} stroke="currentColor" strokeWidth={2.25} />
          <path d="M8.2 12.3l2.6 2.6 5.2-5.4" stroke="currentColor" strokeWidth={2.4} />
        </>
      );
    case 'BellOn':
    case 'VolumeOn':
      return (
        <>
          <path
            d="M6 10a6 6 0 0 1 12 0v4.2l1.6 2.3H4.4L6 14.2V10z"
            fill="currentColor"
            opacity={0.22}
          />
          <path
            d="M6 10a6 6 0 0 1 12 0v4.2l1.6 2.3H4.4L6 14.2V10zM10 19.5a2.2 2.2 0 0 0 4 0"
            stroke="currentColor"
            strokeWidth={2.25}
          />
        </>
      );
    case 'BellOff':
    case 'VolumeOff':
      return (
        <>
          <path
            d="M6 10a6 6 0 0 1 12 0v4.2l1.6 2.3H4.4L6 14.2V10z"
            fill="currentColor"
            opacity={0.14}
          />
          <path
            d="M6 10a6 6 0 0 1 12 0v4.2l1.6 2.3H4.4L6 14.2V10zM10 19.5a2.2 2.2 0 0 0 4 0M4 4l16 16"
            stroke="currentColor"
            strokeWidth={2.25}
          />
        </>
      );
    case 'VoiceOn':
      return (
        <>
          <rect x={8.5} y={3.5} width={7} height={11} rx={3.5} fill="currentColor" opacity={0.22} />
          <rect x={8.5} y={3.5} width={7} height={11} rx={3.5} stroke="currentColor" strokeWidth={2.25} />
          <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" stroke="currentColor" strokeWidth={2.25} />
        </>
      );
    case 'VoiceOff':
      return (
        <>
          <rect x={8.5} y={3.5} width={7} height={11} rx={3.5} fill="currentColor" opacity={0.14} />
          <rect x={8.5} y={3.5} width={7} height={11} rx={3.5} stroke="currentColor" strokeWidth={2.25} />
          <path
            d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7M4 4l16 16"
            stroke="currentColor"
            strokeWidth={2.25}
          />
        </>
      );
    case 'HintBulb':
      return (
        <>
          <path
            d="M9 17h6l.8-2.3a6.5 6.5 0 1 0-7.6 0L9 17z"
            fill="currentColor"
            opacity={0.22}
          />
          <path
            d="M9 17h6l.8-2.3a6.5 6.5 0 1 0-7.6 0L9 17zM9.5 20.5h5"
            stroke="currentColor"
            strokeWidth={2.25}
          />
        </>
      );
    case 'SpeakWave':
      return (
        <>
          <path d="M4 9.5v5h3.8L13 19V5L7.8 9.5H4z" fill="currentColor" opacity={0.22} />
          <path
            d="M4 9.5v5h3.8L13 19V5L7.8 9.5H4zM16.5 8.8a4.8 4.8 0 0 1 0 6.4M19.2 6.2a8.5 8.5 0 0 1 0 11.6"
            stroke="currentColor"
            strokeWidth={2.25}
          />
        </>
      );
    case 'NextArrow':
      return (
        <>
          <circle cx={12} cy={12} r={9} fill="currentColor" opacity={0.22} />
          <path d="M5 12h13M13 7l5.5 5-5.5 5" stroke="currentColor" strokeWidth={2.4} />
        </>
      );
    case 'BackArrow':
      return (
        <>
          <circle cx={12} cy={12} r={9} fill="currentColor" opacity={0.22} />
          <path d="M19 12H6M11 7l-5.5 5 5.5 5" stroke="currentColor" strokeWidth={2.4} />
        </>
      );
    case 'StopwatchNow':
      return (
        <>
          <circle cx={12} cy={13} r={7.5} fill="currentColor" opacity={0.22} />
          <circle cx={12} cy={13} r={7.5} stroke="currentColor" strokeWidth={2.25} />
          <path d="M9.5 3h5M12 3v2.5M12 13l3-2.5M17.8 7.2l1.5-1.5" stroke="currentColor" strokeWidth={2.25} />
        </>
      );
    case 'HourglassTime':
      return (
        <>
          <path d="M6.5 4h11l-4 7 4 7h-11l4-7-4-7z" fill="currentColor" opacity={0.22} />
          <path d="M5 4h14M5 20h14M6.8 4l5.2 8 5.2-8M6.8 20l5.2-8 5.2 8" stroke="currentColor" strokeWidth={2.25} />
        </>
      );
    case 'RefreshArrow':
      return (
        <>
          <circle cx={12} cy={12} r={8.5} fill="currentColor" opacity={0.22} />
          <path
            d="M19.5 6.5v4.5H15M19.2 11A7.5 7.5 0 1 0 18 16.5"
            stroke="currentColor"
            strokeWidth={2.25}
          />
        </>
      );
    case 'HomeWorkshop':
      return (
        <>
          <path d="M4.5 10.8L12 4l7.5 6.8V20H4.5v-9.2z" fill="currentColor" opacity={0.22} />
          <path
            d="M3.5 11.5L12 4l8.5 7.5M5.5 10.2V20h13v-9.8M9.8 20v-5.5h4.4V20"
            stroke="currentColor"
            strokeWidth={2.25}
          />
        </>
      );
    case 'MinuteHandBadge':
      return (
        <>
          <path d="M12 2.5L21.5 12 12 21.5 2.5 12 12 2.5z" fill="currentColor" opacity={0.22} />
          <path d="M12 2.5L21.5 12 12 21.5 2.5 12 12 2.5z" stroke="currentColor" strokeWidth={2.1} />
          <path d="M7.5 12h6.5" stroke="currentColor" strokeWidth={2.25} />
          <circle cx={15.8} cy={12} r={1.8} stroke="currentColor" strokeWidth={2} />
        </>
      );
    case 'HourHandBadge':
      return (
        <>
          <circle cx={12} cy={12} r={9} fill="currentColor" opacity={0.22} />
          <circle cx={12} cy={12} r={9} stroke="currentColor" strokeWidth={2.25} />
          <path d="M7.5 12h6.8M12.5 9.2l3.3 2.8-3.3 2.8" stroke="currentColor" strokeWidth={2.4} />
        </>
      );
    case 'CloseCross':
      return (
        <>
          <circle cx={12} cy={12} r={9} fill="currentColor" opacity={0.22} />
          <path d="M7.5 7.5l9 9M16.5 7.5l-9 9" stroke="currentColor" strokeWidth={2.4} />
        </>
      );
    case 'ChevronLeft':
      return (
        <>
          <circle cx={12} cy={12} r={9} fill="currentColor" opacity={0.22} />
          <path d="M14.2 7.2L9.2 12l5 4.8" stroke="currentColor" strokeWidth={2.5} />
        </>
      );
    case 'ChevronRight':
      return (
        <>
          <circle cx={12} cy={12} r={9} fill="currentColor" opacity={0.22} />
          <path d="M9.8 7.2l5 4.8-5 4.8" stroke="currentColor" strokeWidth={2.5} />
        </>
      );
    case 'ChevronDown':
      return (
        <>
          <circle cx={12} cy={12} r={9} fill="currentColor" opacity={0.22} />
          <path d="M7.2 9.8l4.8 5 4.8-5" stroke="currentColor" strokeWidth={2.5} />
        </>
      );
    case 'TrophyCup':
      return (
        <>
          <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" fill="currentColor" opacity={0.22} />
          <path
            d="M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4.5a2.5 2.5 0 0 0 2.5 4M17 6h2.5a2.5 2.5 0 0 1-2.5 4M12 14v5M8.5 19.5h7"
            stroke="currentColor"
            strokeWidth={2.25}
          />
        </>
      );
    case 'SparkleStar':
    case 'StarFilled':
    case 'StarOutline':
      return <g />;
  }
}

export function UiIcon({ name, size = 24, className, title }: UiIconProps): ReactElement {
  if (name === 'StarFilled') {
    return (
      <StarIcon
        filled
        variant="filled"
        size={size}
        {...(className === undefined ? {} : { className })}
        {...(title === undefined ? {} : { title })}
      />
    );
  }
  if (name === 'StarOutline') {
    return (
      <StarIcon
        filled={false}
        variant="outline"
        size={size}
        {...(className === undefined ? {} : { className })}
        {...(title === undefined ? {} : { title })}
      />
    );
  }
  if (name === 'SparkleStar') {
    return (
      <StarIcon
        filled
        variant="sparkle"
        size={size}
        {...(className === undefined ? {} : { className })}
        {...(title === undefined ? {} : { title })}
      />
    );
  }

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
      data-ui-icon={name}
      {...(isDecorative ? { 'aria-hidden': 'true' } : { role: 'img', 'aria-label': title })}
      {...(className === undefined ? {} : { className })}
    >
      {!isDecorative ? <title>{title}</title> : null}
      {renderGlyph(name)}
    </svg>
  );
}

export default UiIcon;
