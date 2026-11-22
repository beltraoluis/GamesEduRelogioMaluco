// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { useId, type ReactElement } from 'react';

import { Button } from '@/components/Button';
import { StarRating } from '@/components/StarRating';
import { TicMascot } from '@/components/TicMascot';
import { APP_COPY } from '@/content/copy';
import type { RoundSummary } from '@/contracts';
import { RESULT_TITLES, resultText } from '@/domain/scoring';
import { UiIcon } from '@/ui/icons/UiIcons';

import styles from './ResultScreen.module.css';

export interface ResultScreenProps {
  readonly summary: RoundSummary;
  readonly newRecord: boolean;
  readonly onPlayAgain: () => void;
  readonly onHome: () => void;
}

export function ResultScreen({
  summary,
  newRecord,
  onPlayAgain,
  onHome,
}: ResultScreenProps): ReactElement {
  const titleId = `${useId()}-rt`;

  return (
    <section
      className={styles.screen}
      aria-labelledby={titleId}
      data-screen="result"
      data-result-stars={summary.stars}
      data-new-record={String(newRecord)}
    >
      <div className={styles.card}>
        <div className={styles.mascotWrap}>
          <TicMascot mood="celebrate" size="lg" ambient="day" bounceSeq={1} />
        </div>

        {newRecord && (
          <div className={styles.recordBadge} data-record-badge="true">
            <UiIcon name="TrophyCup" size={18} />
            <span>Novo recorde!</span>
          </div>
        )}

        <h1 id={titleId} className={styles.title}>
          {RESULT_TITLES[summary.stars]}
        </h1>

        <div className={styles.starsRegion} aria-live="polite">
          <StarRating
            value={summary.stars}
            label={`${summary.stars} de 3 estrelas`}
            size="lg"
            animate
          />
        </div>

        <p className={styles.summaryText}>{resultText(summary)}</p>

        <div className={styles.actions}>
          <Button
            variant="go"
            size="lg"
            onClick={onPlayAgain}
            icon={<UiIcon name="RefreshArrow" size={22} />}
          >
            {APP_COPY.result.playAgain}
          </Button>
          <Button
            variant="soft"
            size="lg"
            onClick={onHome}
            icon={<UiIcon name="HomeWorkshop" size={22} />}
          >
            {APP_COPY.result.home}
          </Button>
        </div>
      </div>
    </section>
  );
}

export default ResultScreen;
