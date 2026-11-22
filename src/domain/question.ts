// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { randomTime } from './clockMath';
import {
  displayHourOf,
  hourNumberOptions,
  hourWordOptions,
  minuteNumberOptions,
  minuteWordOptions,
  PERIOD_OPTIONS,
} from './distractors';
import { pick, shuffle } from './rng';
import { pad, periodOf, phrase24, phraseParts, phraseText, to12, wordToNumber } from './time';
import type {
  BankSpec,
  ClockTime,
  GameMode,
  Group,
  HandsQuestion,
  Level,
  NumbersQuestion,
  PhrasePart,
  Question,
  Rng,
  SlotSpec,
  Stimulus,
  TileSpec,
  WordsQuestion,
} from './types';

export const GROUP_NAMES: Readonly<Record<Group, string>> = {
  hour: 'horas',
  minute: 'minutos',
  period: 'período do dia',
};

export const SLOT_LABELS: Readonly<Record<Group, string>> = {
  hour: 'Lacuna das horas',
  minute: 'Lacuna dos minutos',
  period: 'Lacuna do período do dia',
};

export const slotIdOf = (group: Group): string => `slot-${group}`;

const slot = (group: Group, answer: string): SlotSpec => ({
  id: slotIdOf(group),
  group,
  answer,
  label: SLOT_LABELS[group],
});

function bank(
  group: Group,
  values: readonly { readonly value: string; readonly num: number | null }[],
  rng: Rng,
): BankSpec {
  const tiles: TileSpec[] = shuffle(values, rng).map((v, i) => {
    const base = { id: `${group}-${i}`, group, value: v.value };
    return v.num === null ? base : { ...base, num: v.num };
  });
  return { group, tiles };
}

const numberBank = (group: Group, options: readonly number[], rng: Rng): BankSpec =>
  bank(
    group,
    options.map((n) => ({ value: pad(n), num: n })),
    rng,
  );

const wordBank = (group: Group, options: readonly string[], rng: Rng): BankSpec =>
  bank(
    group,
    options.map((w) => ({ value: w, num: wordToNumber(w) })),
    rng,
  );

const START_HOURS: readonly number[] = Array.from({ length: 12 }, (_, i) => i + 1);

export function buildQuestion(
  mode: GameMode,
  level: Level,
  used: ReadonlySet<string>,
  rng: Rng,
  index = 0,
): Question {
  const time = randomTime(level, used, rng);
  const displayH = displayHourOf(time, level);
  if (mode === 'numbers') {
    const base: NumbersQuestion = {
      mode,
      index,
      time,
      displayH,
      stimulus: 'analog',
      slots: [slot('hour', pad(displayH)), slot('minute', pad(time.m))],
      banks: [
        numberBank('hour', hourNumberOptions(time, level, rng), rng),
        numberBank('minute', minuteNumberOptions(time, level, rng), rng),
      ],
    };
    return level.h24 ? { ...base, period: periodOf(time.h) } : base;
  }
  if (mode === 'words') {
    const stimulus: Stimulus = level.h24 ? 'digital' : pick<Stimulus>(['analog', 'digital'], rng);
    const parts = phraseParts(time, { withPeriod: level.h24, useHalf: true });
    const slotParts = parts.filter(
      (p): p is Extract<PhrasePart, { kind: 'slot' }> => p.kind === 'slot',
    );
    const banks = slotParts.map((p): BankSpec =>
      p.group === 'hour'
        ? wordBank(
            'hour',
            hourWordOptions(p.answer, p.num ?? to12(time.h), time, level, rng),
            rng,
          )
        : p.group === 'minute'
          ? wordBank('minute', minuteWordOptions(p.answer, time, level, rng), rng)
          : wordBank('period', PERIOD_OPTIONS, rng),
    );
    const res: WordsQuestion = {
      mode,
      index,
      time,
      displayH,
      stimulus,
      parts,
      slots: slotParts.map((p) => slot(p.group, p.answer)),
      banks,
    };
    return res;
  }
  const target12 = to12(time.h);
  const base: HandsQuestion = {
    mode,
    index,
    time,
    displayH,
    stimulus: 'digital',
    start: { h: pick(START_HOURS.filter((h) => h !== target12), rng), m: 0 },
    minuteStep: level.step,
    lockMinute: level.step === 60,
    minuteLabels: level.id === 3,
  };
  return level.id <= 2 ? { ...base, phrase: phraseText(phraseParts(time)) } : base;
}

export function spokenPhrase(mode: GameMode, level: Level, time: ClockTime): string {
  if (mode === 'words') return phraseText(phraseParts(time, { withPeriod: level.h24, useHalf: true }));
  if (level.h24) return `${phrase24(time)} Ou: ${phraseText(phraseParts(time, { withPeriod: true }))}`;
  return phraseText(phraseParts(time));
}
