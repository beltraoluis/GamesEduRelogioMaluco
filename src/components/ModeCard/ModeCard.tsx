// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import type { ReactElement } from 'react';

import { StarRating } from '@/components/StarRating';
import type { ModeCardProps, ModeId } from '@/contracts';
import { UiIcon, type UiIconName } from '@/ui/icons/UiIcons';
import { ModeIllustration } from '@/ui/illustrations/ModeIllustration';

import { readDomTemplate } from '@/content/runtimeDomData';

import styles from './ModeCard.module.css';

const MODE_ICON: Readonly<Record<ModeId, UiIconName>> = {
  numbers: 'DigitalBlocks',
  words: 'PuzzleWords',
  hands: 'ClockHands',
  explore: 'CompassExplore',
};

function CardFrame({ mode, stars, onSelect, children }: ModeCardProps & { children: ReactElement }): ReactElement {

  return (
    <button
      type="button"
      className={styles.card}
      onClick={() => onSelect(mode.id)}
      data-mode-card={mode.id}
      data-motion="spring"
    >
      {children}
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

export function ModeCard(props: ModeCardProps): ReactElement {
  const { mode } = props;
  return (
    <CardFrame {...props}>
      <>
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
      </>
    </CardFrame>
  );
}

/** The Home screen displays the four canonical modes from the build. */
export function HomeModeCard(props: ModeCardProps): ReactElement {
  if (!import.meta.env.PROD) return <ModeCard {...props} />;
  return (
    <CardFrame {...props}>
      <div className={styles.staticContent} dangerouslySetInnerHTML={{ __html: readDomTemplate(`rm-card-${props.mode.id}`) ?? '' }} />
    </CardFrame>
  );
}

export default ModeCard;
