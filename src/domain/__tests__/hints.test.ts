// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { describe, expect, it } from 'vitest';

import { diagnoseDrop, diagnoseHands, helpFor, PRAISE, PROGRESS, renderHint, renderMessage } from '../hints';
import { getLevel } from '../levels';
import { toPlainText } from '../messages';
import type { BadgeKind, Message } from '../messages';
import { slotIdOf } from '../question';
import { pad, phraseParts } from '../time';
import type {
  Attempt,
  ClockTime,
  GameMode,
  Group,
  HandsQuestion,
  HintCode,
  HintContext,
  Level,
  LevelId,
  NumbersQuestion,
  Question,
  SlotSpec,
  Stimulus,
  TileSpec,
  WordsQuestion,
} from '../types';

/* ---------------- fábricas ---------------- */

function numbersQ(time: ClockTime, levelId: LevelId): NumbersQuestion {
  const level = getLevel(levelId);
  const displayH = level.h24 ? time.h : time.h % 12 === 0 ? 12 : time.h % 12;
  return {
    mode: 'numbers',
    index: 0,
    time,
    displayH,
    stimulus: 'analog',
    slots: [
      { id: slotIdOf('hour'), group: 'hour', answer: pad(displayH), label: 'Lacuna das horas' },
      { id: slotIdOf('minute'), group: 'minute', answer: pad(time.m), label: 'Lacuna dos minutos' },
    ],
    banks: [],
  };
}

function wordsQ(time: ClockTime, levelId: LevelId, stimulus: Stimulus): WordsQuestion {
  const level = getLevel(levelId);
  const parts = phraseParts(time, { withPeriod: level.h24, useHalf: true });
  const slots: SlotSpec[] = parts.flatMap((p) =>
    p.kind === 'slot' ? [{ id: slotIdOf(p.group), group: p.group, answer: p.answer, label: 'x' }] : [],
  );
  return { mode: 'words', index: 0, time, displayH: level.h24 ? time.h : time.h % 12 || 12, stimulus, parts, slots, banks: [] };
}

function handsQ(time: ClockTime): HandsQuestion {
  return {
    mode: 'hands',
    index: 0,
    time,
    displayH: time.h,
    stimulus: 'digital',
    start: { h: (time.h % 12) + 1, m: 0 },
    minuteStep: 5,
    lockMinute: false,
    minuteLabels: false,
  };
}

function tile(group: Group, value: string, num?: number): TileSpec {
  return num === undefined ? { id: `${group}-x`, group, value } : { id: `${group}-x`, group, value, num };
}

function slotOf(q: Question, group: Group): SlotSpec {
  if (q.mode === 'hands') throw new Error('sem lacunas');
  const s = q.slots.find((sl) => sl.group === group);
  if (!s) throw new Error(`sem lacuna ${group}`);
  return s;
}

function ctx(mode: GameMode, level: Level, time: ClockTime, stimulus: Stimulus, extra: Partial<HintContext> = {}): HintContext {
  return {
    mode,
    level,
    time,
    displayH: level.h24 ? time.h : time.h % 12 || 12,
    stimulus,
    mistakes: 0,
    wrongByGroup: { hour: 0, minute: 0, period: 0 },
    variant: 0,
    ...extra,
  };
}

const ZERO = { hour: 0, minute: 0, period: 0 } as const;

/* ---------------- fixtures: uma (ou mais) por HintCode ---------------- */

interface Fixture {
  readonly name: string;
  readonly code: HintCode;
  /** Diagnóstico real produzido pelas funções do domínio. */
  readonly diagnose: () => HintCode | undefined;
  readonly context: HintContext;
  readonly plain: string;
  readonly badges?: readonly BadgeKind[];
}

function drop(q: Question, levelId: LevelId, t: TileSpec, slotGroup: Group, wrong: Partial<Record<Group, number>> = {}) {
  return () =>
    diagnoseDrop({
      mode: q.mode,
      level: getLevel(levelId),
      question: q,
      tile: t,
      slot: slotOf(q, slotGroup),
      wrongByGroup: { ...ZERO, ...wrong },
    });
}

const L2 = getLevel(2);
const L3 = getLevel(3);
const L4 = getLevel(4);

const PERIOD_RANGES =
  'A madrugada vai da meia-noite às 5 horas; a manhã, das 6 às 11; a tarde, das 12 às 17; e a noite, das 18 às 23.';

const minuteAttempt: Attempt = {
  kind: 'drop',
  tileId: 'minute-x',
  slotId: 'slot-hour',
  tileGroup: 'minute',
  slotGroup: 'hour',
  value: '05',
  num: 5,
  correct: false,
};

const FIXTURES: readonly Fixture[] = [
  {
    name: 'ficha de minutos na lacuna das horas',
    code: 'drop.group-mismatch',
    diagnose: drop(numbersQ({ h: 7, m: 20 }, 3), 3, tile('minute', '05', 5), 'hour'),
    context: ctx('numbers', L3, { h: 7, m: 20 }, 'analog', { group: 'hour', attempt: minuteAttempt }),
    plain: 'Essa ficha é de minutos. Procure a lacuna do mesmo tipo: horas, minutos ou período.',
  },
  {
    name: 'meio-dia',
    code: 'drop.hour.noon',
    diagnose: drop(wordsQ({ h: 12, m: 0 }, 4, 'digital'), 4, tile('hour', 'meia-noite'), 'hour'),
    context: ctx('words', L4, { h: 12, m: 0 }, 'digital'),
    plain: 'Às 12 horas do dia, dizemos meio-dia!',
  },
  {
    name: 'meia-noite',
    code: 'drop.hour.midnight',
    diagnose: drop(wordsQ({ h: 0, m: 0 }, 4, 'digital'), 4, tile('hour', 'meio-dia'), 'hour'),
    context: ctx('words', L4, { h: 0, m: 0 }, 'digital'),
    plain: 'À zero hora, no meio da noite, dizemos meia-noite!',
  },
  {
    name: 'número do ponteiro grande na lacuna das horas',
    code: 'drop.hour.minute-hand-number',
    diagnose: drop(numbersQ({ h: 7, m: 20 }, 3), 3, tile('hour', '04', 4), 'hour'),
    context: ctx('numbers', L3, { h: 7, m: 20 }, 'analog'),
    plain: 'Esse é o número para onde o ponteiro grande aponta. Quem mostra a hora é o ponteiro pequeno!',
    badges: ['minute-hand', 'hour-hand'],
  },
  {
    name: 'arredondou a hora para cima',
    code: 'drop.hour.rounded-up',
    diagnose: drop(numbersQ({ h: 7, m: 45 }, 3), 3, tile('hour', '08', 8), 'hour'),
    context: ctx('numbers', L3, { h: 7, m: 45 }, 'analog'),
    plain: 'Quase! O ponteiro pequeno ainda não chegou nesse número. Escolha o número que ele já passou.',
    badges: ['hour-hand'],
  },
  {
    name: 'esqueceu de somar 12 à tarde',
    code: 'drop.hour.add-12-afternoon',
    diagnose: drop(numbersQ({ h: 15, m: 10 }, 4), 4, tile('hour', '03', 3), 'hour'),
    context: ctx('numbers', L4, { h: 15, m: 10 }, 'analog'),
    plain: 'Olhe o período do dia! Depois do meio-dia, somamos 12: 3 horas da tarde são 15 horas.',
    badges: ['period'],
  },
  {
    name: 'somou 12 de manhã',
    code: 'drop.hour.no-add-12-morning',
    diagnose: drop(numbersQ({ h: 9, m: 10 }, 4), 4, tile('hour', '21', 21), 'hour'),
    context: ctx('numbers', L4, { h: 9, m: 10 }, 'analog'),
    plain: 'Olhe o período do dia! De manhã e de madrugada, não somamos 12.',
    badges: ['period'],
  },
  {
    name: 'hora qualquer no analógico',
    code: 'drop.hour.look-hour-hand',
    diagnose: drop(numbersQ({ h: 7, m: 10 }, 3), 3, tile('hour', '05', 5), 'hour'),
    context: ctx('numbers', L3, { h: 7, m: 10 }, 'analog'),
    plain: 'Olhe o ponteiro pequeno: ele mostra as horas.',
    badges: ['hour-hand'],
  },
  {
    name: 'digital 24 h depois do meio-dia',
    code: 'drop.hour.subtract-12',
    diagnose: drop(wordsQ({ h: 15, m: 10 }, 4, 'digital'), 4, tile('hour', 'cinco', 5), 'hour'),
    context: ctx('words', L4, { h: 15, m: 10 }, 'digital'),
    plain: 'Depois do meio-dia, tiramos 12: 15 horas são 3 horas da tarde.',
  },
  {
    name: 'hora errada no digital',
    code: 'drop.hour.before-colon',
    diagnose: drop(wordsQ({ h: 3, m: 15 }, 2, 'digital'), 2, tile('hour', 'quatro', 4), 'hour'),
    context: ctx('words', L2, { h: 3, m: 15 }, 'digital'),
    plain: 'As horas são os números antes dos dois pontos.',
    badges: ['colon'],
  },
  {
    name: 'minuto = número do mostrador',
    code: 'drop.minute.count-by-5',
    diagnose: drop(numbersQ({ h: 7, m: 20 }, 3), 3, tile('minute', '04', 4), 'minute'),
    context: ctx('numbers', L3, { h: 7, m: 20 }, 'analog'),
    plain: 'O ponteiro grande aponta para o 4, mas cada número vale 5 minutos. Conte de 5 em 5!',
    badges: ['minute-hand'],
  },
  {
    name: '"meio" em vez de "meia"',
    code: 'drop.minute.half-not-meio',
    diagnose: drop(wordsQ({ h: 3, m: 30 }, 2, 'digital'), 2, tile('minute', 'meio'), 'minute'),
    context: ctx('words', L2, { h: 3, m: 30 }, 'digital'),
    plain: 'Para as horas, dizemos e meia (meia hora).',
  },
  {
    name: 'segundo erro de minuto no analógico',
    code: 'drop.minute.count-from-12',
    diagnose: drop(numbersQ({ h: 7, m: 20 }, 3), 3, tile('minute', '25', 25), 'minute', { minute: 2 }),
    context: ctx('numbers', L3, { h: 7, m: 20 }, 'analog'),
    plain: 'Conte de 5 em 5 a partir do 12: 5, 10, 15, 20…',
  },
  {
    name: 'primeiro erro de minuto no analógico',
    code: 'drop.minute.look-minute-hand',
    diagnose: drop(numbersQ({ h: 7, m: 20 }, 3), 3, tile('minute', '25', 25), 'minute', { minute: 1 }),
    context: ctx('numbers', L3, { h: 7, m: 20 }, 'analog'),
    plain: 'Olhe o ponteiro grande: ele mostra os minutos.',
    badges: ['minute-hand'],
  },
  {
    name: 'minuto errado no digital',
    code: 'drop.minute.after-colon',
    diagnose: drop(wordsQ({ h: 3, m: 15 }, 2, 'digital'), 2, tile('minute', 'quarenta e cinco', 45), 'minute'),
    context: ctx('words', L2, { h: 3, m: 15 }, 'digital'),
    plain: 'Os minutos são os números depois dos dois pontos.',
    badges: ['colon'],
  },
  {
    name: 'período errado',
    code: 'drop.period.ranges',
    diagnose: drop(wordsQ({ h: 15, m: 10 }, 4, 'digital'), 4, tile('period', 'da manhã'), 'period'),
    context: ctx('words', L4, { h: 15, m: 10 }, 'digital'),
    plain: PERIOD_RANGES,
  },
  {
    name: 'hora certa com minuto fora do 12',
    code: 'hands.minute.on-12',
    diagnose: () => diagnoseHands({ h: 3, m: 0 }, { h: 3, m: 15 }, 1).hint,
    context: ctx('hands', L3, { h: 3, m: 0 }, 'digital'),
    plain: 'Hora certa: o ponteiro grande fica no 12!',
    badges: ['minute-hand'],
  },
  {
    name: 'minuto errado (1º erro)',
    code: 'hands.minute.amount',
    diagnose: () => diagnoseHands({ h: 3, m: 20 }, { h: 3, m: 0 }, 1).hint,
    context: ctx('hands', L3, { h: 3, m: 20 }, 'digital'),
    plain: 'O ponteiro grande precisa mostrar 20 minutos.',
    badges: ['minute-hand'],
  },
  {
    name: 'minuto errado (2º erro, múltiplo de 5)',
    code: 'hands.minute.point-to',
    diagnose: () => diagnoseHands({ h: 3, m: 20 }, { h: 3, m: 0 }, 2).hint,
    context: ctx('hands', L3, { h: 3, m: 20 }, 'digital'),
    plain: 'O ponteiro grande deve apontar para o 4.',
    badges: ['minute-hand'],
  },
  {
    name: 'minuto errado (2º erro, marcador)',
    code: 'hands.minute.point-to',
    diagnose: () => diagnoseHands({ h: 3, m: 22 }, { h: 3, m: 0 }, 3).hint,
    context: ctx('hands', L4, { h: 3, m: 22 }, 'digital'),
    plain: 'O ponteiro grande deve apontar para o marcador dos 22 minutos.',
  },
  {
    name: 'hora errada (1º erro)',
    code: 'hands.hour.adjust',
    diagnose: () => diagnoseHands({ h: 3, m: 20 }, { h: 5, m: 20 }, 1).hint,
    context: ctx('hands', L3, { h: 3, m: 20 }, 'digital'),
    plain: 'Os minutos estão certos! Agora ajuste o ponteiro pequeno das horas.',
    badges: ['hour-hand'],
  },
  {
    name: 'hora errada (2º erro, entre números)',
    code: 'hands.hour.position',
    diagnose: () => diagnoseHands({ h: 12, m: 30 }, { h: 5, m: 30 }, 2).hint,
    context: ctx('hands', L2, { h: 12, m: 30 }, 'digital'),
    plain: 'O ponteiro pequeno deve ficar entre o 12 e o 1.',
    badges: ['hour-hand'],
  },
  {
    name: 'hora errada (2º erro, hora certa)',
    code: 'hands.hour.position',
    diagnose: () => diagnoseHands({ h: 15, m: 0 }, { h: 5, m: 0 }, 2).hint,
    context: ctx('hands', L4, { h: 15, m: 0 }, 'digital'),
    plain: 'O ponteiro pequeno deve ficar no 3.',
  },
  {
    name: 'dica no modo ponteiros',
    code: 'help.hands',
    diagnose: () => helpFor(handsQ({ h: 3, m: 20 }), {})?.hint,
    context: ctx('hands', L3, { h: 3, m: 20 }, 'digital'),
    plain: 'Primeiro o ponteiro grande (minutos), depois o pequeno (horas). Os números vermelhos dos minutos ajudam a contar.',
    badges: ['minute-hand', 'hour-hand'],
  },
  {
    name: 'dica de minutos no analógico',
    code: 'help.analog.minute',
    diagnose: () => helpFor(numbersQ({ h: 3, m: 20 }, 3), { [slotIdOf('hour')]: 'hour-0' })?.hint,
    context: ctx('numbers', L3, { h: 3, m: 20 }, 'analog'),
    plain: 'O ponteiro grande mostra os minutos. Veja os números vermelhos dos minutos: cada número vale 5 minutos!',
    badges: ['minute-hand'],
  },
  {
    name: 'dica de hora certa no analógico',
    code: 'help.analog.hour',
    diagnose: () => helpFor(numbersQ({ h: 3, m: 0 }, 1), {})?.hint,
    context: ctx('numbers', getLevel(1), { h: 3, m: 0 }, 'analog'),
    plain: 'O ponteiro pequeno mostra a hora. Para qual número ele aponta?',
    badges: ['hour-hand'],
  },
  {
    name: 'dica de hora entre números no analógico',
    code: 'help.analog.hour-between',
    diagnose: () => helpFor(numbersQ({ h: 3, m: 20 }, 3), {})?.hint,
    context: ctx('numbers', L3, { h: 3, m: 20 }, 'analog'),
    plain: 'O ponteiro pequeno mostra a hora. Se ele estiver entre dois números, escolha o que ele já passou.',
    badges: ['hour-hand'],
  },
  {
    name: 'dica de horas no digital',
    code: 'help.digital.hour',
    diagnose: () => helpFor(wordsQ({ h: 3, m: 20 }, 3, 'digital'), {})?.hint,
    context: ctx('words', L3, { h: 3, m: 20 }, 'digital'),
    plain: 'Veja os números antes dos dois pontos: eles mostram as horas.',
    badges: ['colon'],
  },
  {
    name: 'dica de minutos no digital',
    code: 'help.digital.minute',
    diagnose: () => helpFor(wordsQ({ h: 3, m: 20 }, 3, 'digital'), { [slotIdOf('hour')]: 'hour-1' })?.hint,
    context: ctx('words', L3, { h: 3, m: 20 }, 'digital'),
    plain: 'Veja os números depois dos dois pontos: eles mostram os minutos.',
    badges: ['colon'],
  },
  {
    name: 'dica de período',
    code: 'help.period',
    diagnose: () =>
      helpFor(wordsQ({ h: 15, m: 10 }, 4, 'digital'), { [slotIdOf('hour')]: 'hour-1', [slotIdOf('minute')]: 'minute-1' })?.hint,
    context: ctx('words', L4, { h: 15, m: 10 }, 'digital'),
    plain: PERIOD_RANGES,
  },
];

/** Exaustividade em tempo de compilação: toda chave de `HintCode` aparece aqui. */
const ALL_HINT_CODES: Record<HintCode, true> = {
  'drop.group-mismatch': true,
  'drop.hour.noon': true,
  'drop.hour.midnight': true,
  'drop.hour.minute-hand-number': true,
  'drop.hour.rounded-up': true,
  'drop.hour.add-12-afternoon': true,
  'drop.hour.no-add-12-morning': true,
  'drop.hour.look-hour-hand': true,
  'drop.hour.subtract-12': true,
  'drop.hour.before-colon': true,
  'drop.minute.count-by-5': true,
  'drop.minute.half-not-meio': true,
  'drop.minute.count-from-12': true,
  'drop.minute.look-minute-hand': true,
  'drop.minute.after-colon': true,
  'drop.period.ranges': true,
  'hands.minute.on-12': true,
  'hands.minute.amount': true,
  'hands.minute.point-to': true,
  'hands.hour.adjust': true,
  'hands.hour.position': true,
  'help.hands': true,
  'help.analog.minute': true,
  'help.analog.hour': true,
  'help.analog.hour-between': true,
  'help.digital.hour': true,
  'help.digital.minute': true,
  'help.period': true,
};

const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}]/u;

function expectCleanPlain(m: Message): string {
  const plain = toPlainText(m);
  expect(plain).not.toMatch(EMOJI);
  expect(plain.match(/dois pontos/g)?.length ?? 0).toBeLessThanOrEqual(1);
  // Sem palavras soletradas em CAIXA ALTA ("GRANDE", "NÃO", "ANTES"...).
  expect(plain).not.toMatch(/\p{Lu}{2,}/u);
  expect(plain).not.toMatch(/\s{2,}|\s[.,;:!?]/);
  for (const seg of m.segments) {
    if (seg.kind !== 'badge') expect(seg.text).not.toMatch(EMOJI);
  }
  return plain;
}

describe('fixtures por HintCode', () => {
  it('cobrem todos os códigos', () => {
    expect(new Set(FIXTURES.map((f) => f.code))).toEqual(new Set(Object.keys(ALL_HINT_CODES)));
  });

  for (const f of FIXTURES) {
    it(`${f.code}: ${f.name}`, () => {
      expect(f.diagnose()).toBe(f.code);
      const message = renderHint(f.code, f.context);
      expect(message.code).toBe(f.code);
      expect(expectCleanPlain(message)).toBe(f.plain);
      const badges = message.segments.flatMap((s) => (s.kind === 'badge' ? [s.badge] : []));
      for (const b of f.badges ?? []) expect(badges).toContain(b);
      // renderMessage delega as dicas para renderHint.
      expect(renderMessage(f.code, f.context)).toEqual(message);
    });
  }
});

describe('textos variáveis e casos de borda', () => {
  it('minutos no singular', () => {
    const c = ctx('hands', L4, { h: 3, m: 1 }, 'digital');
    expect(toPlainText(renderHint('hands.minute.amount', c))).toBe('O ponteiro grande precisa mostrar 1 minuto.');
    expect(toPlainText(renderHint('hands.minute.point-to', c))).toBe('O ponteiro grande deve apontar para o marcador de 1 minuto.');
  });

  it('hands.hour.position entre o 3 e o 4', () => {
    const c = ctx('hands', L3, { h: 3, m: 20 }, 'digital');
    expect(toPlainText(renderHint('hands.hour.position', c))).toBe('O ponteiro pequeno deve ficar entre o 3 e o 4.');
  });

  it('group-mismatch sem tentativa usa o grupo do contexto (ou horas)', () => {
    const withGroup = ctx('words', L4, { h: 3, m: 0 }, 'digital', { group: 'period' });
    expect(toPlainText(renderHint('drop.group-mismatch', withGroup))).toMatch(/^Essa ficha é de período do dia\./);
    const bare = ctx('words', L4, { h: 3, m: 0 }, 'digital');
    expect(toPlainText(renderHint('drop.group-mismatch', bare))).toMatch(/^Essa ficha é de horas\./);
    const handsAttempt: Attempt = { kind: 'hands', time: { h: 1, m: 0 }, hourOk: false, minuteOk: true, correct: false };
    const c = ctx('hands', L4, { h: 3, m: 0 }, 'digital', { attempt: handsAttempt, group: 'minute' });
    expect(toPlainText(renderHint('drop.group-mismatch', c))).toMatch(/^Essa ficha é de minutos\./);
  });

  it('ordem dos diagnósticos de hora', () => {
    // m/5 igual à hora: não é "número do ponteiro grande".
    expect(drop(numbersQ({ h: 4, m: 20 }, 3), 3, tile('hour', '04', 4), 'hour')()).toBe('drop.hour.look-hour-hand');
    // Sem num (ficha por extenso especial) cai no padrão.
    expect(drop(wordsQ({ h: 3, m: 40 }, 3, 'analog'), 3, tile('hour', 'meio-dia'), 'hour')()).toBe('drop.hour.look-hour-hand');
    // Digital 24 h antes do meio-dia.
    expect(drop(wordsQ({ h: 9, m: 10 }, 4, 'digital'), 4, tile('hour', 'dez', 10), 'hour')()).toBe('drop.hour.before-colon');
    // Words 24 h ao meio-dia mas no modo numbers não vale "meio-dia".
    expect(drop(numbersQ({ h: 12, m: 0 }, 4), 4, tile('hour', '00', 0), 'hour')()).toBe('drop.hour.look-hour-hand');
  });

  it('diagnoseHands: leitura certa não tem dica; minuto tem prioridade', () => {
    expect(diagnoseHands({ h: 15, m: 20 }, { h: 3, m: 20 }, 1)).toEqual({ hourOk: true, minuteOk: true });
    expect(diagnoseHands({ h: 3, m: 20 }, { h: 5, m: 10 }, 1)).toEqual({
      hourOk: false,
      minuteOk: false,
      hint: 'hands.minute.amount',
      highlight: 'minute',
    });
    expect(diagnoseHands({ h: 3, m: 0 }, { h: 3, m: 15 }, 2).hint).toBe('hands.minute.on-12');
  });

  it('helpFor: realces e lacuna em foco', () => {
    expect(helpFor(handsQ({ h: 3, m: 20 }), {})).toEqual({ hint: 'help.hands', highlight: { hands: 'both', minuteLabels: true } });
    expect(helpFor(numbersQ({ h: 3, m: 20 }, 3), {})).toEqual({
      hint: 'help.analog.hour-between',
      group: 'hour',
      highlight: { hands: 'hour', slotId: 'slot-hour', minuteLabels: false },
    });
    expect(helpFor(numbersQ({ h: 3, m: 20 }, 3), { 'slot-hour': 'h' })?.highlight).toEqual({
      hands: 'minute',
      slotId: 'slot-minute',
      minuteLabels: true,
    });
    expect(helpFor(wordsQ({ h: 3, m: 20 }, 3, 'digital'), {})?.highlight).toEqual({
      digitalGroup: 'hour',
      slotId: 'slot-hour',
      minuteLabels: false,
    });
    expect(helpFor(wordsQ({ h: 15, m: 0 }, 4, 'digital'), { 'slot-hour': 'h' })).toEqual({
      hint: 'help.period',
      group: 'period',
      highlight: { slotId: 'slot-period', minuteLabels: false },
    });
    expect(helpFor(numbersQ({ h: 3, m: 20 }, 3), { 'slot-hour': 'h', 'slot-minute': 'm' })).toBeNull();
  });
});

describe('renderMessage: introdução, elogio, progresso e fim', () => {
  it('intro por modo e estímulo', () => {
    expect(expectCleanPlain(renderMessage('intro', ctx('hands', L3, { h: 3, m: 0 }, 'digital')))).toBe(
      'Arraste os ponteiros. Depois toque em Pronto!',
    );
    expect(expectCleanPlain(renderMessage('intro', ctx('numbers', L3, { h: 3, m: 0 }, 'analog')))).toBe(
      'Comece pelo ponteiro pequeno: ele mostra as horas.',
    );
    expect(expectCleanPlain(renderMessage('intro', ctx('words', L3, { h: 3, m: 0 }, 'digital')))).toBe(
      'Os números antes dos dois pontos são as horas.',
    );
  });

  it('elogio + frase da hora, variando pelo índice', () => {
    const c = ctx('numbers', L2, { h: 3, m: 30 }, 'analog');
    expect(expectCleanPlain(renderMessage('praise', c))).toBe('Muito bem! São três horas e meia.');
    const v = ctx('words', L4, { h: 15, m: 10 }, 'digital', { variant: PRAISE.length + 1 });
    expect(toPlainText(renderMessage('praise', v))).toBe('Isso mesmo! São três horas e dez minutos da tarde.');
  });

  it('progresso e fim de rodada', () => {
    const c = ctx('numbers', L2, { h: 3, m: 30 }, 'analog', { variant: 1 });
    expect(toPlainText(renderMessage('progress', c))).toBe(PROGRESS[1]);
    expect(toPlainText(renderMessage('progress', { ...c, variant: -1 }))).toBe(PROGRESS[2]);
    expect(expectCleanPlain(renderMessage('done', c))).toBe('Rodada completa! Veja quantas estrelas você ganhou.');
  });
});
