// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

/**
 * Mensagens do mascote como dados estruturados (contrato congelado no G0).
 *
 * Uma `Message` é uma lista de segmentos. A UI (`<MessageText>`) desenha cada
 * segmento (texto, ênfase, termo colorido, selo gráfico); `toPlainText` gera a
 * versão em texto corrido usada em `aria-live` e na leitura em voz alta.
 *
 * Selos (`badge`) substituem os emojis do legado (bolinha azul/vermelha etc.).
 * Um selo só aparece no texto corrido quando tem `spokenAs`; sem ele, é
 * puramente visual e é omitido.
 *
 * Módulo puro: sem React, DOM ou módulos fora de `domain/`.
 */

import type { Group, MessageCode } from './types';

export type { MessageCode } from './types';

/** Selos gráficos inline: ponteiro das horas, dos minutos, período e dois pontos. */
export type BadgeKind = 'hour-hand' | 'minute-hand' | 'period' | 'colon';

export interface TextSegment {
  readonly kind: 'text';
  readonly text: string;
}

/** Ênfase (ex.: "ANTES" no legado); renderizada como `<strong>`. */
export interface StrongSegment {
  readonly kind: 'strong';
  readonly text: string;
}

/**
 * Termo pedagógico (ex.: "ponteiro pequeno"). Com `group`, recebe a cor fixa
 * do grupo e redundância geométrica (sublinhado/forma), nunca só cor.
 */
export interface TermSegment {
  readonly kind: 'term';
  readonly text: string;
  readonly group?: Group;
}

export interface BadgeSegment {
  readonly kind: 'badge';
  readonly badge: BadgeKind;
  /** Forma falada/lida do selo; ausente = selo apenas visual. */
  readonly spokenAs?: string;
}

export type MessageSegment = TextSegment | StrongSegment | TermSegment | BadgeSegment;

export interface Message {
  readonly code: MessageCode;
  readonly segments: readonly MessageSegment[];
}

/* ------------------------------------------------------------------ */
/* Construtores                                                        */
/* ------------------------------------------------------------------ */

/** Texto simples. Os espaços são do autor: `t('Olhe o ')`. */
export function t(text: string): TextSegment {
  return { kind: 'text', text };
}

/** Ênfase. */
export function s(text: string): StrongSegment {
  return { kind: 'strong', text };
}

/** Selo gráfico; `spokenAs` só quando ele deve ser lido em voz alta. */
export function b(badge: BadgeKind, spokenAs?: string): BadgeSegment {
  return spokenAs === undefined ? { kind: 'badge', badge } : { kind: 'badge', badge, spokenAs };
}

/** Termo pedagógico, opcionalmente ligado a um grupo de cor. */
export function term(text: string, group?: Group): TermSegment {
  return group === undefined ? { kind: 'term', text } : { kind: 'term', text, group };
}

/** Monta uma mensagem: `msg('help.digital.hour', t('Veja '), ...)`. */
export function msg(code: MessageCode, ...segments: readonly MessageSegment[]): Message {
  return { code, segments };
}

/* ------------------------------------------------------------------ */
/* Texto corrido                                                       */
/* ------------------------------------------------------------------ */

/**
 * Glifos proibidos no texto corrido: emojis e pictogramas, seletores de
 * variação, ZWJ, keycap, setas, símbolos técnicos, caixas, formas
 * geométricas, símbolos diversos e dingbats.
 */
const FORBIDDEN_GLYPHS =
  /[\p{Extended_Pictographic}\u{FE0E}\u{FE0F}\u{200D}\u{20E3}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{2460}-\u{24FF}\u{2500}-\u{27BF}\u{2B00}-\u{2BFF}]/gu;

/** "dois pontos" repetido (com vírgula ou parênteses entre eles). */
const REPEATED_COLON_WORDS = /\b(dois pontos)(?:\s*[,;]?\s*\(?\s*dois pontos\s*\)?)+/giu;

function segmentText(seg: MessageSegment): string {
  switch (seg.kind) {
    case 'text':
    case 'strong':
    case 'term':
      return seg.text;
    case 'badge':
      // Espaços ao redor evitam colar palavras quando o selo é omitido.
      return ` ${seg.spokenAs ?? ''} `;
  }
}

/**
 * Converte a mensagem em texto corrido para leitores de tela e voz.
 *
 * - omite selos sem `spokenAs`;
 * - normaliza espaços e pontuação (inclusive quando o selo omitido estava
 *   antes de pontuação, entre parênteses ou no fim da frase);
 * - garante uma única ocorrência seguida de "dois pontos" quando
 *   `b('colon', 'dois pontos')` acompanha o mesmo texto;
 * - remove emojis e glifos proibidos.
 */
export function toPlainText(m: Message): string {
  let out = m.segments.map(segmentText).join('');

  out = out.replace(FORBIDDEN_GLYPHS, '');
  out = out.replace(REPEATED_COLON_WORDS, '$1');

  out = out
    // Parênteses/colchetes que ficaram vazios: "dos dois pontos ( )."
    .replace(/\(\s*\)|\[\s*\]/g, '')
    // Espaços múltiplos, tabs e quebras de linha.
    .replace(/\s+/g, ' ')
    // Sem espaço antes de pontuação/fechamento.
    .replace(/\s+([.,;:!?…)\]])/g, '$1')
    // Sem espaço depois de abertura.
    .replace(/([([])\s+/g, '$1')
    // Pontuação fraca seguida de outra: "pequeno,." -> "pequeno."; ",," -> ",".
    .replace(/[,;:]+(?=[.!?…])/g, '')
    .replace(/([,;:])[,;:]+/g, '$1')
    // Ponto duplicado ou após "!", "?" e "…".
    .replace(/([!?…])\.+/g, '$1')
    .replace(/\.{2,}/g, '.')
    // Pontuação órfã no início e pontuação fraca pendurada no fim.
    .replace(/^[\s.,;:!?…]+/, '')
    .replace(/[\s,;:]+$/, '');

  return out.trim();
}
