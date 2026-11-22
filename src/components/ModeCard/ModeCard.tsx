// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import type { ReactElement } from 'react';

import { StarRating } from '@/components/StarRating';
import type { ModeCardProps, ModeId } from '@/contracts';
import { UiIcon, type UiIconName } from '@/ui/icons/UiIcons';
import { ModeIllustration } from '@/ui/illustrations/ModeIllustration';

import styles from './ModeCard.module.css';

const MODE_ICON: Readonly<Record<ModeId, UiIconName>> = {
  numbers: 'DigitalBlocks',
  words: 'PuzzleWords',
  hands: 'ClockHands',
  explore: 'CompassExplore',
};

export function ModeCard({ mode, stars, onSelect }: ModeCardProps): ReactElement {
  const modeClass = styles[mode.id];
  const cardClass = [styles.card, modeClass].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={cardClass}
      onClick={() => onSelect(mode.id)}
      data-mode-card={mode.id}
      data-motion="spring"
    >
      <div className={styles.illustrationWrap} aria-hidden="true">
        <ModeIllustration
          mode={mode.id}
          width={384}
          height={384}
          {...(styles.illustration === undefined ? {} : { className: styles.illustration })}
        />
        <span className={styles.modeBadge}>
          <UiIcon name={MODE_ICON[mode.id]} size={18} />
        </span>
      </div>

      <div className={styles.body}>
        <span className={styles.title}>{mode.title}</span>
        <span className={styles.description}>{mode.description}</span>
      </div>

      <div className={styles.footer}>
        {stars !== null ? (
          <StarRating value={stars} label={`${stars} de 3 estrelas`} size="sm" />
        ) : (
          <span className={styles.exploreTag}>Livre · 24h</span>
        )}
      </div>
    </button>
  );
}

export default ModeCard;
