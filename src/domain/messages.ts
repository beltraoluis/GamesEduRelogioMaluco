// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import type { Group, MessageCode } from './types';

export type { MessageCode } from './types';

export type BadgeKind = 'hour-hand' | 'minute-hand' | 'period' | 'colon';

export interface TextSegment {
  readonly kind: 'text';
  readonly text: string;
}

export interface StrongSegment {
  readonly kind: 'strong';
  readonly text: string;
}

export interface TermSegment {
  readonly kind: 'term';
  readonly text: string;
  readonly group?: Group;
}

export interface BadgeSegment {
  readonly kind: 'badge';
  readonly badge: BadgeKind;
  readonly spokenAs?: string;
}

export type MessageSegment = TextSegment | StrongSegment | TermSegment | BadgeSegment;

export interface Message {
  readonly code: MessageCode;
  readonly segments: readonly MessageSegment[];
}

export const t = (text: string): TextSegment => ({ kind: 'text', text });
export const s = (text: string): StrongSegment => ({ kind: 'strong', text });
export const b = (badge: BadgeKind, spokenAs?: string): BadgeSegment =>
  spokenAs === undefined ? { kind: 'badge', badge } : { kind: 'badge', badge, spokenAs };
export const term = (text: string, group?: Group): TermSegment =>
  group === undefined ? { kind: 'term', text } : { kind: 'term', text, group };
export const msg = (code: MessageCode, ...segments: readonly MessageSegment[]): Message => ({
  code,
  segments,
});

const FORBIDDEN_GLYPHS =
  /[\p{Extended_Pictographic}\u{FE0E}\u{FE0F}\u{200D}\u{20E3}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{2460}-\u{24FF}\u{2500}-\u{27BF}\u{2B00}-\u{2BFF}]/gu;
const REPEATED_COLON_WORDS = /\b(dois pontos)(?:\s*[,;]?\s*\(?\s*dois pontos\s*\)?)+/giu;

export function toPlainText(m: Message): string {
  return m.segments
    .map((seg) => (seg.kind === 'badge' ? ` ${seg.spokenAs ?? ''} ` : seg.text))
    .join('')
    .replace(FORBIDDEN_GLYPHS, '')
    .replace(REPEATED_COLON_WORDS, '$1')
    .replace(/\(\s*\)|\[\s*\]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?…)\]])/g, '$1')
    .replace(/([([])\s+/g, '$1')
    .replace(/[,;:]+(?=[.!?…])/g, '')
    .replace(/([,;:])[,;:]+/g, '$1')
    .replace(/([!?…])\.+/g, '$1')
    .replace(/\.{2,}/g, '.')
    .replace(/^[\s.,;:!?…]+|[\s,;:]+$/g, '')
    .trim();
}
