// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { useId, useState, type ReactElement } from 'react';

import { AppMenu } from '@/components/AppMenu';
import { LevelSelector } from '@/components/LevelSelector';
import { ModeCard } from '@/components/ModeCard';
import { TeachersDialog } from '@/components/TeachersDialog';
import { TicMascot } from '@/components/TicMascot';
import { UpdateToast } from '@/components/UpdateToast';
import { APP_COPY } from '@/content/copy';
import type {
  LevelId,
  ModeId,
  Preferences,
  PwaApi,
  ServiceWorkerUpdateApi,
  StarCount,
} from '@/contracts';
import { LEVELS } from '@/domain/levels';
import { MODES } from '@/domain/modes';

import styles from './HomeScreen.module.css';

export interface HomeScreenProps {
  readonly prefs: Preferences;
  readonly persistent: boolean;
  readonly onSelectMode: (id: ModeId) => void;
  readonly onChangeLevel: (id: LevelId) => void;
  readonly onToggleSound: () => void;
  readonly onToggleVoice: () => void;
  readonly onResetStars: () => void;
  readonly update: ServiceWorkerUpdateApi;
  readonly sourceUrl: string;
  readonly pwa?: Pick<PwaApi, 'canInstall' | 'install' | 'isStandalone' | 'showIosInstallTip'> & {
    readonly offlineReady?: boolean;
  };
}

const DEFAULT_PWA: Pick<
  PwaApi,
  'canInstall' | 'install' | 'isStandalone' | 'showIosInstallTip'
> = Object.freeze({
  canInstall: false,
  install: async () => 'unavailable' as const,
  isStandalone: false,
  showIosInstallTip: false,
});

export function HomeScreen({
  prefs,
  persistent,
  onSelectMode,
  onChangeLevel,
  onToggleSound,
  onToggleVoice,
  onResetStars,
  update,
  sourceUrl,
  pwa = DEFAULT_PWA,
}: HomeScreenProps): ReactElement {
  const baseId = useId();
  const titleId = `${baseId}-ht`;
  const levelId = `${baseId}-lh`;
  const modeId = `${baseId}-mh`;
  const [teachersOpen, setTeachersOpen] = useState(false);

  return (
    <section className={styles.screen} aria-labelledby={titleId} data-screen="home">
      <UpdateToast
        visible={update.updateReady}
        onApply={update.applyUpdate}
        onDismiss={update.dismissToast}
      />

      <header className={styles.hero}>
        <div className={styles.heroIdentity}>
          <div className={styles.mascotWrap}>
            <TicMascot mood="happy" size="md" ambient="day" />
          </div>
          <div className={styles.titleBlock}>
            <h1 id={titleId} className={styles.title}>
              {APP_COPY.home.title}
            </h1>
            <p className={styles.subtitle}>{APP_COPY.home.subtitle}</p>
          </div>
        </div>

        <AppMenu
          sound={prefs.sound}
          voice={prefs.voice}
          onToggleSound={onToggleSound}
          onToggleVoice={onToggleVoice}
          onOpenTeachers={() => setTeachersOpen(true)}
          sourceUrl={sourceUrl}
          pwa={pwa}
        />
      </header>

      <section className={styles.section} aria-labelledby={levelId}>
        <h2 id={levelId} className={styles.sectionTitle}>
          {APP_COPY.home.levelSection}
        </h2>
        <LevelSelector levels={LEVELS} current={prefs.level} onChange={onChangeLevel} />
      </section>

      <section className={styles.section} aria-labelledby={modeId}>
        <h2 id={modeId} className={styles.sectionTitle}>
          {APP_COPY.home.modeSection}
        </h2>
        <div className={styles.modesGrid}>
          {MODES.map((mode) => {
            const stars: StarCount | null =
              mode.id === 'explore' ? null : (prefs.stars[`${mode.id}-${prefs.level}`] ?? 0);
            return <ModeCard key={mode.id} mode={mode} stars={stars} onSelect={onSelectMode} />;
          })}
        </div>
      </section>

      <TeachersDialog
        open={teachersOpen}
        onClose={() => setTeachersOpen(false)}
        onResetStars={onResetStars}
        sourceUrl={sourceUrl}
        persistent={persistent}
      />
    </section>
  );
}

export default HomeScreen;
