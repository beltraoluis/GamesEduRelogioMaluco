// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright 2026 Luis Henrique Coutinho Beltrão
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const SOURCE_REPO_URL = 'https://github.com/beltraoluis/GamesEduRelogioMaluco';

const EDUCATORS_CONTENT = {
  title: 'Para educadores e famílias',
  intro:
    'O Relógio Maluco trabalha a unidade temática Grandezas e Medidas da BNCC (Matemática, Ensino Fundamental – Anos Iniciais), com progressão em quatro níveis. As respostas são montadas arrastando (ou tocando) fichas de números e palavras, com retorno imediato e dicas que apontam os erros mais comuns.',
  bnccHeading: 'Habilidades da BNCC contempladas',
  bnccSkills: [
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
      summary:
        'Ler e registrar medidas e intervalos de tempo usando relógios analógico e digital.',
      where: 'Nível 3 – todos os modos',
    },
    {
      code: 'EF03MA23',
      summary:
        'Ler horas em relógios digitais e analógicos e relacionar hora/minutos e minuto/segundos.',
      where: 'Níveis 2 e 3, modo Ponteiros e Explorar (ponteiro dos segundos)',
    },
    {
      code: 'EF04MA22',
      summary:
        'Ler e registrar medidas e intervalos de tempo em horas, minutos e segundos no cotidiano.',
      where: 'Nível 4 (minuto a minuto e formato 24 h)',
    },
  ],
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
      description:
        'qualquer minuto, conversão entre 15h e "3 horas da tarde", meio-dia e meia-noite.',
    },
  ],
  modesHeading: 'Modos de jogo',
  modes: [
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

const LISTEN_LABEL = 'Ouvir';
const RESET_PROGRESS_LABEL = 'Apagar progresso deste aparelho';

const ANSWER_REGION_LABELS = {
  numbers: 'Resposta: relógio digital com lacunas para as horas e os minutos',
  words: 'Resposta: frase da hora com lacunas para completar',
  hands: 'Resposta: relógio analógico para girar os ponteiros',
};

const MODES = [
  { id: 'numbers', title: 'Números', description: 'Leia o relógio e arraste os números', scored: true },
  { id: 'words', title: 'Palavras', description: 'Monte a frase da hora', scored: true },
  { id: 'hands', title: 'Ponteiros', description: 'Gire os ponteiros do relógio', scored: true },
  { id: 'explore', title: 'Explorar', description: 'Brinque livremente com o relógio', scored: false },
];

const LEVELS = [
  { id: 1, name: 'Horas certas', grade: '1º ano', step: 60, h24: false, bankSize: 3, bncc: ['EF01MA16'] },
  { id: 2, name: 'Meias e quartos', grade: '2º ano', step: 15, h24: false, bankSize: 4, bncc: ['EF02MA19', 'EF03MA23'] },
  { id: 3, name: 'De 5 em 5', grade: '3º ano', step: 5, h24: false, bankSize: 4, bncc: ['EF03MA22', 'EF03MA23'] },
  { id: 4, name: 'Minuto a minuto · 24h', grade: '4º e 5º anos', step: 1, h24: true, bankSize: 4, bncc: ['EF04MA22', 'EF01MA17'] },
];

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

const BIG_HAND = [['m', 'ponteiro grande', 'minute'], ['b', 'minute-hand']];
const SMALL_HAND = [['m', 'ponteiro pequeno', 'hour'], ['b', 'hour-hand']];
const PERIOD_TERM = [['m', 'período do dia', 'period'], ['b', 'period']];
const PERIOD_RANGES = [
  'A ', ['m', 'madrugada', 'period'], ' vai da meia-noite às 5 horas; a ',
  ['m', 'manhã', 'period'], ', das 6 às 11; a ',
  ['m', 'tarde', 'period'], ', das 12 às 17; e a ',
  ['m', 'noite', 'period'], ', das 18 às 23.',
];

const HINTS_TABLE = {
  'drop.group-mismatch': ['Essa ficha é de ', ['m', '{0}', '{1}'], '. Procure a lacuna do mesmo tipo: horas, minutos ou período.'],
  'drop.hour.noon': ['Às 12 horas do dia, dizemos ', ['s', 'meio-dia'], '!'],
  'drop.hour.midnight': ['À zero hora, no meio da noite, dizemos ', ['s', 'meia-noite'], '!'],
  'drop.hour.minute-hand-number': ['Esse é o número para onde o ', ...BIG_HAND, ' aponta. Quem mostra a hora é o ', ...SMALL_HAND, '!'],
  'drop.hour.rounded-up': ['Quase! O ', ...SMALL_HAND, ' ainda ', ['s', 'não'], ' chegou nesse número. Escolha o número que ele já passou.'],
  'drop.hour.add-12-afternoon': ['Olhe o ', ...PERIOD_TERM, '! Depois do meio-dia, somamos 12: 3 horas da tarde são 15 horas.'],
  'drop.hour.no-add-12-morning': ['Olhe o ', ...PERIOD_TERM, '! De manhã e de madrugada, não somamos 12.'],
  'drop.hour.look-hour-hand': ['Olhe o ', ...SMALL_HAND, ': ele mostra as horas.'],
  'drop.hour.subtract-12': ['Depois do meio-dia, tiramos 12: 15 horas são 3 horas da tarde.'],
  'drop.hour.before-colon': ['As ', ['m', 'horas', 'hour'], ' são os números ', ['s', 'antes'], ' dos dois pontos ', ['b', 'colon'], '.'],
  'drop.minute.count-by-5': ['O ', ...BIG_HAND, ' aponta para o {0}, mas cada número vale 5 minutos. Conte de 5 em 5!'],
  'drop.minute.half-not-meio': ['Para as horas, dizemos ', ['s', 'e meia'], ' (meia hora).'],
  'drop.minute.count-from-12': ['Conte de 5 em 5 a partir do 12: 5, 10, 15, 20…'],
  'drop.minute.look-minute-hand': ['Olhe o ', ...BIG_HAND, ': ele mostra os minutos.'],
  'drop.minute.after-colon': ['Os ', ['m', 'minutos', 'minute'], ' são os números ', ['s', 'depois'], ' dos dois pontos ', ['b', 'colon'], '.'],
  'drop.period.ranges': PERIOD_RANGES,
  'help.period': PERIOD_RANGES,
  'hands.minute.on-12': ['Hora certa: o ', ...BIG_HAND, ' fica no 12!'],
  'hands.minute.amount': ['O ', ...BIG_HAND, ' precisa mostrar {0}.'],
  'hands.minute.point-to': ['O ', ...BIG_HAND, ' deve apontar para o {0}.'],
  'hands.hour.adjust': ['Os minutos estão certos! Agora ajuste o ', ...SMALL_HAND, ' das horas.'],
  'hands.hour.position': ['O ', ...SMALL_HAND, ' deve ficar {0}.'],
  'help.hands': ['Primeiro o ', ...BIG_HAND, ' (minutos), depois o ', ['m', 'pequeno', 'hour'], ['b', 'hour-hand'], ' (horas). Os ', ['m', 'números vermelhos dos minutos', 'minute'], ' ajudam a contar.'],
  'help.analog.minute': ['O ', ...BIG_HAND, ' mostra os minutos. Veja os ', ['m', 'números vermelhos dos minutos', 'minute'], ': cada número vale 5 minutos!'],
  'help.analog.hour': ['O ', ...SMALL_HAND, ' mostra a hora. Para qual número ele aponta?'],
  'help.analog.hour-between': ['O ', ...SMALL_HAND, ' mostra a hora. Se ele estiver entre dois números, escolha o que ele já passou.'],
  'help.digital.hour': ['Veja os números ', ['s', 'antes'], ' dos dois pontos ', ['b', 'colon'], ': eles mostram as ', ['m', 'horas', 'hour'], '.'],
  'help.digital.minute': ['Veja os números ', ['s', 'depois'], ' dos dois pontos ', ['b', 'colon'], ': eles mostram os ', ['m', 'minutos', 'minute'], '.'],
  'intro.hands': ['Arraste os ponteiros. Depois toque em ', ['s', 'Pronto!'], '.'],
  'intro.analog': ['Comece pelo ', ...SMALL_HAND, ': ele mostra as horas.'],
  'intro.digital': ['Os números antes dos dois pontos ', ['b', 'colon'], ' são as ', ['m', 'horas', 'hour'], '.'],
  done: ['Rodada completa! Veja quantas estrelas você ganhou.'],
};

const ANALOG_DESC = {
  hourPoint: 'ponteiro curto das horas apontando para o número {0}',
  hourBetween: 'ponteiro curto das horas entre os números {0} e {1}',
  minPoint: 'ponteiro longo dos minutos apontando para o número {0}',
  minBetween: 'ponteiro longo dos minutos entre os números {0} e {1}, {2} depois do número {0}',
  tickOne: '1 tracinho',
  tickMany: '{0} tracinhos',
  stimPrefix: 'Relógio analógico do desafio: ',
  stimLabels: 'marcadores de 5 em 5 minutos visíveis no mostrador',
  ctrlLocked:
    'Use as setas esquerda e direita ou arraste o ponteiro curto das horas (ponteiro longo dos minutos travado no 12).',
  ctrlFree: 'Use as setas ou arraste os ponteiros.',
  interTpl: 'Relógio analógico interativo. {0} Posição atual: {1}.',
};

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };
let commit = process.env.GITHUB_SHA ?? '';
if (!commit) {
  try { commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { /* validated below */ }
}
if (!/^[a-f0-9]{40}$/i.test(commit) || /^0+$/.test(commit)) throw new Error('Build requires a real Git commit or GITHUB_SHA');
try { execFileSync('git', ['cat-file', '-e', `${commit}^{commit}`], { stdio: 'ignore' }); }
catch { throw new Error('Build commit must exist in the Git object database'); }

const isTest = Boolean(process.env.VITEST);

const GLOBAL_KEYFRAMES: Readonly<Record<string, string>> = {
  'mascot-bounce': 'mascot-bounce',
  'mascot-bell-ring': 'mascot-bell-ring',
  'star-pop': 'star-pop',
  'colon-pulse': 'colon-pulse',
  'hint-glow': 'hint-glow',
};

const AGPL_TPL = [
  'O Relógio Maluco (versão {version}) é software livre, distribuído sob a GNU Affero General Public License, versão 3 ou posterior (AGPL-3.0-or-later).',
  'Você pode usar, estudar, modificar e compartilhar o jogo; se oferecer uma versão modificada pela internet, deve disponibilizar o código-fonte correspondente aos usuários.',
  'Os arquivos servidos por este site são compilados e minificados a partir do código-fonte TypeScript/React; eles não são a forma preferida para modificação.',
  `O Corresponding Source desta versão está no repositório GitHub: {sourceUrl} (repositório: ${SOURCE_REPO_URL}).`,
  'Para reproduzir o build: clone o repositório no commit indicado, execute `npm ci` e em seguida `npm run build`; a saída fica em `dist/`.',
  'Os textos integrais da licença e das dependências empacotadas ficam precacheados offline em LICENSE.txt e THIRD_PARTY_LICENSES.txt.',
  'O programa é fornecido sem qualquer garantia.',
].join(' ');

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildStaticTemplates(resolveClass: (mod: string, local: string) => string): string {
  const td = (c: string) => resolveClass('TeachersDialog', c);
  const hs = (c: string) => resolveClass('HomeScreen', c);
  const tm = (c: string) => resolveClass('TicMascot', c);
  const es = (c: string) => resolveClass('ExploreScreen', c);
  const gs = (c: string) => resolveClass('GameScreen', c);
  const hb = (c: string) => resolveClass('HandBadge', c);

  const handBadgeHtml = (kind: string) =>
    `<svg viewBox="0 0 24 24" width="20" height="20" class="${hb('handBadge')} ${hb('inline')}" aria-hidden="true" focusable="false" data-badge-kind="${kind}" data-badge-size="inline"><use href="./icons/sprite.svg#hb-${kind}"></use></svg>`;

  const educatorsHtml = [
    `<p class="${td('paragraph')}">${escapeHtml(EDUCATORS_CONTENT.intro)}</p>`,
    `<h3 id="rm-bncc-h" class="${td('sectionTitle')}">${escapeHtml(EDUCATORS_CONTENT.bnccHeading)}</h3>`,
    `<div class="${td('tableWrapper')}" role="region" aria-labelledby="rm-bncc-h">`,
    `<table class="${td('bnccTable')}" role="table"><thead><tr><th scope="col">Código</th><th scope="col">Resumo da habilidade</th><th scope="col">Onde aparece</th></tr></thead><tbody role="rowgroup">`,
    ...EDUCATORS_CONTENT.bnccSkills.map(
      (e) =>
        `<tr role="row" data-bncc-row="${e.code}"><th scope="row" role="rowheader">${e.code}</th><td role="cell">${escapeHtml(e.summary)}</td><td role="cell">${escapeHtml(e.where)}</td></tr>`,
    ),
    `</tbody></table></div>`,
    `<p class="${td('smallText')}">${escapeHtml(EDUCATORS_CONTENT.bnccDisclaimer)}</p>`,
    `<h3 class="${td('sectionTitle')}">${escapeHtml(EDUCATORS_CONTENT.levelsHeading)}</h3>`,
    `<ul class="${td('list')}">`,
    ...EDUCATORS_CONTENT.levels.map(
      (l) => `<li><strong>${escapeHtml(l.title)}:</strong> ${escapeHtml(l.description)}</li>`,
    ),
    `</ul>`,
    `<h3 class="${td('sectionTitle')}">${escapeHtml(EDUCATORS_CONTENT.modesHeading)}</h3>`,
    `<ul class="${td('list')}">`,
    ...EDUCATORS_CONTENT.modes.map(
      (m) => `<li><strong>${escapeHtml(m.title)}:</strong> ${escapeHtml(m.description)}</li>`,
    ),
    `</ul>`,
    `<h3 class="${td('sectionTitle')}">${escapeHtml(EDUCATORS_CONTENT.competenciesHeading)}</h3>`,
    `<p class="${td('paragraph')}">${escapeHtml(EDUCATORS_CONTENT.competencies)}</p>`,
    `<div class="${td('tagList')}" aria-hidden="true"><span class="${td('tagHour')}">azul + filete sólido = horas</span><span class="${td('tagMinute')}">vermelho + borda tracejada = minutos</span><span class="${td('tagPeriod')}">roxo + pílula = período do dia</span></div>`,
    `<h3 class="${td('sectionTitle')}">${escapeHtml(EDUCATORS_CONTENT.usageHeading)}</h3>`,
    `<ul class="${td('list')}">`,
    ...EDUCATORS_CONTENT.usageSuggestions.map((s) => `<li>${escapeHtml(s)}</li>`),
    `</ul>`,
  ].join('');

  const homeHeroHtml = [
    `<div class="${hs('mascotWrap')}">`,
    `<svg viewBox="0 0 120 120" width="96" height="96" class="${tm('mascot')} ${tm('md')}" aria-hidden="true" focusable="false" data-mascot="tic" data-mood="happy" data-size="md" data-mascot-ambient="day" data-motion="bounce"><g><g data-mascot-bells="true" data-motion="decorative" data-bell="left" fill="#ff8fab"><use data-bell="right" fill="#ff8fab" href="./icons/sprite.svg#tic-bells"></use></g><use href="./icons/sprite.svg#tic-body-day"></use><g class="${tm('clockHand')}"><use href="./icons/sprite.svg#tic-hand"></use></g><g data-mood-layer="happy"><g class="${tm('eyes')}"><use href="./icons/sprite.svg#tic-eyes-happy"></use></g><use href="./icons/sprite.svg#tic-face-happy"></use></g></g></svg>`,
    `</div>`,
    `<div class="${hs('titleBlock')}"><h1 id="rm-home-title" class="${hs('title')}">${escapeHtml(APP_COPY.home.title)}</h1><p class="${hs('subtitle')}">${escapeHtml(APP_COPY.home.subtitle)}</p></div>`,
  ].join('');

  const exploreFactsHtml = [
    `<ul class="${es('facts')}">`,
    `<li class="${es('factItem')}">${handBadgeHtml('hour-hand')}<span>${escapeHtml(APP_COPY.explore.facts[0])}</span></li>`,
    `<li class="${es('factItem')}">${handBadgeHtml('minute-hand')}<span>${escapeHtml(APP_COPY.explore.facts[1])}</span></li>`,
    `<li class="${es('factItem')}"><span class="${es('secondBadge')}" aria-hidden="true"><span class="${es('secondNeedle')}"></span></span><span>${escapeHtml(APP_COPY.explore.facts[2])}</span></li>`,
    `<li class="${es('factItem')}"><span class="${es('hourglassIcon')}" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke-linecap="round" stroke-linejoin="round" data-ui-icon="HourglassTime" aria-hidden="true"><use href="./icons/sprite.svg#ui-HourglassTime"></use></svg></span><span>${escapeHtml(APP_COPY.explore.facts[3])}</span></li>`,
    `</ul>`,
    `<p class="${es('dragTip')}">${escapeHtml(APP_COPY.explore.dragTip)}</p>`,
  ].join('');

  const handsLegendHtml = [
    `<span class="${gs('legendItem')}">${handBadgeHtml('hour-hand')}<span>pequeno = horas</span></span>`,
    `<span class="${gs('legendItem')}">${handBadgeHtml('minute-hand')}<span>grande = minutos</span></span>`,
  ].join('');

  const jsonPayload = JSON.stringify({
    agplTpl: AGPL_TPL,
    srcErr:
      'Corresponding Source exige commit exato (ADR-004): informe o SHA do build para montar tree/{commit}.',
    modesList: MODES,
    levelsList: LEVELS,
    answerRegions: ANSWER_REGION_LABELS,
    units: [
      'zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
      'dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove',
    ],
    tens: { 20: 'vinte', 30: 'trinta', 40: 'quarenta', 50: 'cinquenta' },
    periods: ['da madrugada', 'da manhã', 'da tarde', 'da noite'],
    copy: APP_COPY,
    hints: HINTS_TABLE,
    praise: ['Muito bem!', 'Isso mesmo!', 'Arrasou!', 'Que incrível!', 'Mandou bem!', 'Perfeito!'],
    progress: ['Isso! Agora a próxima.', 'Boa! Falta pouco.', 'Certo! Continue.'],
    analogDesc: ANALOG_DESC,
  });

  return [
    `<script id="rm-data" type="application/json">${jsonPayload}</script>`,
    `<template id="rm-tpl-educators">${educatorsHtml}</template>`,
    `<template id="rm-tpl-home-hero">${homeHeroHtml}</template>`,
    `<template id="rm-tpl-explore-facts">${exploreFactsHtml}</template>`,
    `<template id="rm-tpl-hands-legend">${handsLegendHtml}</template>`,
  ].join('');
}

function buildOptimizationPlugin(): Plugin {
  const classLookup = new Map<string, string>();
  return {
    name: 'relogio-build-optimization',
    apply: 'build',
    generateBundle(_options, bundle) {
      const freq = new Map<string, number>();
      const tokenRe = /\bcm_[a-zA-Z0-9_-]+/g;
      for (const item of Object.values(bundle)) {
        const text = item.type === 'chunk' ? item.code : typeof item.source === 'string' ? item.source : '';
        for (const m of text.matchAll(tokenRe)) {
          freq.set(m[0], (freq.get(m[0]) ?? 0) + 1);
        }
      }
      const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const tail = `${chars}0123456789_`;
      const map = new Map<string, string>();
      let idx = 0;
      for (const [token] of sorted) {
        const globalKeyframe = Object.keys(GLOBAL_KEYFRAMES).find((kf) => token.endsWith(`_${kf}`));
        if (globalKeyframe) {
          map.set(token, globalKeyframe);
          continue;
        }
        const c0 = chars[idx % chars.length]!;
        const n = Math.floor(idx / chars.length);
        const short = n === 0 ? `_${c0}` : `${c0}${tail[n - 1]!}`;
        map.set(token, short);
        const m = /^cm_([a-zA-Z0-9-]+?)(?:-module)?_([a-zA-Z0-9_-]+)$/.exec(token);
        if (m) {
          classLookup.set(`${m[1]}:${m[2]}`, short);
        }
        idx++;
      }

      const dynamicKeys = new Set([
        'sm', 'md', 'lg', 'inline', 'primary', 'soft', 'go', 'icon', 'ghost',
        'numbers', 'words', 'hands', 'explore', 'perfect', 'completed', 'current', 'pending',
        'neutral', 'positive', 'corrective',
      ]);

      for (const item of Object.values(bundle)) {
        if (item.type === 'chunk') {
          let code = item.code.replace(tokenRe, (t) => map.get(t) ?? t);
          const cssObjRe = /\b([a-zA-Z0-9_$]+)=\{((?:[a-zA-Z0-9_$-]+|"[^"]+"):\`[a-zA-Z_][a-zA-Z0-9_-]*\`(?:,(?:[a-zA-Z0-9_$-]+|"[^"]+"):\`[a-zA-Z_][a-zA-Z0-9_-]*\`)*)\}/g;
          const objMaps = new Map<string, { full: string; propMap: Map<string, string> }>();
          for (const m of code.matchAll(cssObjRe)) {
            const varName = m[1]!;
            const body = m[2]!;
            const propMap = new Map<string, string>();
            for (const pm of body.matchAll(/([a-zA-Z0-9_$-]+|"[^"]+"):\`([a-zA-Z_][a-zA-Z0-9_-]*)\`/g)) {
              propMap.set(pm[1]!.replace(/^"|"$/g, ''), pm[2]!);
            }
            const values = [...propMap.values()];
            if (values.every((v) => v.length === 2 || v in GLOBAL_KEYFRAMES)) {
              objMaps.set(varName, { full: m[0], propMap });
            }
          }
          for (const [varName, { full, propMap }] of objMaps) {
            for (const [k, v] of propMap) {
              if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k)) {
                code = code.replace(new RegExp(`\\b${varName.replace(/\$/g, '\\$')}\\.${k}\\b`, 'g'), `\`${v}\``);
              }
            }
            const kept = [...propMap.entries()].filter(([k]) => dynamicKeys.has(k)).map(([k, v]) => `${k}:\`${v}\``);
            code = code.replace(full, `${varName}={${kept.join(',')}}`);
          }
          item.code = code;
        } else if (
          typeof item.source === 'string' &&
          (item.fileName.endsWith('.css') || item.fileName.endsWith('.html'))
        ) {
          item.source = item.source.replace(tokenRe, (t) => map.get(t) ?? t);
        }
      }
    },
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const resolveClass = (mod: string, local: string): string =>
          classLookup.get(`${mod}:${local}`) ?? `cm_${mod}-module_${local}`;
        const injected = buildStaticTemplates(resolveClass);
        return html.replace('</body>', `${injected}</body>`);
      },
    },
  };
}

export default defineConfig({
  base: './',
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    target: 'baseline-widely-available',
    assetsInlineLimit: 0,
    // The single application chunk has no module dependencies to preload.
    modulePreload: { polyfill: false },
    rolldownOptions: { output: { codeSplitting: false } },
  },
  define: { __APP_VERSION__: JSON.stringify(pkg.version), __APP_COMMIT__: JSON.stringify(commit) },
  css: {
    transformer: 'lightningcss',
    lightningcss: { cssModules: isTest ? {} : { pattern: 'cm_[name]_[local]' } },
  },
  plugins: [buildOptimizationPlugin(), react(), VitePWA({ strategies: 'generateSW', registerType: 'prompt', injectRegister: false, filename: 'sw.js', manifestFilename: 'manifest.webmanifest', manifest: { lang: 'pt-BR', description: 'Aprenda a ler as horas brincando com o Relógio Maluco.', icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }, { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }], name: 'Relógio Maluco', short_name: 'Relógio Maluco', start_url: './', scope: './', display: 'standalone', theme_color: '#ffb703', background_color: '#ffffff' }, workbox: { globPatterns: ['**/*.{js,css,html,webp,woff2,png,svg,txt,webmanifest,md}'], skipWaiting: true, clientsClaim: true, cleanupOutdatedCaches: true, importScripts: ['sw-legacy-cleanup.js'], navigateFallback: 'index.html', navigateFallbackDenylist: [/\/LICENSE(\.txt)?$/, /\/THIRD_PARTY_LICENSES\.txt$/] } })],
  test: { globals: true, environment: 'jsdom', setupFiles: ['src/test/setup.ts'], exclude: ['**/node_modules/**', '**/dist/**', 'legacy/**', 'e2e/**'] },
});
