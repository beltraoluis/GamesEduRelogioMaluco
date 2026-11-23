// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import type { BnccSkill, LevelId, ModeId } from '../domain/types';

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
    where: 'Explorar (dia/noite) e Nível 4 (palavras: "da manhã", "da tarde"…)',
  },
  {
    code: 'EF02MA19',
    summary: 'Medir intervalos de tempo com relógio digital e registrar horários.',
    where: 'Nível 2 – modo Números (registro no relógio digital)',
  },
  {
    code: 'EF03MA22',
    summary: 'Ler e registrar medidas e intervalos de tempo usando relógios analógico e digital.',
    where: 'Nível 3 – todos os modos',
  },
  {
    code: 'EF03MA23',
    summary: 'Ler horas em relógios digitais e analógicos e relacionar hora/minutos e minuto/segundos.',
    where: 'Níveis 2 e 3, modo Ponteiros e Explorar (ponteiro dos segundos)',
  },
  {
    code: 'EF04MA22',
    summary: 'Ler e registrar medidas e intervalos de tempo em horas, minutos e segundos no cotidiano.',
    where: 'Nível 4 (minuto a minuto e formato 24 h)',
  },
];

export const LICENSE_HEADING = 'Licença e código-fonte';

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
      description: 'ponteiro grande sempre no 12; foco no ponteiro pequeno.',
    },
    {
      id: 2,
      title: 'Nível 2 – Meias e quartos',
      description: '15, 30 e 45 minutos; introduz "e meia".',
    },
    {
      id: 3,
      title: 'Nível 3 – De 5 em 5',
      description: 'contagem de 5 em 5 minutos pelos números do relógio.',
    },
    {
      id: 4,
      title: 'Nível 4 – Minuto a minuto (24 h)',
      description: 'qualquer minuto, conversão entre 15h e "3 horas da tarde", meio-dia e meia-noite.',
    },
  ],
  modesHeading: 'Modos de jogo',
  modes: [
    { id: 'assemble', title: 'Monte o relógio', description: 'Monte as horas de 1 a 12 e depois os minutos de 00 a 55, de cinco em cinco. Arraste ou selecione uma peça e toque no destino. A atividade introdutória está disponível em todas as dificuldades e guarda estrelas em cada uma.' },
    {
      id: 'numbers',
      title: 'Números',
      description: 'lê o relógio analógico e registra a hora no relógio digital.',
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
      description: 'manipulação livre, hora atual com ponteiro dos segundos, relação hora/minuto/segundo.',
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
  licenseHeading: LICENSE_HEADING,
};
