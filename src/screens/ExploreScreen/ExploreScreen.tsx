// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
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
import { APP_COPY } from '@/content/copy';
import {
  ATMOSPHERE_AMBIENT,
  type Atmosphere,
  type ClockTime,
  type SoundApi,
  type SpeechApi,
} from '@/contracts';
import { clockMath } from '@/domain/clockMath';
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

const ATMOSPHERE_THEME_COLOR: Readonly<Record<Atmosphere, string>> = {
  madrugada: '#1b1947',
  manha: '#ffb703',
  tarde: '#fb8500',
  noite: '#0f172a',
};

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
  useLayoutEffect(() => {
    timeRef.current = time;
  }, [time]);

  const period = clockMath.periodOf(time.h);
  const atmosphere = clockMath.atmosphereOf(time.h);
  const ambient = ATMOSPHERE_AMBIENT[atmosphere];
  const phrase12 = clockMath.phraseText(
    clockMath.phraseParts(time, { withPeriod: true, useHalf: true }),
  );
  const phrase24 = `ou: ${clockMath.phrase24(time)}`;

  // Aplica data-atmosphere em document.documentElement e atualiza <meta name="theme-color">
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const previousAtmosphere = root.getAttribute('data-atmosphere');
    const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previousThemeColor = themeMeta?.getAttribute('content') ?? null;

    return () => {
      if (previousAtmosphere === null) {
        root.removeAttribute('data-atmosphere');
      } else {
        root.setAttribute('data-atmosphere', previousAtmosphere);
      }
      if (themeMeta && previousThemeColor !== null) {
        themeMeta.setAttribute('content', previousThemeColor);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-atmosphere', atmosphere);
    const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute('content', ATMOSPHERE_THEME_COLOR[atmosphere]);
    }
  }, [atmosphere]);

  useEffect(() => {
    if (!isLive) return;
    const tick = () => {
      const d = new Date();
      setTime({ h: d.getHours(), m: d.getMinutes(), s: d.getSeconds() });
    };
    const timerId = setInterval(tick, 1000);
    return () => clearInterval(timerId);
  }, [isLive]);

  const stopLive = useCallback(() => {
    setIsLive(false);
    const cur = timeRef.current;
    if (cur.s !== undefined) {
      const clean: ClockTime = { h: cur.h, m: cur.m };
      timeRef.current = clean;
      setTime(clean);
    }
  }, []);

  const handleClockChange = useCallback(
    (nextTime: ClockTime) => {
      const prev = timeRef.current;
      const changed = prev.h !== nextTime.h || prev.m !== nextTime.m;
      const clean: ClockTime = { h: nextTime.h, m: nextTime.m };
      timeRef.current = clean;
      setIsLive(false);
      setTime(clean);
      if (changed) {
        sound.unlock();
        sound.play('tick');
      }
    },
    [sound],
  );

  const handleTogglePeriod = useCallback(() => {
    setIsLive(false);
    const prev = timeRef.current;
    const next: ClockTime = { h: (prev.h + 12) % 24, m: prev.m };
    timeRef.current = next;
    setTime(next);
    sound.unlock();
    sound.play('pick');
  }, [sound]);

  const handleToggleNow = useCallback(() => {
    sound.unlock();
    sound.play('pick');
    if (isLive) {
      setIsLive(false);
      const prev = timeRef.current;
      const clean: ClockTime = { h: prev.h, m: prev.m };
      timeRef.current = clean;
      setTime(clean);
      return;
    }
    const now = new Date();
    const nowTime: ClockTime = {
      h: now.getHours(),
      m: now.getMinutes(),
      s: now.getSeconds(),
    };
    timeRef.current = nowTime;
    setTime(nowTime);
    setIsLive(true);
    const nowPhrase = clockMath.phraseText(
      clockMath.phraseParts(nowTime, { withPeriod: true, useHalf: true }),
    );
    speech.speak(`Agora: ${nowPhrase}`);
  }, [isLive, sound, speech]);

  const handleListen = useCallback(() => {
    sound.unlock();
    sound.play('pick');
    speech.speak(phrase12);
  }, [phrase12, sound, speech]);

  const handleHome = useCallback(() => {
    setIsLive(false);
    speech.cancel();
    onHome();
  }, [onHome, speech]);

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
          aria-label={APP_COPY.game.back}
          onClick={handleHome}
          icon={<UiIcon name="BackArrow" size={24} />}
        />
        <h1 id={titleId} className={styles.topbarTitle}>
          {APP_COPY.explore.title}
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
              {APP_COPY.explore.now}
            </Button>

            <Button
              variant="soft"
              size="sm"
              onClick={handleListen}
              icon={<UiIcon name="SpeakWave" size={20} />}
            >
              {APP_COPY.explore.listen}
            </Button>
          </div>

          <ul className={styles.facts}>
            <li className={styles.factItem}>
              <HandBadge kind="hour-hand" size="inline" />
              <span>{APP_COPY.explore.facts[0]}</span>
            </li>
            <li className={styles.factItem}>
              <HandBadge kind="minute-hand" size="inline" />
              <span>{APP_COPY.explore.facts[1]}</span>
            </li>
            <li className={styles.factItem}>
              <span className={styles.secondBadge} aria-hidden="true">
                <span className={styles.secondNeedle} />
              </span>
              <span>{APP_COPY.explore.facts[2]}</span>
            </li>
            <li className={styles.factItem}>
              <span className={styles.hourglassIcon} aria-hidden="true">
                <UiIcon name="HourglassTime" size={18} />
              </span>
              <span>{APP_COPY.explore.facts[3]}</span>
            </li>
          </ul>

          <p className={styles.dragTip}>{APP_COPY.explore.dragTip}</p>
        </div>
      </div>
    </section>
  );
}

export default ExploreScreen;
