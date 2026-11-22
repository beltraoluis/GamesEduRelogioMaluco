// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { UI_COPY, content, readDomTemplate } from '@/content/runtimeDomData';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
} from 'react';

import { AnalogClock } from '@/components/AnalogClock';
import { Button } from '@/components/Button';
import { DigitalClock } from '@/components/DigitalClock';
import { HandBadge } from '@/components/HandBadge';
import { PeriodBadge } from '@/components/PeriodBadge';
import { TicMascot } from '@/components/TicMascot';
import {
  ATMOSPHERE_AMBIENT,
  type Atmosphere,
  type ClockTime,
  type SoundApi,
  type SpeechApi,
} from '@/contracts';
import { atmosphereOf, periodOf, phrase24 as formatPhrase24, phraseParts, phraseText } from '@/domain/time';
import { describeAnalogHandPositions } from '@/screens/GameScreen';
import { UiIcon } from '@/ui/icons/UiIcons';

import styles from './ExploreScreen.module.css';

export interface ExploreScreenProps {
  /** Fala pedida pela criança ("Ouvir"/"Agora"); cancelada ao sair. */
  readonly speech: SpeechApi;
  /** "tick" ao girar os ponteiros, "pick" nos botões. */
  readonly sound: SoundApi;
  readonly onHome: () => void;
  /** Horário inicial opcional (padrão: 09:00). */
  readonly initialTime?: ClockTime;
}

const ATMOSPHERE_THEME_COLOR: Readonly<Record<Atmosphere, string>> = content.themeColors;

function wallTime(): ClockTime {
  const now = new Date();
  return { h: now.getHours(), m: now.getMinutes(), s: now.getSeconds() };
}

function spokenTime(time: ClockTime): string {
  return phraseText(phraseParts(time, { withPeriod: true, useHalf: true }));
}

export function ExploreScreen({
  speech,
  sound,
  onHome,
  initialTime,
}: ExploreScreenProps): ReactElement {
  const titleId = `${useId()}-explore-title`;

  const [time, setTime] = useState<ClockTime>(() => initialTime ?? { h: 9, m: 0 });
  const [isLive, setIsLive] = useState(false);

  const timeRef = useRef<ClockTime>(time);
  function updateTime(next: ClockTime) {
    timeRef.current = next;
    setTime(next);
  }

  const period = periodOf(time.h);
  const atmosphere = atmosphereOf(time.h);
  const ambient = ATMOSPHERE_AMBIENT[atmosphere];
  const phrase12 = spokenTime(time);
  const phrase24 = `ou: ${formatPhrase24(time)}`;

  useEffect(() => {
    const root = document.documentElement;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previous = root.dataset.atmosphere;
    const previousColor = meta?.content;
    root.dataset.atmosphere = atmosphere;
    if (meta) meta.content = ATMOSPHERE_THEME_COLOR[atmosphere];
    return () => {
      if (previous === undefined) delete root.dataset.atmosphere;
      else root.dataset.atmosphere = previous;
      if (meta && previousColor !== undefined) meta.content = previousColor;
    };
  }, [atmosphere]);

  useEffect(() => {
    if (!isLive) return;
    const timer = setInterval(() => updateTime(wallTime()), 1000);
    return () => clearInterval(timer);
  }, [isLive]);

  function play(effect: 'tick' | 'pick') {
    sound.unlock();
    sound.play(effect);
  }

  function setManualTime({ h, m }: ClockTime) {
    setIsLive(false);
    updateTime({ h, m });
  }

  function stopLive() {
    setManualTime(timeRef.current);
  }

  function handleClockChange(next: ClockTime) {
    const { h, m } = timeRef.current;
    if (next.h !== h || next.m !== m) play('tick');
    setManualTime(next);
  }

  function handleTogglePeriod() {
    const { h, m } = timeRef.current;
    setManualTime({ h: (h + 12) % 24, m });
    play('pick');
  }

  function handleToggleNow() {
    play('pick');
    if (isLive) return stopLive();
    const now = wallTime();
    updateTime(now);
    setIsLive(true);
    speech.speak(`Agora: ${spokenTime(now)}`);
  }

  function handleListen() {
    play('pick');
    speech.speak(phrase12);
  }

  function handleHome() {
    setIsLive(false);
    speech.cancel();
    onHome();
  }

  return (
    <section
      className={styles.screen}
      aria-labelledby={titleId}
      data-screen="explore"
      data-explore-atmosphere={atmosphere}
      data-explore-ambient={ambient}
    >
      <header className={styles.topbar}>
        <Button
          variant="icon"
          aria-label={UI_COPY.game.back}
          onClick={handleHome}
          icon={<UiIcon name="BackArrow" size={24} />}
        />
        <h1 id={titleId} className={styles.topbarTitle}>
          {UI_COPY.explore.title}
        </h1>
        <TicMascot mood="happy" size="sm" ambient={ambient} />
      </header>

      <div className={styles.exploreGrid}>
        <div className={styles.clockColumn}>
          <AnalogClock
            time={time}
            label={`Relógio analógico para explorar. Use as setas ou arraste os ponteiros. Posição atual: ${describeAnalogHandPositions(time)}.`}
            interactive
            minuteStep={1}
            linkHands
            showSeconds={isLive}
            minuteLabels
            size="lg"
            ambient={ambient}
            onGrab={stopLive}
            onChange={handleClockChange}
          />
        </div>

        <div className={styles.infoCard}>
          <DigitalClock hours={time.h} minutes={time.m} />

          <p className={styles.phrase} data-explore-phrase="12">
            {phrase12}
          </p>
          <p className={styles.phrase24} data-explore-phrase="24">
            {phrase24}
          </p>

          <div className={styles.controls}>
            <PeriodBadge period={period} onToggle={handleTogglePeriod} />

            <Button
              variant={isLive ? 'primary' : 'soft'}
              size="sm"
              aria-pressed={isLive}
              onClick={handleToggleNow}
              icon={<UiIcon name="StopwatchNow" size={20} />}
            >
              {UI_COPY.explore.now}
            </Button>

            <Button
              variant="soft"
              size="sm"
              onClick={handleListen}
              icon={<UiIcon name="SpeakWave" size={20} />}
            >
              {UI_COPY.explore.listen}
            </Button>
          </div>

          {readDomTemplate('rm-tpl-explore-facts') !== null ? (
            <div
              dangerouslySetInnerHTML={{
                __html: readDomTemplate('rm-tpl-explore-facts') ?? '',
              }}
            />
          ) : !import.meta.env.PROD ? (
            <>
              <ul className={styles.facts}>
                <li className={styles.factItem}>
                  <HandBadge kind="hour-hand" size="inline" />
                  <span>{UI_COPY.explore.facts[0]}</span>
                </li>
                <li className={styles.factItem}>
                  <HandBadge kind="minute-hand" size="inline" />
                  <span>{UI_COPY.explore.facts[1]}</span>
                </li>
                <li className={styles.factItem}>
                  <span className={styles.secondBadge} aria-hidden="true">
                    <span className={styles.secondNeedle} />
                  </span>
                  <span>{UI_COPY.explore.facts[2]}</span>
                </li>
                <li className={styles.factItem}>
                  <span className={styles.hourglassIcon} aria-hidden="true">
                    <UiIcon name="HourglassTime" size={18} />
                  </span>
                  <span>{UI_COPY.explore.facts[3]}</span>
                </li>
              </ul>

              <p className={styles.dragTip}>{UI_COPY.explore.dragTip}</p>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default ExploreScreen;
