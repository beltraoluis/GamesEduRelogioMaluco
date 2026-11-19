// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

/**
 * Tipos puros do domínio do Relógio Maluco (contrato congelado no G0).
 *
 * Regras deste arquivo:
 * - zero imports de React, DOM, `window`, `document` ou módulos fora de `domain/`;
 * - apenas tipos: nenhuma lógica, nenhum valor em tempo de execução;
 * - mudanças exigem CCR (ver ADR-004).
 *
 * Convenções:
 * - horas do domínio são sempre 0–23 (`ClockTime.h`); a conversão para 12 h
 *   (`to12`) é feita só na exibição/leitura;
 * - propriedades opcionais seguem `exactOptionalPropertyTypes`: ausente
 *   significa "não informado"; nunca atribua `undefined` explicitamente;
 * - todo estado é `readonly` e substituído por cópia no reducer.
 */

/* ------------------------------------------------------------------ */
/* Identificadores básicos                                             */
/* ------------------------------------------------------------------ */

export type LevelId = 1 | 2 | 3 | 4;

/** Modos com pontuação (rodada de perguntas). */
export type GameMode = 'numbers' | 'words' | 'hands';

/** Todos os cartões da tela inicial (o `explore` não tem rodada nem estrelas). */
export type ModeId = GameMode | 'explore';

/** Grupo pedagógico de uma ficha/lacuna (cor fixa: azul, vermelho, roxo). */
export type Group = 'hour' | 'minute' | 'period';

export type HandName = 'hour' | 'minute';

export type HandTarget = HandName | 'both';

/** O que a criança lê para responder. */
export type Stimulus = 'analog' | 'digital';

/** Período do dia por extenso, exatamente como aparece na frase. */
export type Period = 'da madrugada' | 'da manhã' | 'da tarde' | 'da noite';

/** Chave visual (sem acento) do período, usada em temas/ambientação. */
export type Atmosphere = 'madrugada' | 'manha' | 'tarde' | 'noite';

/** Chave das estrelas salvas: `numbers-1`, `words-4`, ... */
export type StarsKey = `${GameMode}-${LevelId}`;

/** Resultado de uma rodada. */
export type Stars = 1 | 2 | 3;

/** Valor exibido em cartões e tela de resultado (0 = ainda não jogou). */
export type StarCount = 0 | Stars;

/** Passo dos minutos por nível: 60 (horas certas), 15, 5 e 1. */
export type MinuteStep = 60 | 15 | 5 | 1;

/**
 * Hora do relógio.
 * - `h`: 0–23;
 * - `m`: 0–59;
 * - `s`: 0–59, presente só no modo explorar com a hora atual.
 */
export interface ClockTime {
  readonly h: number;
  readonly m: number;
  readonly s?: number;
}

/**
 * Gerador pseudoaleatório determinístico: retorna um número em [0, 1).
 * O domínio nunca usa `Math.random`; o `rng` é sempre injetado (por seed).
 */
export type Rng = () => number;

/** Habilidades da BNCC (Grandezas e Medidas) cobertas pelo jogo. */
export type BnccSkill =
  | 'EF01MA16'
  | 'EF01MA17'
  | 'EF02MA19'
  | 'EF03MA22'
  | 'EF03MA23'
  | 'EF04MA22';

/* ------------------------------------------------------------------ */
/* Metadados de níveis e modos                                         */
/* ------------------------------------------------------------------ */

export interface Level {
  readonly id: LevelId;
  /** Ex.: "Horas certas". */
  readonly name: string;
  /** Ex.: "1º ano". */
  readonly grade: string;
  readonly step: MinuteStep;
  /** `true` no nível 4: horas 0–23, períodos do dia, meio-dia e meia-noite. */
  readonly h24: boolean;
  /** Quantidade de fichas por banco (resposta + distratores). */
  readonly bankSize: number;
  readonly bncc: readonly BnccSkill[];
}

export interface ModeMeta {
  readonly id: ModeId;
  /** Ex.: "Números". */
  readonly title: string;
  /** Ex.: "Leia o relógio e arraste os números". */
  readonly description: string;
  /** `false` só para `explore` (sem rodada, sem estrelas). */
  readonly scored: boolean;
}

/* ------------------------------------------------------------------ */
/* Frases e fichas                                                     */
/* ------------------------------------------------------------------ */

export interface PhraseOptions {
  /** Frase em 12 h + período, meio-dia e meia-noite (h deve ser 0–23). */
  readonly withPeriod?: boolean;
  /** Usa "e meia" para 30 minutos (padrão: `true`). */
  readonly useHalf?: boolean;
}

/** Parte de uma frase da hora: texto fixo ou lacuna a preencher. */
export type PhrasePart =
  | {
      readonly kind: 'text';
      readonly text: string;
    }
  | {
      readonly kind: 'slot';
      readonly group: Group;
      /** Texto exato esperado (ex.: "três", "meia", "meio-dia", "da tarde"). */
      readonly answer: string;
      /** Valor numérico correspondente (ausente para `period`). */
      readonly num?: number;
    };

export interface TileSpec {
  /** Único dentro da pergunta (ex.: `hour-0`). */
  readonly id: string;
  readonly group: Group;
  /** Texto exibido e comparado com `SlotSpec.answer` (ex.: "03", "três"). */
  readonly value: string;
  /** Valor numérico, usado nos diagnósticos de erro (ausente para `period`). */
  readonly num?: number;
}

export interface SlotSpec {
  /** Único dentro da pergunta (ex.: `slot-hour`). */
  readonly id: string;
  readonly group: Group;
  readonly answer: string;
  /** Nome acessível da lacuna vazia (ex.: "Lacuna das horas"). */
  readonly label: string;
}

export interface BankSpec {
  readonly group: Group;
  /** Já embaralhadas pelo `rng` da sessão. */
  readonly tiles: readonly TileSpec[];
}

/* ------------------------------------------------------------------ */
/* Perguntas                                                           */
/* ------------------------------------------------------------------ */

export interface QuestionBase {
  /** Posição na rodada (0-based). */
  readonly index: number;
  /** Hora-alvo (h 0–23). */
  readonly time: ClockTime;
  /** Hora como aparece no relógio digital: `to12(h)` ou `h` no nível 24 h. */
  readonly displayH: number;
  readonly stimulus: Stimulus;
}

/** Lê o analógico e arrasta números para o digital. */
export interface NumbersQuestion extends QuestionBase {
  readonly mode: 'numbers';
  readonly stimulus: 'analog';
  readonly slots: readonly SlotSpec[];
  readonly banks: readonly BankSpec[];
  /** Presente só no nível 24 h (selo do período abaixo do relógio). */
  readonly period?: Period;
}

/** Completa a frase por extenso. */
export interface WordsQuestion extends QuestionBase {
  readonly mode: 'words';
  readonly parts: readonly PhrasePart[];
  readonly slots: readonly SlotSpec[];
  readonly banks: readonly BankSpec[];
}

/** Lê o digital e gira os ponteiros. */
export interface HandsQuestion extends QuestionBase {
  readonly mode: 'hands';
  readonly stimulus: 'digital';
  /** Posição inicial dos ponteiros (sempre diferente da resposta). */
  readonly start: ClockTime;
  readonly minuteStep: MinuteStep;
  /** Nível 1: ponteiro grande travado no 12. */
  readonly lockMinute: boolean;
  /** Nível 3: números vermelhos dos minutos visíveis desde o início. */
  readonly minuteLabels: boolean;
  /** Níveis 1 e 2: frase por extenso abaixo do relógio digital. */
  readonly phrase?: string;
}

export type Question = NumbersQuestion | WordsQuestion | HandsQuestion;

/* ------------------------------------------------------------------ */
/* Tentativas, dicas e mensagens                                       */
/* ------------------------------------------------------------------ */

/** Uma tentativa registrada na pergunta atual. */
export type Attempt =
  | {
      readonly kind: 'drop';
      readonly tileId: string;
      readonly slotId: string;
      /** Grupo da ficha. */
      readonly tileGroup: Group;
      /** Grupo da lacuna. */
      readonly slotGroup: Group;
      readonly value: string;
      readonly num?: number;
      readonly correct: boolean;
    }
  | {
      readonly kind: 'hands';
      /** Posição dos ponteiros no momento do "Pronto!". */
      readonly time: ClockTime;
      readonly hourOk: boolean;
      readonly minuteOk: boolean;
      readonly correct: boolean;
    };

/**
 * Todos os códigos de dica/diagnóstico do jogo.
 *
 * - `drop.*`: erro ao soltar uma ficha (diagnóstico específico do erro comum);
 * - `hands.*`: erro no "Pronto!" do modo ponteiros;
 * - `help.*`: botão "Dica" (pedido explícito, nunca falado automaticamente).
 */
export type HintCode =
  // Ficha na lacuna de outra cor (não conta como erro).
  | 'drop.group-mismatch'
  // Horas: 24 h, frases especiais.
  | 'drop.hour.noon'
  | 'drop.hour.midnight'
  // Horas: leitura do analógico.
  | 'drop.hour.minute-hand-number'
  | 'drop.hour.rounded-up'
  | 'drop.hour.add-12-afternoon'
  | 'drop.hour.no-add-12-morning'
  | 'drop.hour.look-hour-hand'
  // Horas: leitura do digital.
  | 'drop.hour.subtract-12'
  | 'drop.hour.before-colon'
  // Minutos.
  | 'drop.minute.count-by-5'
  | 'drop.minute.half-not-meio'
  | 'drop.minute.count-from-12'
  | 'drop.minute.look-minute-hand'
  | 'drop.minute.after-colon'
  // Período do dia.
  | 'drop.period.ranges'
  // Modo ponteiros (verificação).
  | 'hands.minute.on-12'
  | 'hands.minute.amount'
  | 'hands.minute.point-to'
  | 'hands.hour.adjust'
  | 'hands.hour.position'
  // Botão "Dica".
  | 'help.hands'
  | 'help.analog.minute'
  | 'help.analog.hour'
  | 'help.analog.hour-between'
  | 'help.digital.hour'
  | 'help.digital.minute'
  | 'help.period';

/** Todo código que o balão do mascote pode exibir. */
export type MessageCode = HintCode | 'intro' | 'praise' | 'progress' | 'done';

/** Dados que o gerador de mensagens precisa para montar o texto de um código. */
export interface HintContext {
  readonly mode: GameMode;
  readonly level: Level;
  /** Hora-alvo da pergunta (h 0–23). */
  readonly time: ClockTime;
  readonly displayH: number;
  readonly stimulus: Stimulus;
  /** Grupo em foco (lacuna da tentativa ou próxima lacuna vazia). */
  readonly group?: Group;
  /** Tentativa que gerou o diagnóstico (ausente em `help.*`, `intro`, ...). */
  readonly attempt?: Attempt;
  readonly mistakes: number;
  readonly wrongByGroup: Readonly<Record<Group, number>>;
  /**
   * Índice para variar frases curtas (elogios, progresso) de forma
   * determinística; escolhido pelo `rng` da sessão.
   */
  readonly variant: number;
}

/** O que o balão do mascote deve mostrar agora. */
export interface Feedback {
  readonly code: MessageCode;
  readonly context: HintContext;
  /** Tom para humor do mascote e estilo do balão. */
  readonly tone: 'neutral' | 'positive' | 'corrective';
}

/** Realces visuais pedidos pelo botão "Dica". */
export interface HelpHighlight {
  /** Ponteiro(s) a pulsar no analógico. */
  readonly hands?: HandTarget;
  /** Lacuna a brilhar (próxima vazia). */
  readonly slotId?: string;
  /** Bloco do relógio digital-estímulo a brilhar. */
  readonly digitalGroup?: HandName;
  /** Mostrar os números vermelhos dos minutos no analógico. */
  readonly minuteLabels: boolean;
}

/* ------------------------------------------------------------------ */
/* Estado do jogo                                                      */
/* ------------------------------------------------------------------ */

export interface QuestionState {
  readonly question: Question;
  /** `slotId -> tileId` das lacunas já preenchidas corretamente. */
  readonly filled: Readonly<Record<string, string>>;
  /** Fichas já usadas (desabilitadas). */
  readonly usedTileIds: readonly string[];
  /** Posição atual dos ponteiros (modo `hands`); `null` nos demais modos. */
  readonly hands: ClockTime | null;
  /** Erros que contam para as estrelas (ficha de outra cor não conta). */
  readonly mistakes: number;
  readonly wrongByGroup: Readonly<Record<Group, number>>;
  readonly attempts: readonly Attempt[];
  /** A criança pediu "Dica" nesta pergunta. */
  readonly hinted: boolean;
  readonly done: boolean;
}

export type GameStatus = 'playing' | 'finished';

/**
 * Efeitos colaterais descritos pelo reducer (som, fala, confete, foco...).
 * O reducer nunca executa efeitos: ele só os publica em `GameState.events`.
 */
export type GameEvent =
  | { readonly type: 'question-started'; readonly index: number }
  | { readonly type: 'tile-placed'; readonly tileId: string; readonly slotId: string; readonly questionComplete: boolean }
  | {
      readonly type: 'tile-rejected';
      readonly tileId: string;
      readonly slotId: string;
      readonly hint: HintCode;
      /** `false` para `drop.group-mismatch`. */
      readonly counted: boolean;
    }
  | { readonly type: 'hands-rejected'; readonly hint: HintCode; readonly highlight: HandName }
  | { readonly type: 'help-shown'; readonly hint: HintCode; readonly highlight: HelpHighlight }
  | { readonly type: 'question-completed'; readonly index: number; readonly mistakes: number; readonly perfect: boolean }
  | { readonly type: 'round-finished'; readonly summary: RoundSummary };

/**
 * Evento com identificação para consumo idempotente.
 * O consumidor (efeito React) guarda o último `seq` processado por
 * `sessionId` e ignora repetições (StrictMode monta/efetua duas vezes).
 */
export interface GameEventEnvelope {
  readonly sessionId: string;
  /** Estritamente crescente dentro da sessão, começando em 1. */
  readonly seq: number;
  readonly event: GameEvent;
}

export interface RoundSummary {
  readonly mode: GameMode;
  readonly levelId: LevelId;
  readonly starsKey: StarsKey;
  /** Erros por pergunta, na ordem da rodada. */
  readonly results: readonly number[];
  readonly totalMistakes: number;
  /** Perguntas acertadas de primeira. */
  readonly perfect: number;
  /** Regra: total <= 1 -> 3; total <= 5 -> 2; senão 1. */
  readonly stars: Stars;
}

export interface GameState {
  /** Gerado fora do reducer (ex.: `crypto.randomUUID()` na UI). */
  readonly sessionId: string;
  readonly mode: GameMode;
  readonly level: Level;
  readonly status: GameStatus;
  readonly roundLength: number;
  /** Seed inicial da sessão (reprodutibilidade em testes e bugs). */
  readonly seed: number;
  /** Estado interno do PRNG (uint32) após o último sorteio. */
  readonly rngState: number;
  /** Índice da pergunta atual (0-based). */
  readonly index: number;
  /** Erros por pergunta concluída. */
  readonly results: readonly number[];
  /** Horas já sorteadas na rodada, como `h:m`, para evitar repetição. */
  readonly usedTimes: readonly string[];
  readonly current: QuestionState;
  readonly feedback: Feedback;
  /** Último `seq` emitido nesta sessão (0 antes do primeiro evento). */
  readonly seq: number;
  /** Eventos emitidos pela última ação (substituídos a cada ação). */
  readonly events: readonly GameEventEnvelope[];
  /** Presente quando `status === 'finished'`. */
  readonly summary?: RoundSummary;
}

export type GameAction =
  | {
      readonly type: 'start';
      readonly sessionId: string;
      readonly mode: GameMode;
      readonly levelId: LevelId;
      readonly seed: number;
      /** Padrão: 8. */
      readonly roundLength?: number;
    }
  /** Soltar uma ficha sobre uma lacuna (arrastar). */
  | { readonly type: 'drop-tile'; readonly tileId: string; readonly slotId: string }
  /** Tocar/Enter na ficha: vai para a primeira lacuna vazia do mesmo grupo. */
  | { readonly type: 'tap-tile'; readonly tileId: string }
  /** Ponteiros movidos (modo `hands`). */
  | { readonly type: 'move-hands'; readonly time: ClockTime }
  /** Botão "Pronto!" (modo `hands`). */
  | { readonly type: 'check-hands' }
  /** Botão "Dica". */
  | { readonly type: 'request-help' }
  /** Botão "Próxima" (ou fim da rodada na última pergunta). */
  | { readonly type: 'next' };

/* ------------------------------------------------------------------ */
/* Preferências e progresso (localStorage `relogio-maluco-v1`)         */
/* ------------------------------------------------------------------ */

export type StarsMap = Readonly<Partial<Record<StarsKey, Stars>>>;

export interface Preferences {
  readonly level: LevelId;
  readonly sound: boolean;
  readonly voice: boolean;
  /** Melhor resultado por modo e nível. */
  readonly stars: StarsMap;
}

/** Resultado da leitura tolerante do JSON salvo. */
export interface ParsedPreferences {
  readonly prefs: Preferences;
  /**
   * - `default`: nada salvo ou armazenamento indisponível;
   * - `stored`: JSON válido, todos os campos aproveitados;
   * - `repaired`: JSON válido com campos inválidos descartados;
   * - `corrupt`: JSON ilegível, padrões aplicados.
   */
  readonly source: 'default' | 'stored' | 'repaired' | 'corrupt';
  /** Chaves desconhecidas preservadas para compatibilidade futura. */
  readonly extra: Readonly<Record<string, unknown>>;
}

/**
 * Escrita concorrente por operação: cada mudança é uma operação aplicada
 * sobre a leitura MAIS RECENTE do armazenamento (não sobre a cópia em
 * memória), para que abas concorrentes não apaguem as estrelas umas das
 * outras.
 */
export type PreferencesWriteOp =
  | { readonly op: 'set-level'; readonly level: LevelId }
  | { readonly op: 'set-sound'; readonly on: boolean }
  | { readonly op: 'set-voice'; readonly on: boolean }
  /** Mescla por máximo: nunca reduz uma estrela já salva. */
  | { readonly op: 'record-stars'; readonly key: StarsKey; readonly stars: Stars }
  /** Remove todas as estrelas (preserva nível, som e voz). */
  | { readonly op: 'reset-stars' };

export interface PreferencesWriteResult {
  readonly prefs: Preferences;
  /** `true` se o estado mudou (ex.: `record-stars` abaixo do recorde -> `false`). */
  readonly changed: boolean;
}
