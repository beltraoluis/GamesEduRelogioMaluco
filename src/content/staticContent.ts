// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import type { BadgeKind } from '../domain/messages';

export type DeclarativeSegment =
  string | readonly ['s', string] | readonly ['m', string, string] | readonly ['b', BadgeKind];

export type DeclarativeHintsTable = Readonly<Record<string, readonly DeclarativeSegment[]>>;

export const SOURCE_REPO_URL = 'https://github.com/beltraoluis/GamesEduRelogioMaluco';

const LISTEN_LABEL = 'Ouvir';
const RESET_PROGRESS_LABEL = 'Apagar progresso deste aparelho';

const ANSWER_REGION_LABELS = {
  numbers: 'Resposta: relógio digital com lacunas para as horas e os minutos',
  words: 'Resposta: frase da hora com lacunas para completar',
  hands: 'Resposta: relógio analógico para girar os ponteiros',
};

const MODES = [
  { id: 'assemble', title: 'Monte o relógio', description: 'Encaixe as horas e depois os minutos', scored: true },
  { id: 'numbers', title: 'Números', description: 'Leia o relógio e arraste os números', scored: true },
  { id: 'words', title: 'Palavras', description: 'Monte a frase da hora', scored: true },
  { id: 'hands', title: 'Ponteiros', description: 'Gire os ponteiros do relógio', scored: true },
  { id: 'explore', title: 'Explorar', description: 'Brinque livremente com o relógio', scored: false },
] as const;

const LEVELS = [
  { id: 1, name: 'Horas certas', grade: '1º ano', step: 60, h24: false, bankSize: 3, bncc: ['EF01MA16'] },
  {
    id: 2,
    name: 'Meias e quartos',
    grade: '2º ano',
    step: 15,
    h24: false,
    bankSize: 4,
    bncc: ['EF02MA19', 'EF03MA23'],
  },
  {
    id: 3,
    name: 'De 5 em 5',
    grade: '3º ano',
    step: 5,
    h24: false,
    bankSize: 4,
    bncc: ['EF03MA22', 'EF03MA23'],
  },
  {
    id: 4,
    name: 'Minuto a minuto · 24h',
    grade: '4º e 5º anos',
    step: 1,
    h24: true,
    bankSize: 4,
    bncc: ['EF04MA22', 'EF01MA17'],
  },
] as const;

const APP_COPY = {
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
    iosInstallTip: 'No iPhone/iPad: Compartilhar > Adicionar à Tela de Início',
  },
  game: {
    prompts: {
      numbers: 'Que horas são? Arraste os números para o relógio digital.',
      words: 'Que horas são? Arraste as palavras para completar a frase.',
      hands: 'Gire os ponteiros para o relógio mostrar esta hora:',
    },
    tileFirstHint: 'Escolha uma ficha e toque Enter ou Espaço para encaixar',
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
    confirm: 'Tem certeza? Todas as estrelas salvas neste aparelho serão apagadas.',
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
} as const;

const BIG_HAND: readonly DeclarativeSegment[] = [
  ['m', 'ponteiro grande', 'minute'],
  ['b', 'minute-hand'],
];
const SMALL_HAND: readonly DeclarativeSegment[] = [
  ['m', 'ponteiro pequeno', 'hour'],
  ['b', 'hour-hand'],
];
const PERIOD_TERM: readonly DeclarativeSegment[] = [
  ['m', 'período do dia', 'period'],
  ['b', 'period'],
];
const PERIOD_RANGES: readonly DeclarativeSegment[] = [
  'A ',
  ['m', 'madrugada', 'period'],
  ' vai da meia-noite às 5 horas; a ',
  ['m', 'manhã', 'period'],
  ', das 6 às 11; a ',
  ['m', 'tarde', 'period'],
  ', das 12 às 17; e a ',
  ['m', 'noite', 'period'],
  ', das 18 às 23.',
];

const HINTS_TABLE: DeclarativeHintsTable = {
  'drop.group-mismatch': [
    'Essa ficha é de ',
    ['m', '{0}', '{1}'],
    '. Procure a lacuna do mesmo tipo: horas, minutos ou período.',
  ],
  'drop.hour.noon': ['Às 12 horas do dia, dizemos ', ['s', 'meio-dia'], '!'],
  'drop.hour.midnight': ['À zero hora, no meio da noite, dizemos ', ['s', 'meia-noite'], '!'],
  'drop.hour.minute-hand-number': [
    'Esse é o número para onde o ',
    ...BIG_HAND,
    ' aponta. Quem mostra a hora é o ',
    ...SMALL_HAND,
    '!',
  ],
  'drop.hour.rounded-up': [
    'Quase! O ',
    ...SMALL_HAND,
    ' ainda ',
    ['s', 'não'],
    ' chegou nesse número. Escolha o número que ele já passou.',
  ],
  'drop.hour.add-12-afternoon': [
    'Olhe o ',
    ...PERIOD_TERM,
    '! Depois do meio-dia, somamos 12: 3 horas da tarde são 15 horas.',
  ],
  'drop.hour.no-add-12-morning': ['Olhe o ', ...PERIOD_TERM, '! De manhã e de madrugada, não somamos 12.'],
  'drop.hour.look-hour-hand': ['Olhe o ', ...SMALL_HAND, ': ele mostra as horas.'],
  'drop.hour.subtract-12': ['Depois do meio-dia, tiramos 12: 15 horas são 3 horas da tarde.'],
  'drop.hour.before-colon': [
    'As ',
    ['m', 'horas', 'hour'],
    ' são os números ',
    ['s', 'antes'],
    ' dos dois pontos ',
    ['b', 'colon'],
    '.',
  ],
  'drop.minute.count-by-5': [
    'O ',
    ...BIG_HAND,
    ' aponta para o {0}, mas cada número vale 5 minutos. Conte de 5 em 5!',
  ],
  'drop.minute.half-not-meio': ['Para as horas, dizemos ', ['s', 'e meia'], ' (meia hora).'],
  'drop.minute.count-from-12': ['Conte de 5 em 5 a partir do 12: 5, 10, 15, 20…'],
  'drop.minute.look-minute-hand': ['Olhe o ', ...BIG_HAND, ': ele mostra os minutos.'],
  'drop.minute.after-colon': [
    'Os ',
    ['m', 'minutos', 'minute'],
    ' são os números ',
    ['s', 'depois'],
    ' dos dois pontos ',
    ['b', 'colon'],
    '.',
  ],
  'drop.period.ranges': PERIOD_RANGES,
  'help.period': PERIOD_RANGES,
  'hands.minute.on-12': ['Hora certa: o ', ...BIG_HAND, ' fica no 12!'],
  'hands.minute.amount': ['O ', ...BIG_HAND, ' precisa mostrar {0}.'],
  'hands.minute.point-to': ['O ', ...BIG_HAND, ' deve apontar para o {0}.'],
  'hands.hour.adjust': ['Os minutos estão certos! Agora ajuste o ', ...SMALL_HAND, ' das horas.'],
  'hands.hour.position': ['O ', ...SMALL_HAND, ' deve ficar {0}.'],
  'help.hands': [
    'Primeiro o ',
    ...BIG_HAND,
    ' (minutos), depois o ',
    ['m', 'pequeno', 'hour'],
    ['b', 'hour-hand'],
    ' (horas). Os ',
    ['m', 'números vermelhos dos minutos', 'minute'],
    ' ajudam a contar.',
  ],
  'help.analog.minute': [
    'O ',
    ...BIG_HAND,
    ' mostra os minutos. Veja os ',
    ['m', 'números vermelhos dos minutos', 'minute'],
    ': cada número vale 5 minutos!',
  ],
  'help.analog.hour': ['O ', ...SMALL_HAND, ' mostra a hora. Para qual número ele aponta?'],
  'help.analog.hour-between': [
    'O ',
    ...SMALL_HAND,
    ' mostra a hora. Se ele estiver entre dois números, escolha o que ele já passou.',
  ],
  'help.digital.hour': [
    'Veja os números ',
    ['s', 'antes'],
    ' dos dois pontos ',
    ['b', 'colon'],
    ': eles mostram as ',
    ['m', 'horas', 'hour'],
    '.',
  ],
  'help.digital.minute': [
    'Veja os números ',
    ['s', 'depois'],
    ' dos dois pontos ',
    ['b', 'colon'],
    ': eles mostram os ',
    ['m', 'minutos', 'minute'],
    '.',
  ],
  'intro.hands': ['Arraste os ponteiros. Depois toque em ', ['s', 'Pronto!'], '.'],
  'intro.analog': ['Comece pelo ', ...SMALL_HAND, ': ele mostra as horas.'],
  'intro.digital': [
    'Os números antes dos dois pontos ',
    ['b', 'colon'],
    ' são as ',
    ['m', 'horas', 'hour'],
    '.',
  ],
  done: ['Rodada completa! Veja quantas estrelas você ganhou.'],
};

function minuteDescriptions() {
  return Array.from({ length: 60 }, (_, m) => {
    const dial = Math.floor(m / 5) || 12;
    const ticks = m % 5;
    if (!ticks) return `apontando para o número ${dial}`;
    const count = ticks === 1 ? '1 tracinho' : `${ticks} tracinhos`;
    return `entre os números ${dial} e ${(dial % 12) + 1}, ${count} depois do número ${dial}`;
  });
}

const ANALOG_DESC = {
  hourPoint: 'ponteiro curto das horas apontando para o número {0}',
  hourBetween: 'ponteiro curto das horas entre os números {0} e {1}',
  minutes: /* @__PURE__ */ minuteDescriptions(),
  stimPrefix: 'Relógio analógico do desafio: ',
  stimLabels: 'marcadores de 5 em 5 minutos visíveis no mostrador',
  ctrlLocked:
    'Use as setas esquerda e direita ou arraste o ponteiro curto das horas (ponteiro longo dos minutos travado no 12).',
  ctrlFree: 'Use as setas ou arraste os ponteiros.',
  interTpl: 'Relógio analógico interativo. {0} Posição atual: {1}.',
};

function agplTemplate() {
  return [
    'O Relógio Maluco (versão {version}) é software livre, distribuído sob a GNU Affero General Public License, versão 3 ou posterior (AGPL-3.0-or-later).',
    'Você pode usar, estudar, modificar e compartilhar o jogo; se oferecer uma versão modificada pela internet, deve disponibilizar o código-fonte correspondente aos usuários.',
    'Os arquivos servidos por este site são compilados e minificados a partir do código-fonte TypeScript/React; eles não são a forma preferida para modificação.',
    `O Corresponding Source desta versão está no repositório GitHub: {sourceUrl} (repositório: ${SOURCE_REPO_URL}).`,
    'Para reproduzir o build: clone o repositório no commit indicado, execute `npm ci` e em seguida `npm run build`; a saída fica em `dist/`.',
    'Os textos integrais da licença e das dependências empacotadas ficam precacheados offline em LICENSE.txt e THIRD_PARTY_LICENSES.txt.',
    'O programa é fornecido sem qualquer garantia.',
  ].join(' ');
}

function arpeggio(notes: number[], spacing: number, duration: number) {
  return notes.map((frequency, i) => [frequency, i * spacing, duration, 'triangle', 0.18] as const);
}

function buildNumberWords() {
  const units = [
    'zero',
    'um',
    'dois',
    'três',
    'quatro',
    'cinco',
    'seis',
    'sete',
    'oito',
    'nove',
    'dez',
    'onze',
    'doze',
    'treze',
    'catorze',
    'quinze',
    'dezesseis',
    'dezessete',
    'dezoito',
    'dezenove',
  ];
  const tens = ['vinte', 'trinta', 'quarenta', 'cinquenta'];
  return Array.from({ length: 60 }, (_, n) => {
    if (n < 20) return units[n]!;
    const base = tens[Math.floor(n / 10) - 2]!;
    return n % 10 ? `${base} e ${units[n % 10]}` : base;
  });
}

function sequence(length: number, start = 0, step = 1) {
  return Array.from({ length }, (_, i) => start + i * step);
}

export const staticContent = {
  assembly: {
    intro: {
      hours: 'Comece no 12, lá em cima. Conte de um em um ao redor do relógio.',
      minutes: 'Comece no 00, lá em cima. Conte de cinco em cinco ao redor do relógio.',
    },
    title: 'Monte o relógio: ',
    phases: { hours: 'horas', minutes: 'minutos' },
    instructions: 'Arraste cada peça ou toque na peça e depois no encaixe.',
    celebration: 'Muito bem! Você montou o relógio completo!',
    resultTitle: 'Você montou o relógio!',
    resultDescription: '12 horas e 12 marcações de minutos nos seus lugares.',
    selected: 'Peça {0} selecionada. Agora toque no encaixe.',
    wrong: 'Ainda não é esse lugar. Tente outro encaixe para {0}. {1}',
    progress: 'Isso! {0} de 12 peças encaixadas. Continue!',
    finished: { hours: 'Você montou as horas! Agora vamos aos minutos.', minutes: 'Você montou o relógio completo!' },
    target: 'Encaixe {0}{1}',
    top: 'no topo',
    position: 'na posição {0} do relógio',
    filled: ': {0}, preenchido',
    empty: ', vazio',
    listen: 'Ouvir instruções',
    next: 'Montar os minutos',
    result: 'Ver resultado',
  },

  hours12: /* @__PURE__ */ sequence(12, 1),
  hours24: /* @__PURE__ */ sequence(24),
  minutePools: {
    60: [0, 12, 15, 30, 45],
    15: [0, 3, 6, 9, 15, 30, 45],
    5: /* @__PURE__ */ sequence(12, 0, 5),
    1: /* @__PURE__ */ sequence(60),
  },
  atmospheres: { 'da madrugada': 'madrugada', 'da manhã': 'manha', 'da tarde': 'tarde', 'da noite': 'noite' },
  oppositePeriods: {
    'da madrugada': 'da tarde',
    'da manhã': 'da noite',
    'da tarde': 'da madrugada',
    'da noite': 'da manhã',
  },
  ambient: {
    madrugada: 'night',
    manha: 'day',
    tarde: 'day',
    noite: 'night',
  },
  themeColors: {
    madrugada: '#1b1947',
    manha: '#ffb703',
    tarde: '#fb8500',
    noite: '#0f172a',
  },
  slots: {
    hour: 'Lacuna das horas',
    minute: 'Lacuna dos minutos',
    period: 'Lacuna do período do dia',
  },
  groups: {
    hour: 'horas',
    minute: 'minutos',
    period: 'período do dia',
  },
  resultTitles: {
    3: 'Você é craque das horas!',
    2: 'Muito bom!',
    1: 'Bom trabalho!',
  },
  agplTpl: /* @__PURE__ */ agplTemplate(),
  srcErr:
    'Corresponding Source exige commit exato (ADR-004): informe o SHA do build para montar tree/{commit}.',
  modesList: MODES,
  levelsList: LEVELS,
  answerRegions: ANSWER_REGION_LABELS,
  numberWords: /* @__PURE__ */ buildNumberWords(),
  sounds: {
    pick: [[660, 0, 0.08, 'triangle', 0.15]],
    drop: [
      [523, 0, 0.1, 'triangle', 0.18],
      [784, 0.07, 0.14, 'triangle', 0.18],
    ],
    wrong: [
      [240, 0, 0.16, 'square', 0.06],
      [190, 0.14, 0.24, 'square', 0.06],
    ],
    tick: [[1400, 0, 0.025, 'square', 0.03]],
    success: /* @__PURE__ */ arpeggio([523, 659, 784, 1047], 0.09, 0.22),
    fanfare: /* @__PURE__ */ arpeggio([392, 523, 659, 784, 659, 784, 1047], 0.12, 0.25),
  },
  periods: ['da madrugada', 'da manhã', 'da tarde', 'da noite'],
  copy: APP_COPY,
  hints: HINTS_TABLE,
  praise: ['Muito bem!', 'Isso mesmo!', 'Arrasou!', 'Que incrível!', 'Mandou bem!', 'Perfeito!'],
  progress: ['Isso! Agora a próxima.', 'Boa! Falta pouco.', 'Certo! Continue.'],
  analogDesc: ANALOG_DESC,
} as const;
