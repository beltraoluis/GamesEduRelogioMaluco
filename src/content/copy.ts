// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { ANSWER_REGION_LABELS } from '../contracts';
import { LEVELS } from '../domain/levels';
import { MODES } from '../domain/modes';
import { content } from './runtimeDomData';

import { SOURCE_REPO_URL } from './staticContent';
export { SOURCE_REPO_URL };

/**
 * Monta a URL `tree/{commit}` do Corresponding Source (ADR-004 §1).
 *
 * Exige commit não vazio e diferente de `"unknown"`.
 */
export function buildSourceUrl(commit: string): string {
  const trimmed = commit.trim();
  if (trimmed.length === 0 || trimmed === 'unknown') {
    throw new Error(content.srcErr);
  }
  return `${SOURCE_REPO_URL}/tree/${trimmed}`;
}

export const APP_COPY = {
  ...content.copy,
  modes: { numbers: MODES[0], words: MODES[1], hands: MODES[2], explore: MODES[3] },
  levels: { 1: LEVELS[0], 2: LEVELS[1], 3: LEVELS[2], 4: LEVELS[3] },
  answerRegions: ANSWER_REGION_LABELS,
} as const;
export type AppCopy = typeof APP_COPY;
