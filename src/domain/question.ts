// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { content } from '../content/runtimeDomData';
/** Montagem determinística das perguntas de uma rodada. */

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

/** Nome do grupo como aparece nas mensagens ("Essa ficha é de horas"). */
export const GROUP_NAMES: Readonly<Record<Group, string>> = content.groups;

/** Nome acessível da lacuna vazia. */
export const SLOT_LABELS: Readonly<Record<Group, string>> = content.slots;

export function slotIdOf(group: Group): string {
  return `slot-${group}`;
}

function slot(group: Group, answer: string): SlotSpec {
  return { id: slotIdOf(group), group, answer, label: SLOT_LABELS[group] };
}

/** Embaralha os valores e numera as fichas depois (o id não revela a resposta). */
function bank(group: Group, values: readonly { readonly value: string; readonly num: number | null }[], rng: Rng): BankSpec {
  const tiles: TileSpec[] = shuffle(values, rng).map((v, i) => {
    const base = { id: `${group}-${i}`, group, value: v.value };
    return v.num === null ? base : { ...base, num: v.num };
  });
  return { group, tiles };
}

function numberBank(group: Group, options: readonly number[], rng: Rng): BankSpec {
  return bank(group, options.map((n) => ({ value: pad(n), num: n })), rng);
}

function wordBank(group: Group, options: readonly string[], rng: Rng): BankSpec {
  return bank(group, options.map((w) => ({ value: w, num: wordToNumber(w) })), rng);
}

function buildNumbers(time: ClockTime, level: Level, rng: Rng, index: number): NumbersQuestion {
  const displayH = displayHourOf(time, level);
  const hourBank = numberBank('hour', hourNumberOptions(time, level, rng), rng);
  const minuteBank = numberBank('minute', minuteNumberOptions(time, level, rng), rng);
  const base: NumbersQuestion = {
    mode: 'numbers',
    index,
    time,
    displayH,
    stimulus: 'analog',
    slots: [slot('hour', pad(displayH)), slot('minute', pad(time.m))],
    banks: [hourBank, minuteBank],
  };
  return level.h24 ? { ...base, period: periodOf(time.h) } : base;
}

function buildWords(time: ClockTime, level: Level, rng: Rng, index: number): WordsQuestion {
  const stimulus: Stimulus = level.h24 ? 'digital' : pick<Stimulus>(['analog', 'digital'], rng);
  const parts = phraseParts(time, { withPeriod: level.h24, useHalf: true });
  const slotParts = parts.filter((p): p is Extract<PhrasePart, { kind: 'slot' }> => p.kind === 'slot');
  const banks = slotParts.map((p): BankSpec => {
    switch (p.group) {
      case 'hour':
        return wordBank('hour', hourWordOptions(p.answer, p.num ?? to12(time.h), time, level, rng), rng);
      case 'minute':
        return wordBank('minute', minuteWordOptions(p.answer, time, level, rng), rng);
      case 'period':
        return wordBank('period', PERIOD_OPTIONS, rng);
    }
  });
  return {
    mode: 'words',
    index,
    time,
    displayH: displayHourOf(time, level),
    stimulus,
    parts,
    slots: slotParts.map((p) => slot(p.group, p.answer)),
    banks,
  };
}

function buildHands(time: ClockTime, level: Level, rng: Rng, index: number): HandsQuestion {
  const target12 = to12(time.h);
  const startH = pick(content.hours12.filter((h) => h !== target12), rng);
  const base: HandsQuestion = {
    mode: 'hands',
    index,
    time,
    displayH: displayHourOf(time, level),
    stimulus: 'digital',
    start: { h: startH, m: 0 },
    minuteStep: level.step,
    lockMinute: level.step === 60,
    minuteLabels: level.id === 3,
  };
  return level.id <= 2 ? { ...base, phrase: phraseText(phraseParts(time)) } : base;
}

/**
 * Sorteia uma hora fora de `used` e monta a pergunta do modo.
 * Consome o `rng` numa ordem fixa: mesma seed, mesma pergunta.
 */
export function buildQuestion(mode: GameMode, level: Level, used: ReadonlySet<string>, rng: Rng, index = 0): Question {
  const time = randomTime(level, used, rng);
  switch (mode) {
    case 'numbers':
      return buildNumbers(time, level, rng, index);
    case 'words':
      return buildWords(time, level, rng, index);
    case 'hands':
      return buildHands(time, level, rng, index);
  }
}

/**
 * Frase falada ao acertar e no botão "Ouvir": a frase do modo palavras; no
 * nível 24 h, a forma de 24 h seguida da forma com período.
 */
export function spokenPhrase(mode: GameMode, level: Level, time: ClockTime): string {
  if (mode === 'words') return phraseText(phraseParts(time, { withPeriod: level.h24, useHalf: true }));
  if (level.h24) return `${phrase24(time)} Ou: ${phraseText(phraseParts(time, { withPeriod: true }))}`;
  return phraseText(phraseParts(time));
}
