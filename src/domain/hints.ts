// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { content } from '../content/runtimeDomData';
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
    if (level.h24 && h > 12) return 'drop.hour.subtract-12';
    return 'drop.hour.before-colon';
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
    let hint: HintCode = 'hands.minute.amount';
    if (second && target.m > 0) hint = 'hands.minute.point-to';
    else if (target.m === 0) hint = 'hands.minute.on-12';
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
  if (slot === undefined) return null;
  const group = slot.group;
  if (group === 'period') {
    return { hint: 'help.period', group, highlight: { slotId: slot.id, minuteLabels: false } };
  }
  if (question.stimulus === 'analog') {
    if (group === 'minute') {
      return { hint: 'help.analog.minute', group, highlight: { hands: 'minute', slotId: slot.id, minuteLabels: true } };
    }
    return {
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

import type { DeclarativeSegment } from '../content/staticContent';
export type { DeclarativeSegment, DeclarativeHintsTable } from '../content/staticContent';
export const PRAISE: readonly string[] = content.praise;
export const PROGRESS: readonly string[] = content.progress;
const HINTS_TABLE = content.hints;

function variantOf(list: readonly string[], variant: number): string {
  const i = ((Math.trunc(variant) % list.length) + list.length) % list.length;
  return list[i] as string;
}

function sub(text: string, vars: readonly string[]): string {
  return text.replace(/\{(\d)\}/g, (_m, idx: string) => vars[Number(idx)] ?? '');
}

function decodeSegments(
  items: readonly DeclarativeSegment[],
  vars: readonly string[] = [],
): readonly MessageSegment[] {
  return items.map((item): MessageSegment => {
    if (typeof item === 'string') return t(vars.length ? sub(item, vars) : item);
    if (item[0] === 's') return s(vars.length ? sub(item[1], vars) : item[1]);
    if (item[0] === 'b') return b(item[1]);
    const text = vars.length ? sub(item[1], vars) : item[1];
    const group = (vars.length ? sub(item[2], vars) : item[2]) as Group;
    return term(text, group);
  });
}

function hintVars(code: HintCode, ctx: HintContext): readonly string[] {
  const { h, m } = ctx.time;
  const h12 = to12(h);
  switch (code) {
    case 'drop.group-mismatch': {
      const g = ctx.attempt?.kind === 'drop' ? ctx.attempt.tileGroup : (ctx.group ?? 'hour');
      return [GROUP_NAMES[g], g];
    }
    case 'drop.minute.count-by-5':
      return [String(m / 5)];
    case 'hands.minute.amount':
      return [m === 1 ? '1 minuto' : `${m} minutos`];
    case 'hands.minute.point-to':
      return [
        m % 5 === 0
          ? String(m / 5)
          : `marcador ${m === 1 ? 'de 1 minuto' : `dos ${m} minutos`}`,
      ];
    case 'hands.hour.position':
      return [m > 0 ? `entre o ${h12} e o ${(h12 % 12) + 1}` : `no ${h12}`];
    default:
      return [];
  }
}

export function renderHint(code: HintCode, ctx: HintContext): Message {
  const raw = HINTS_TABLE[code] ?? [];
  return msg(code, ...decodeSegments(raw, hintVars(code, ctx)));
}

export function renderMessage(code: MessageCode, ctx: HintContext): Message {
  switch (code) {
    case 'intro': {
      const key =
        ctx.mode === 'hands'
          ? 'intro.hands'
          : ctx.stimulus === 'analog'
            ? 'intro.analog'
            : 'intro.digital';
      return msg(code, ...decodeSegments(HINTS_TABLE[key] ?? []));
    }
    case 'praise':
      return msg(code, t(`${variantOf(PRAISE, ctx.variant)} ${spokenPhrase(ctx.mode, ctx.level, ctx.time)}`));
    case 'progress':
      return msg(code, t(variantOf(PROGRESS, ctx.variant)));
    case 'done':
      return msg(code, ...decodeSegments(HINTS_TABLE['done'] ?? []));
    default:
      return renderHint(code, ctx);
  }
}
