// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

/**
 * Conteúdo tipado do diálogo "Para educadores e famílias".
 *
 * Migrado de `legacy/index.html` (linhas 145–191), com texto AGPL §13
 * atualizado para o build TypeScript/React (ADR-004).
 */

import type { BnccSkill, LevelId, ModeId } from '../domain/types';
import { buildSourceUrl, SOURCE_REPO_URL } from './copy';

export interface BnccSkillEntry {
  readonly code: BnccSkill;
  /** Paráfrase do texto oficial da BNCC (não substitui a redação oficial). */
  readonly summary: string;
  /** Onde a habilidade aparece no jogo. */
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

/** As 6 habilidades BNCC cobertas pelo Relógio Maluco. */
export const BNCC_SKILLS: readonly BnccSkillEntry[] = [
  {
    code: 'EF01MA16',
    summary:
      'Relatar sequências de acontecimentos de um dia usando, quando possível, os horários dos eventos.',
    where: 'Nível 1 (horas certas)',
  },
  {
    code: 'EF01MA17',
    summary: 'Reconhecer e relacionar períodos do dia (manhã, tarde, noite).',
    where:
      'Explorar (dia/noite) e Nível 4 (palavras: "da manhã", "da tarde"…)',
  },
  {
    code: 'EF02MA19',
    summary:
      'Medir intervalos de tempo com relógio digital e registrar horários.',
    where: 'Nível 2 – modo Números (registro no relógio digital)',
  },
  {
    code: 'EF03MA22',
    summary:
      'Ler e registrar medidas e intervalos de tempo usando relógios analógico e digital.',
    where: 'Nível 3 – todos os modos',
  },
  {
    code: 'EF03MA23',
    summary:
      'Ler horas em relógios digitais e analógicos e relacionar hora/minutos e minuto/segundos.',
    where:
      'Níveis 2 e 3, modo Ponteiros e Explorar (ponteiro dos segundos)',
  },
  {
    code: 'EF04MA22',
    summary:
      'Ler e registrar medidas e intervalos de tempo em horas, minutos e segundos no cotidiano.',
    where: 'Nível 4 (minuto a minuto e formato 24 h)',
  },
] as const;

/** Códigos BNCC na ordem canônica (cobertura exata exigida pelos testes). */
export const BNCC_SKILL_CODES: readonly BnccSkill[] = BNCC_SKILLS.map(
  (entry) => entry.code,
);

export const EDUCATORS_CONTENT: EducatorsContent = {
  title: 'Para educadores e famílias',
  intro:
    'O Relógio Maluco trabalha a unidade temática Grandezas e Medidas da BNCC (Matemática, Ensino Fundamental – Anos Iniciais), com progressão em quatro níveis. As respostas são montadas arrastando (ou tocando) fichas de números e palavras, com retorno imediato e dicas que apontam os erros mais comuns.',
  bnccHeading: 'Habilidades da BNCC contempladas',
  bnccSkills: BNCC_SKILLS,
  bnccDisclaimer:
    'Os resumos acima parafraseiam o texto da BNCC. Consulte a redação oficial em basenacionalcomum.mec.gov.br ao planejar suas aulas.',
  levelsHeading: 'Progressão dos níveis',
  levels: [
    {
      id: 1,
      title: 'Nível 1 – Horas certas',
      description:
        'ponteiro grande sempre no 12; foco no ponteiro pequeno.',
    },
    {
      id: 2,
      title: 'Nível 2 – Meias e quartos',
      description: '15, 30 e 45 minutos; introduz "e meia".',
    },
    {
      id: 3,
      title: 'Nível 3 – De 5 em 5',
      description:
        'contagem de 5 em 5 minutos pelos números do relógio.',
    },
    {
      id: 4,
      title: 'Nível 4 – Minuto a minuto (24 h)',
      description:
        'qualquer minuto, conversão entre 15h e "3 horas da tarde", meio-dia e meia-noite.',
    },
  ],
  modesHeading: 'Modos de jogo',
  modes: [
    {
      id: 'numbers',
      title: 'Números',
      description:
        'lê o relógio analógico e registra a hora no relógio digital.',
    },
    {
      id: 'words',
      title: 'Palavras',
      description:
        'escreve a hora por extenso (integra com Língua Portuguesa – leitura e escrita de números por extenso).',
    },
    {
      id: 'hands',
      title: 'Ponteiros',
      description: 'lê o relógio digital e representa a hora no analógico.',
    },
    {
      id: 'explore',
      title: 'Explorar',
      description:
        'manipulação livre, hora atual com ponteiro dos segundos, relação hora/minuto/segundo.',
    },
  ],
  competenciesHeading: 'Competências gerais',
  competencies:
    'Contribui com a Competência Geral 5 (cultura digital) e com a competência específica de Matemática de relacionar observações do mundo real com representações (relógios, escrita numérica e por extenso). As cores são consistentes em todo o jogo: azul = horas, vermelho = minutos, roxo = período do dia. A cor nunca é o único sinal: horas usam bloco retangular com filete sólido lateral; minutos usam borda tracejada ou entalhe lateral; período usa formato pílula com medalhão ilustrado. Certo e errado também aparecem por ícone, texto e humor do mascote.',
  usageHeading: 'Sugestões de uso',
  usageSuggestions: [
    'Antes de jogar, monte com a turma a rotina do dia com os horários (entrada, recreio, saída).',
    'Use o modo Explorar projetado na lousa para mostrar que o ponteiro pequeno anda junto com o grande.',
    'O jogo funciona sem internet depois do primeiro acesso e pode ser instalado no celular ou tablet.',
    'O progresso (estrelas) fica salvo apenas neste aparelho; nenhum dado é enviado.',
  ],
  licenseHeading: 'Licença e código-fonte',
} as const;

export interface AgplNoticeParams {
  /** Versão do pacote (ex.: `0.1.0`). */
  readonly version: string;
  /** Commit curto ou completo do build; vazio/`unknown` usa o repositório raiz. */
  readonly commit: string;
}

/**
 * Texto AGPL-3.0-or-later §13 para o diálogo dos educadores (pós-build).
 *
 * Explicitamente:
 * - os arquivos servidos são compilados/minificados a partir do TypeScript/React;
 * - Corresponding Source no GitHub em `tree/{commit}` (ou raiz se commit desconhecido);
 * - build reproduzível: `npm ci && npm run build` gerando `dist/`;
 * - `LICENSE.txt` e `THIRD_PARTY_LICENSES.txt` precacheados offline;
 * - sem qualquer garantia.
 */
export function buildAgplNotice(params: AgplNoticeParams): string {
  const sourceUrl = buildSourceUrl(params.commit);
  const versionLabel =
    params.version.trim().length > 0 ? params.version.trim() : 'desconhecida';
  return [
    `O Relógio Maluco (versão ${versionLabel}) é software livre, distribuído sob a GNU Affero General Public License, versão 3 ou posterior (AGPL-3.0-or-later).`,
    'Você pode usar, estudar, modificar e compartilhar o jogo; se oferecer uma versão modificada pela internet, deve disponibilizar o código-fonte correspondente aos usuários.',
    'Os arquivos servidos por este site são compilados e minificados a partir do código-fonte TypeScript/React; eles não são a forma preferida para modificação.',
    `O Corresponding Source desta versão está no repositório GitHub: ${sourceUrl} (repositório: ${SOURCE_REPO_URL}).`,
    'Para reproduzir o build: clone o repositório no commit indicado, execute `npm ci` e em seguida `npm run build`; a saída fica em `dist/`.',
    'Os textos integrais da licença e das dependências empacotadas ficam precacheados offline em LICENSE.txt e THIRD_PARTY_LICENSES.txt.',
    'O programa é fornecido sem qualquer garantia.',
  ].join(' ');
}
