// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { b, msg, s, t, term } from './messages';
import type { Message, MessageSegment } from './messages';
import { GROUP_NAMES, spokenPhrase } from './question';
import { to12 } from './time';
import type {
  ClockTime,
  GameMode,
  Group,
  HandName,
  HelpHighlight,
  HintCode,
  HintContext,
  Level,
  MessageCode,
  Question,
  SlotSpec,
  TileSpec,
} from './types';

export interface DropDiagnosisInput {
  readonly mode: GameMode;
  readonly level: Level;
  readonly question: Question;
  readonly tile: TileSpec;
  readonly slot: SlotSpec;
  readonly wrongByGroup: Readonly<Record<Group, number>>;
}

export function diagnoseDrop(input: DropDiagnosisInput): HintCode {
  const { mode, level, question, tile, slot, wrongByGroup } = input;
  if (tile.group !== slot.group) return 'drop.group-mismatch';

  const { h, m } = question.time;
  const h12 = to12(h);
  const analog = question.stimulus === 'analog';
  const num = tile.num;

  if (slot.group === 'hour') {
    if (mode === 'words' && level.h24 && h === 12) return 'drop.hour.noon';
    if (mode === 'words' && level.h24 && h === 0) return 'drop.hour.midnight';
    if (analog) {
      if (m > 0 && m % 5 === 0 && num === m / 5 && num !== h12) return 'drop.hour.minute-hand-number';
      if (m >= 30 && num === (h12 % 12) + 1) return 'drop.hour.rounded-up';
      if (level.h24 && mode === 'numbers' && num === h12 && h >= 12) return 'drop.hour.add-12-afternoon';
      if (level.h24 && mode === 'numbers' && h < 12 && num === h + 12) return 'drop.hour.no-add-12-morning';
      return 'drop.hour.look-hour-hand';
    }
    return level.h24 && h > 12 ? 'drop.hour.subtract-12' : 'drop.hour.before-colon';
  }

  if (slot.group === 'minute') {
    if (analog && m > 0 && m % 5 === 0 && num === m / 5) return 'drop.minute.count-by-5';
    if (tile.value === 'meio') return 'drop.minute.half-not-meio';
    if (analog) return wrongByGroup.minute >= 2 ? 'drop.minute.count-from-12' : 'drop.minute.look-minute-hand';
    return 'drop.minute.after-colon';
  }

  return 'drop.period.ranges';
}

export interface HandsDiagnosis {
  readonly hourOk: boolean;
  readonly minuteOk: boolean;
  readonly hint?: HintCode;
  readonly highlight?: HandName;
}

export function diagnoseHands(target: ClockTime, hands: ClockTime, mistakes: number): HandsDiagnosis {
  const hourOk = to12(hands.h) === to12(target.h);
  const minuteOk = hands.m === target.m;
  if (hourOk && minuteOk) return { hourOk, minuteOk };
  const second = mistakes >= 2;
  if (!minuteOk) {
    const hint: HintCode =
      second && target.m > 0
        ? 'hands.minute.point-to'
        : target.m === 0
          ? 'hands.minute.on-12'
          : 'hands.minute.amount';
    return { hourOk, minuteOk, hint, highlight: 'minute' };
  }
  return { hourOk, minuteOk, hint: second ? 'hands.hour.position' : 'hands.hour.adjust', highlight: 'hour' };
}

export interface HelpResult {
  readonly hint: HintCode;
  readonly highlight: HelpHighlight;
  readonly group?: Group;
}

export function helpFor(question: Question, filled: Readonly<Record<string, string>>): HelpResult | null {
  if (question.mode === 'hands') {
    return { hint: 'help.hands', highlight: { hands: 'both', minuteLabels: true } };
  }
  const slot = question.slots.find((sl) => filled[sl.id] === undefined);
  if (!slot) return null;
  const group = slot.group;
  if (group === 'period') {
    return { hint: 'help.period', group, highlight: { slotId: slot.id, minuteLabels: false } };
  }
  if (question.stimulus === 'analog') {
    return group === 'minute'
      ? { hint: 'help.analog.minute', group, highlight: { hands: 'minute', slotId: slot.id, minuteLabels: true } }
      : {
          hint: question.time.m > 0 ? 'help.analog.hour-between' : 'help.analog.hour',
          group,
          highlight: { hands: 'hour', slotId: slot.id, minuteLabels: false },
        };
  }
  return {
    hint: group === 'hour' ? 'help.digital.hour' : 'help.digital.minute',
    group,
    highlight: { digitalGroup: group, slotId: slot.id, minuteLabels: false },
  };
}

export const PRAISE: readonly string[] = ['Muito bem!', 'Isso mesmo!', 'Arrasou!', 'Que incrível!', 'Mandou bem!', 'Perfeito!'];
export const PROGRESS: readonly string[] = ['Isso! Agora a próxima.', 'Boa! Falta pouco.', 'Certo! Continue.'];

function variantOf(list: readonly string[], variant: number): string {
  return list[((Math.trunc(variant) % list.length) + list.length) % list.length]!;
}

const bigHand = (): readonly MessageSegment[] => [term('ponteiro grande', 'minute'), b('minute-hand')];
const smallHand = (): readonly MessageSegment[] => [term('ponteiro pequeno', 'hour'), b('hour-hand')];
const periodTerm = (): readonly MessageSegment[] => [term('período do dia', 'period'), b('period')];
const redMin = () => term('números vermelhos dos minutos', 'minute');
const COLON_STR = ' dos dois pontos ';

const colonDrop = (art: string, word: string, g: Group, pos: string): readonly MessageSegment[] => [
  t(`${art} `),
  term(word, g),
  t(' são os números '),
  s(pos),
  t(COLON_STR),
  b('colon'),
  t('.'),
];

const colonHelp = (pos: string, pron: string, word: string, g: Group): readonly MessageSegment[] => [
  t('Veja os números '),
  s(pos),
  t(COLON_STR),
  b('colon'),
  t(`: eles mostram ${pron} `),
  term(word, g),
  t('.'),
];

function hintSegments(code: HintCode, ctx: HintContext): readonly MessageSegment[] {
  const { h, m } = ctx.time;
  const h12 = to12(h);
  switch (code) {
    case 'drop.group-mismatch': {
      const g = ctx.attempt?.kind === 'drop' ? ctx.attempt.tileGroup : (ctx.group ?? 'hour');
      return [t('Essa ficha é de '), term(GROUP_NAMES[g], g), t('. Procure a lacuna do mesmo tipo: horas, minutos ou período.')];
    }
    case 'drop.hour.noon':
      return [t('Às 12 horas do dia, dizemos '), s('meio-dia'), t('!')];
    case 'drop.hour.midnight':
      return [t('À zero hora, no meio da noite, dizemos '), s('meia-noite'), t('!')];
    case 'drop.hour.minute-hand-number':
      return [t('Esse é o número para onde o '), ...bigHand(), t(' aponta. Quem mostra a hora é o '), ...smallHand(), t('!')];
    case 'drop.hour.rounded-up':
      return [t('Quase! O '), ...smallHand(), t(' ainda '), s('não'), t(' chegou nesse número. Escolha o número que ele já passou.')];
    case 'drop.hour.add-12-afternoon':
      return [t('Olhe o '), ...periodTerm(), t('! Depois do meio-dia, somamos 12: 3 horas da tarde são 15 horas.')];
    case 'drop.hour.no-add-12-morning':
      return [t('Olhe o '), ...periodTerm(), t('! De manhã e de madrugada, não somamos 12.')];
    case 'drop.hour.look-hour-hand':
      return [t('Olhe o '), ...smallHand(), t(': ele mostra as horas.')];
    case 'drop.hour.subtract-12':
      return [t('Depois do meio-dia, tiramos 12: 15 horas são 3 horas da tarde.')];
    case 'drop.hour.before-colon':
      return colonDrop('As', 'horas', 'hour', 'antes');
    case 'drop.minute.count-by-5':
      return [t('O '), ...bigHand(), t(` aponta para o ${m / 5}, mas cada número vale 5 minutos. Conte de 5 em 5!`)];
    case 'drop.minute.half-not-meio':
      return [t('Para as horas, dizemos '), s('e meia'), t(' (meia hora).')];
    case 'drop.minute.count-from-12':
      return [t('Conte de 5 em 5 a partir do 12: 5, 10, 15, 20…')];
    case 'drop.minute.look-minute-hand':
      return [t('Olhe o '), ...bigHand(), t(': ele mostra os minutos.')];
    case 'drop.minute.after-colon':
      return colonDrop('Os', 'minutos', 'minute', 'depois');
    case 'drop.period.ranges':
    case 'help.period':
      return [
        t('A '),
        term('madrugada', 'period'),
        t(' vai da meia-noite às 5 horas; a '),
        term('manhã', 'period'),
        t(', das 6 às 11; a '),
        term('tarde', 'period'),
        t(', das 12 às 17; e a '),
        term('noite', 'period'),
        t(', das 18 às 23.'),
      ];
    case 'hands.minute.on-12':
      return [t('Hora certa: o '), ...bigHand(), t(' fica no 12!')];
    case 'hands.minute.amount':
      return [t('O '), ...bigHand(), t(` precisa mostrar ${m === 1 ? '1 minuto' : `${m} minutos`}.`)];
    case 'hands.minute.point-to':
      return [
        t('O '),
        ...bigHand(),
        t(` deve apontar para o ${m % 5 === 0 ? m / 5 : `marcador ${m === 1 ? 'de 1 minuto' : `dos ${m} minutos`}`}.`),
      ];
    case 'hands.hour.adjust':
      return [t('Os minutos estão certos! Agora ajuste o '), ...smallHand(), t(' das horas.')];
    case 'hands.hour.position':
      return [t('O '), ...smallHand(), t(` deve ficar ${m > 0 ? `entre o ${h12} e o ${(h12 % 12) + 1}` : `no ${h12}`}.`)];
    case 'help.hands':
      return [
        t('Primeiro o '),
        ...bigHand(),
        t(' (minutos), depois o '),
        term('pequeno', 'hour'),
        b('hour-hand'),
        t(' (horas). Os '),
        redMin(),
        t(' ajudam a contar.'),
      ];
    case 'help.analog.minute':
      return [t('O '), ...bigHand(), t(' mostra os minutos. Veja os '), redMin(), t(': cada número vale 5 minutos!')];
    case 'help.analog.hour':
      return [t('O '), ...smallHand(), t(' mostra a hora. Para qual número ele aponta?')];
    case 'help.analog.hour-between':
      return [t('O '), ...smallHand(), t(' mostra a hora. Se ele estiver entre dois números, escolha o que ele já passou.')];
    case 'help.digital.hour':
      return colonHelp('antes', 'as', 'horas', 'hour');
    case 'help.digital.minute':
      return colonHelp('depois', 'os', 'minutos', 'minute');
  }
}

export function renderHint(code: HintCode, ctx: HintContext): Message {
  return msg(code, ...hintSegments(code, ctx));
}

function introSegments(ctx: HintContext): readonly MessageSegment[] {
  if (ctx.mode === 'hands') return [t('Arraste os ponteiros. Depois toque em '), s('Pronto!'), t('.')];
  if (ctx.stimulus === 'analog') return [t('Comece pelo '), ...smallHand(), t(': ele mostra as horas.')];
  return [t(`Os números antes${COLON_STR}`), b('colon'), t(' são as '), term('horas', 'hour'), t('.')];
}

export function renderMessage(code: MessageCode, ctx: HintContext): Message {
  switch (code) {
    case 'intro':
      return msg(code, ...introSegments(ctx));
    case 'praise':
      return msg(code, t(`${variantOf(PRAISE, ctx.variant)} ${spokenPhrase(ctx.mode, ctx.level, ctx.time)}`));
    case 'progress':
      return msg(code, t(variantOf(PROGRESS, ctx.variant)));
    case 'done':
      return msg(code, t('Rodada completa! Veja quantas estrelas você ganhou.'));
    default:
      return renderHint(code, ctx);
  }
}
