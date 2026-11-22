// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { ANSWER_REGION_LABELS } from '../contracts';
import { LEVELS } from '../domain/levels';
import { getMode } from '../domain/modes';

/** Repositório canônico do Corresponding Source. */
export const SOURCE_REPO_URL =
  'https://github.com/beltraoluis/GamesEduRelogioMaluco' as const;

/**
 * Monta a URL `tree/{commit}` do Corresponding Source (ADR-004 §1).
 *
 * Exige commit não vazio e diferente de `"unknown"`.
 */
export function buildSourceUrl(commit: string): string {
  const trimmed = commit.trim();
  if (trimmed.length === 0 || trimmed === 'unknown') {
    throw new Error(
      'Corresponding Source exige commit exato (ADR-004): informe o SHA do build para montar tree/{commit}.',
    );
  }
  return `${SOURCE_REPO_URL}/tree/${trimmed}`;
}

const LISTEN_LABEL = 'Ouvir';
const RESET_PROGRESS_LABEL = 'Apagar progresso deste aparelho';

/** Toda a copy da interface (pt-BR, sem emojis). */
export const APP_COPY = {
  home: {
    title: 'Relógio Maluco',
    subtitle: 'Vamos aprender a ler as horas!',
    levelSection: '1. Escolha o nível',
    modeSection: '2. Escolha a brincadeira',
  },
  menu: {
    sound: 'Som',
    soundOn: 'Som: ligado',
    soundOff: 'Som: desligado',
    voice: 'Voz',
    voiceOn: 'Voz: ligada',
    voiceOff: 'Voz: desligada',
    teachers: 'Para educadores',
    source: 'Código-fonte',
    install: 'Instalar',
    offlineReady: 'Funciona sem internet',
    iosInstallTip:
      'No iPhone/iPad: Compartilhar > Adicionar à Tela de Início',
  },
  game: {
    prompts: {
      numbers: 'Que horas são? Arraste os números para o relógio digital.',
      words: 'Que horas são? Arraste as palavras para completar a frase.',
      hands: 'Gire os ponteiros para o relógio mostrar esta hora:',
    },
    tileFirstHint:
      'Escolha uma ficha e toque Enter ou Espaço para encaixar',
    hint: 'Dica',
    listen: LISTEN_LABEL,
    ready: 'Pronto!',
    next: 'Próxima',
    back: 'Voltar ao início',
  },
  explore: {
    title: 'Explorar o relógio',
    now: 'Que horas são agora?',
    listen: LISTEN_LABEL,
    dragTip:
      'Arraste os ponteiros! Quando o ponteiro grande dá uma volta inteira, o pequeno anda até o próximo número.',
    facts: [
      'O ponteiro pequeno mostra as horas.',
      'O ponteiro grande mostra os minutos.',
      'O ponteiro fininho mostra os segundos.',
      '1 hora = 60 minutos · 1 minuto = 60 segundos',
    ],
  },
  result: {
    playAgain: 'Jogar de novo',
    home: 'Início',
  },
  updateToast: {
    title: 'Nova versão pronta',
    apply: 'Atualizar agora',
    dismiss: 'Agora não',
  },
  resetProgress: {
    title: RESET_PROGRESS_LABEL,
    confirm:
      'Tem certeza? Todas as estrelas salvas neste aparelho serão apagadas.',
    confirmButton: 'Sim, apagar',
    cancelButton: 'Cancelar',
    liveMessage: 'Progresso apagado.',
  },
  persistence: {
    unavailable:
      'Neste aparelho o progresso não pode ser salvo (modo privado ou armazenamento indisponível). As estrelas valem só enquanto esta página estiver aberta.',
  },
  teachers: {
    title: 'Para educadores e famílias',
    close: 'Fechar',
    resetButton: RESET_PROGRESS_LABEL,
  },
  modes: {
    assemble: getMode('assemble'),
    numbers: getMode('numbers'),
    words: getMode('words'),
    hands: getMode('hands'),
    explore: getMode('explore'),
  },
  levels: {
    1: LEVELS[0],
    2: LEVELS[1],
    3: LEVELS[2],
    4: LEVELS[3],
  },
  answerRegions: ANSWER_REGION_LABELS,
} as const;

export type AppCopy = typeof APP_COPY;
