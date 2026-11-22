// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

/**
 * Conteúdo tipado do diálogo "Para educadores e famílias".
 *
 * Migrado de `legacy/index.html` (linhas 145–191), com texto AGPL §13
 * atualizado para o build TypeScript/React (ADR-004).
 */

import type { BnccSkill } from '../domain/types';
import { buildSourceUrl } from './copy';
import { content } from './runtimeDomData';

export * from './educatorsArticle';
import { BNCC_SKILLS } from './educatorsArticle';

export { BNCC_SKILLS } from './educatorsArticle';

function skillCodes(): readonly BnccSkill[] {
  return BNCC_SKILLS.map(entry => entry.code);
}
export const BNCC_SKILL_CODES = /* @__PURE__ */ skillCodes();

export interface AgplNoticeParams {
  readonly version: string;
  readonly commit: string;
}

export function buildAgplNotice(params: AgplNoticeParams): string {
  const sourceUrl = buildSourceUrl(params.commit);
  const versionLabel =
    params.version.trim().length > 0 ? params.version.trim() : 'desconhecida';
  return content.agplTpl.replace('{version}', versionLabel).replace('{sourceUrl}', sourceUrl);
}
