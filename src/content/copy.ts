// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

/**
 * Copy estática da interface em pt-BR.
 *
 * Regras:
 * - zero emojis e glifos pictográficos crus (ADR-004 / visual-system §8);
 * - textos estáveis para UI (prompts, menu, toasts, confirmações);
 * - URL do Corresponding Source (AGPL §13) via `buildSourceUrl`.
 */

/** Repositório canônico do Corresponding Source. */
export const SOURCE_REPO_URL =
  'https://github.com/beltraoluis/GamesEduRelogioMaluco' as const;

/**
 * Monta a URL `tree/{commit}` do Corresponding Source (ADR-004 §1).
 *
 * Exige commit não vazio e diferente de `"unknown"`. Apontar para a raiz do
 * repositório (branch padrão) é alternativa rejeitada pelo ADR; builds sem
 * commit injetado devem falhar em vez de publicar um link não reproduzível.
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
    /** Instrução tile-first para leitores de tela nos modos de encaixe. */
    tileFirstHint:
      'Escolha uma ficha e toque Enter ou Espaço para encaixar',
    hint: 'Dica',
    listen: 'Ouvir',
    ready: 'Pronto!',
    next: 'Próxima',
    back: 'Voltar ao início',
  },
  explore: {
    title: 'Explorar o relógio',
    now: 'Que horas são agora?',
    listen: 'Ouvir',
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
    title: 'Apagar progresso deste aparelho',
    confirm:
      'Tem certeza? Todas as estrelas salvas neste aparelho serão apagadas.',
    confirmButton: 'Sim, apagar',
    cancelButton: 'Cancelar',
    liveMessage: 'Progresso apagado.',
  },
  persistence: {
    /** Aviso discreto quando `persistent === false` (Safari privado etc.). */
    unavailable:
      'Neste aparelho o progresso não pode ser salvo (modo privado ou armazenamento indisponível). As estrelas valem só enquanto esta página estiver aberta.',
  },
  teachers: {
    title: 'Para educadores e famílias',
    close: 'Fechar',
    resetButton: 'Apagar progresso deste aparelho',
  },
  modes: {
    numbers: {
      title: 'Números',
      description: 'Leia o relógio e arraste os números',
    },
    words: {
      title: 'Palavras',
      description: 'Monte a frase da hora',
    },
    hands: {
      title: 'Ponteiros',
      description: 'Gire os ponteiros do relógio',
    },
    explore: {
      title: 'Explorar',
      description: 'Brinque livremente com o relógio',
    },
  },
  levels: {
    1: { name: 'Horas certas', grade: '1º ano' },
    2: { name: 'Meias e quartos', grade: '2º ano' },
    3: { name: 'De 5 em 5', grade: '3º ano' },
    4: { name: 'Minuto a minuto · 24h', grade: '4º e 5º anos' },
  },
  answerRegions: {
    numbers: 'Resposta: relógio digital com lacunas para as horas e os minutos',
    words: 'Resposta: frase da hora com lacunas para completar',
    hands: 'Resposta: relógio analógico para girar os ponteiros',
  },
} as const;

export type AppCopy = typeof APP_COPY;
