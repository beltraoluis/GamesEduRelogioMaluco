// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { LEVELS } from '../domain/levels';
import { MODES } from '../domain/modes';
import type { BnccSkill, LevelId, ModeId } from '../domain/types';
import { APP_COPY, buildSourceUrl, SOURCE_REPO_URL } from './copy';

export interface BnccSkillEntry {
  readonly code: BnccSkill;
  readonly summary: string;
  readonly where: string;
}

export interface LevelProgressionEntry {
  readonly id: LevelId;
  readonly title: string;
  readonly description: string;
}

export interface ModeEducatorsEntry {
  readonly id: ModeId;
  readonly title: string;
  readonly description: string;
}

export interface EducatorsContent {
  readonly title: string;
  readonly intro: string;
  readonly bnccHeading: string;
  readonly bnccSkills: readonly BnccSkillEntry[];
  readonly bnccDisclaimer: string;
  readonly levelsHeading: string;
  readonly levels: readonly LevelProgressionEntry[];
  readonly modesHeading: string;
  readonly modes: readonly ModeEducatorsEntry[];
  readonly competenciesHeading: string;
  readonly competencies: string;
  readonly usageHeading: string;
  readonly usageSuggestions: readonly string[];
  readonly licenseHeading: string;
}

const RAW_SKILLS: readonly (readonly [BnccSkill, string, string])[] = [
  ['EF01MA16', 'Relatar sequências de acontecimentos do dia com horários.', 'Nível 1 (horas certas)'],
  ['EF01MA17', 'Reconhecer e relacionar períodos do dia (manhã, tarde, noite).', 'Explorar e Nível 4 (períodos)'],
  ['EF02MA19', 'Medir intervalos de tempo com relógio digital e registrar horários.', 'Nível 2 – modo Números'],
  ['EF03MA22', 'Ler e registrar medidas de tempo em relógios analógico e digital.', 'Nível 3 – todos os modos'],
  ['EF03MA23', 'Ler horas em relógios digitais e analógicos e relacionar h/min/s.', 'Níveis 2–3, Ponteiros e Explorar'],
  ['EF04MA22', 'Ler e registrar medidas de tempo em horas, minutos e segundos.', 'Nível 4 (minuto a minuto, 24 h)'],
];

export const BNCC_SKILLS: readonly BnccSkillEntry[] = RAW_SKILLS.map(
  ([code, summary, where]) => ({ code, summary, where }),
);

export const BNCC_SKILL_CODES: readonly BnccSkill[] = BNCC_SKILLS.map((e) => e.code);

const LEVEL_DESCS = [
  'ponteiro grande no 12; foco no pequeno.',
  '15, 30 e 45 minutos; introduz "e meia".',
  'contagem de 5 em 5 minutos pelos números.',
  'qualquer minuto, 24 h, meio-dia e meia-noite.',
] as const;

const MODE_DESCS = [
  'lê o analógico e registra no digital.',
  'escreve a hora por extenso.',
  'lê o digital e ajusta os ponteiros.',
  'manipulação livre e hora atual com segundos.',
] as const;

export const EDUCATORS_CONTENT: EducatorsContent = {
  title: APP_COPY.teachers.title,
  intro:
    'O Relógio Maluco trabalha Grandezas e Medidas da BNCC (Matemática, Anos Iniciais) em 4 níveis, com retorno imediato e dicas para os erros mais comuns.',
  bnccHeading: 'Habilidades da BNCC contempladas',
  bnccSkills: BNCC_SKILLS,
  bnccDisclaimer:
    'Resumos parafraseados da BNCC. Consulte basenacionalcomum.mec.gov.br.',
  levelsHeading: 'Progressão dos níveis',
  levels: LEVELS.map((l, i) => ({
    id: l.id,
    title: `Nível ${l.id} – ${l.name}`,
    description: LEVEL_DESCS[i]!,
  })),
  modesHeading: 'Modos de jogo',
  modes: MODES.map((m, i) => ({
    id: m.id,
    title: m.title,
    description: MODE_DESCS[i]!,
  })),
  competenciesHeading: 'Competências gerais',
  competencies:
    'Apoia a Competência Geral 5 e a leitura de horas. Cores consistentes com redundância de forma: azul = horas (bloco retangular com filete sólido), vermelho = minutos (borda tracejada e entalhe), roxo = período do dia (pílula com medalhão).',
  usageHeading: 'Sugestões de uso',
  usageSuggestions: [
    'Monte com a turma a rotina do dia com os horários.',
    'Use o Explorar na lousa para mostrar os ponteiros andando juntos.',
    'Funciona sem internet após o 1º acesso e pode ser instalado.',
    'As estrelas ficam salvas só neste aparelho.',
  ],
  licenseHeading: 'Licença e código-fonte',
};

export interface AgplNoticeParams {
  readonly version: string;
  readonly commit: string;
}

export function buildAgplNotice(params: AgplNoticeParams): string {
  const sourceUrl = buildSourceUrl(params.commit);
  const v = params.version.trim() || 'desconhecida';
  return `Relógio Maluco (${v}) é software livre sob AGPL-3.0-or-later, fornecido sem qualquer garantia. Os arquivos servidos são compilados e minificados a partir de TypeScript/React. Código-fonte correspondente: ${sourceUrl} (${SOURCE_REPO_URL}). Para reproduzir: \`npm ci\` e \`npm run build\` (saída em \`dist/\`). Licenças offline em LICENSE.txt e THIRD_PARTY_LICENSES.txt.`;
}
