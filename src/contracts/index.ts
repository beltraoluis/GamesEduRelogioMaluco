// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

/**
 * Contratos congelados para as fases F1–F3 (consenso Opus + Argon + Codex + Grok).
 *
 * - F1a implementa `ClockMathApi` em `domain/clockMath.ts`;
 * - F1b codifica contra `ClockMathApi` (ou fakes) antes de F1a terminar;
 * - F2/F3 implementam hooks e componentes com exatamente estas props/APIs.
 *
 * Qualquer mudança aqui (inclusive `PEDAGOGICAL_COLORS`) exige CCR (ADR-004).
 *
 * Convenção de props opcionais (`exactOptionalPropertyTypes`): `prop?: T`
 * significa "pode faltar"; nunca passe `undefined` explicitamente; use spread
 * condicional (`{...(x === undefined ? {} : { prop: x })}`).
 */

import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react';

import { readDomJson } from '../content/runtimeDomData';
import type { BadgeKind, Message } from '../domain/messages';
import type {
  Atmosphere,
  BankSpec,
  ClockTime,
  GameEventEnvelope,
  GameMode,
  GameState,
  Group,
  HandName,
  HandTarget,
  Level,
  LevelId,
  MinuteStep,
  ModeId,
  ModeMeta,
  Period,
  PhraseOptions,
  PhrasePart,
  Preferences,
  Rng,
  SlotSpec,
  StarCount,
  Stars,
  StarsKey,
  TileSpec,
} from '../domain/types';

export type * from '../domain/types';
export type { BadgeKind, BadgeSegment, Message, MessageSegment, StrongSegment, TermSegment, TextSegment } from '../domain/messages';

/* ------------------------------------------------------------------ */
/* Constantes travadas                                                 */
/* ------------------------------------------------------------------ */

/**
 * Cores pedagógicas fixas (travadas sob CCR). A cor nunca é o único sinal:
 * toda informação codificada por cor tem redundância geométrica (ADR-004).
 *
 * - `hour`/`minute`/`period`/`second`/`success`: sobre fundo claro (WCAG AA);
 * - `hourOnDark`/`minuteOnDark`: só para o visor digital escuro (`#1e2832`/`#263238`,
 *   contraste >= 6,51:1); cards e mostrador ficam sempre claros (F0c).
 * - `--color-colon-on-dark` e demais tokens de tema do F0c NÃO estão travados aqui.
 */
export const PEDAGOGICAL_COLORS = {
  hour: '#1560bd',
  minute: '#d62839',
  period: '#7b2cbf',
  second: '#0f766e',
  success: '#2e7d32',
  hourOnDark: '#8ec5ff',
  minuteOnDark: '#ff9aa2',
} as const;

export type PedagogicalColorName = keyof typeof PEDAGOGICAL_COLORS;

/** Chave única do `localStorage` (compatível com o legado). */
export const PREFERENCES_STORAGE_KEY = 'relogio-maluco-v1';

/** Perguntas por rodada. */
export const ROUND_LENGTH = 8;

/** Atributo que identifica uma lacuna para o hit-test do arrasto. */
export const SLOT_ID_ATTRIBUTE = 'data-slot-id';

const FALLBACK_ANSWER_REGION_LABELS: Readonly<Record<GameMode, string>> = {
  numbers: 'Resposta: relógio digital com lacunas para as horas e os minutos',
  words: 'Resposta: frase da hora com lacunas para completar',
  hands: 'Resposta: relógio analógico para girar os ponteiros',
};

/** Nome acessível da região de resposta (`role="group"`) por modo. */
export const ANSWER_REGION_LABELS: Readonly<Record<GameMode, string>> = readDomJson(
  'answerRegions',
  () => (import.meta.env.PROD ? ({} as Readonly<Record<GameMode, string>>) : FALLBACK_ANSWER_REGION_LABELS),
);

/* ------------------------------------------------------------------ */
/* Mascote Tic                                                         */
/* ------------------------------------------------------------------ */

export type MascotMood = 'happy' | 'think' | 'celebrate' | 'hint';

/** Derivado da atmosfera (`ATMOSPHERE_AMBIENT`), nunca escolhido à parte. */
export type MascotAmbient = 'day' | 'night';

/**
 * Atmosfera -> ambiente do mascote. A atmosfera vai no DOM como
 * `data-atmosphere="madrugada | manha | tarde | noite"` (ADR-001).
 */
export const ATMOSPHERE_AMBIENT: Readonly<Record<Atmosphere, MascotAmbient>> = {
  madrugada: 'night',
  manha: 'day',
  tarde: 'day',
  noite: 'night',
};

export type MascotSize = 'sm' | 'md' | 'lg';

export interface MascotProps {
  readonly mood: MascotMood;
  readonly size: MascotSize;
  /** Padrão: `day`; derive de `ATMOSPHERE_AMBIENT[atmosphere]`. */
  readonly ambient?: MascotAmbient;
  /** Incrementar para repetir o pulinho (mesmo com o mesmo humor). */
  readonly bounceSeq?: number;
}

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */

/** Cursor de deduplicação do consumidor da fila de eventos. */
export interface GameEventCursor {
  readonly sessionId: string;
  /** Maior `seq` já executado nesta sessão. */
  readonly seq: number;
}

export interface GameControllerOptions {
  /**
   * Executa UM efeito (som, fala, confete, foco). Chamado no máximo uma vez
   * por `(sessionId, seq)`, em ordem crescente de `seq`.
   */
  readonly onEvent: (envelope: GameEventEnvelope) => void;
}

/**
 * `useGameController(options)`: dono do `useReducer(gameReducer)` E do
 * cursor de deduplicação (um `useRef<GameEventCursor | null>` no mesmo hook,
 * com o mesmo ciclo de vida do estado; nunca em componentes filhos).
 *
 * Num `useEffect` dependente de `state.pendingEvents`:
 * 1. percorre `pendingEvents` em ordem de `seq`;
 * 2. executa só envelopes com `sessionId` diferente do cursor, ou com
 *    `seq > cursor.seq`, e avança o cursor ANTES do próximo;
 * 3. se a fila não estava vazia, despacha
 *    `{ type: 'events/ack', upToSeq: <maior seq da fila> }`.
 *
 * Isso cobre o automatic batching (várias ações -> vários envelopes numa
 * renderização) e a remontagem simulada do StrictMode (o efeito roda de novo
 * antes do `ack` ser aplicado; o cursor impede a repetição).
 */
export interface GameControllerApi {
  /** `null` antes do primeiro `start`. */
  readonly state: GameState | null;
  /** Gera `sessionId` e `seed` fora do reducer e despacha `start`. */
  start(mode: GameMode, levelId: LevelId): void;
  dropTile(tileId: string, slotId: string): void;
  tapTile(tileId: string): void;
  moveHands(time: ClockTime): void;
  checkHands(): void;
  requestHelp(): void;
  next(): void;
}

/**
 * `usePreferences()`: API síncrona; cada setter vira uma `PreferencesWriteOp`
 * aplicada sobre uma releitura imediata do `localStorage` (ADR-002).
 *
 * Best-effort: mitiga sobrescrita por abas com estado obsoleto, mas NÃO
 * garante atomicidade nem exclusão mútua entre abas (o `localStorage` não é
 * transacional; gravações simultâneas ainda podem perder uma operação).
 */
export interface PreferencesApi {
  readonly prefs: Preferences;
  /** `false` quando o `localStorage` está indisponível (modo privado etc.). */
  readonly persistent: boolean;
  setLevel(level: LevelId): void;
  setSound(on: boolean): void;
  setVoice(on: boolean): void;
  /** Máximo só nesta chave, sobre a releitura; `true` se gravou um novo recorde. */
  recordStars(key: StarsKey, stars: Stars): boolean;
  /** Ação explícita: grava `stars: {}` (nível, som e voz são preservados). */
  resetStars(): void;
}

export type SfxName = 'pick' | 'drop' | 'wrong' | 'tick' | 'success' | 'fanfare';

/** `useSound()`: efeitos via Web Audio, sem arquivos. */
export interface SoundApi {
  readonly enabled: boolean;
  /** Sem efeito quando `enabled` é `false` ou não há Web Audio. */
  play(name: SfxName): void;
  /** Retoma o `AudioContext` num gesto do usuário (iOS/Safari). */
  unlock(): void;
}

/**
 * `useSpeech()`: voz do aparelho (pt-BR). Dicas NÃO são faladas
 * automaticamente; só elogios/frase da hora e o botão "Ouvir" (ADR-002).
 */
export interface SpeechApi {
  readonly supported: boolean;
  readonly enabled: boolean;
  readonly speaking: boolean;
  /** Cancela a fala anterior antes de falar. */
  speak(text: string): void;
  /** Equivale a `speak(toPlainText(message))`. */
  speakMessage(message: Message): void;
  cancel(): void;
}

export interface AnalogClockDragOptions {
  readonly time: ClockTime;
  readonly interactive: boolean;
  readonly minuteStep: MinuteStep;
  /** Ponteiro grande travado (nível 1): arrastar move só o das horas. */
  readonly lockMinute: boolean;
  /** Explorar: passar do 59 para o 0 avança a hora (e vice-versa). */
  readonly linkHands: boolean;
  /** Chamado a cada mudança de posição (já quantizada pelo passo). */
  readonly onChange: (time: ClockTime, hand: HandName) => void;
  readonly onGrab?: (hand: HandName) => void;
  readonly onRelease?: (hand: HandName) => void;
}

/** Handlers a espalhar no `<svg>` do relógio. */
export interface AnalogClockDragBindings {
  readonly tabIndex: 0 | -1;
  readonly onPointerDown: (e: ReactPointerEvent<SVGSVGElement>) => void;
  readonly onPointerMove: (e: ReactPointerEvent<SVGSVGElement>) => void;
  readonly onPointerUp: (e: ReactPointerEvent<SVGSVGElement>) => void;
  readonly onPointerCancel: (e: ReactPointerEvent<SVGSVGElement>) => void;
  /** Setas: cima/baixo = minutos; esquerda/direita = horas. */
  readonly onKeyDown: (e: ReactKeyboardEvent<SVGSVGElement>) => void;
}

/** `useAnalogClockDrag(options)`. */
export interface AnalogClockDragApi {
  readonly dragging: HandName | null;
  readonly bind: AnalogClockDragBindings;
}

export interface TileDragOptions {
  readonly tileId: string;
  readonly group: Group;
  /** Texto do fantasma durante o arrasto. */
  readonly label: string;
  readonly disabled: boolean;
  /** Solto sobre uma lacuna vazia (hit-test por `SLOT_ID_ATTRIBUTE`). */
  readonly onDrop: (tileId: string, slotId: string) => void;
  /** Toque rápido (< 8 px de movimento), Enter ou Espaço. */
  readonly onTap: (tileId: string) => void;
  /** Início efetivo do arrasto. */
  readonly onPick?: (tileId: string) => void;
}

export interface TileDragBindings {
  readonly onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  readonly onKeyDown: (e: ReactKeyboardEvent<HTMLButtonElement>) => void;
}

/** `useTileDrag(options)`. */
export interface TileDragApi {
  readonly dragging: boolean;
  readonly bind: TileDragBindings;
}

/** Fantasma desenhado pela camada de arrasto (coordenadas de viewport). */
export interface DragGhost {
  readonly tileId: string;
  readonly group: Group;
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** Animando de volta à origem (solto fora de lacuna). */
  readonly returning: boolean;
}

/** `useDragLayer()`: contexto compartilhado por fichas, lacunas e fantasma. */
export interface DragLayerApi {
  readonly ghost: DragGhost | null;
  /** Lacuna vazia sob o ponteiro (classe "over"). */
  readonly overSlotId: string | null;
  beginDrag(ghost: Omit<DragGhost, 'returning'>): void;
  moveDrag(x: number, y: number, overSlotId: string | null): void;
  /** `returnToOrigin`: solto fora de lacuna (anima a volta). */
  endDrag(returnToOrigin: boolean): void;
}

export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable';

/** `usePwa()`. */
export interface PwaApi {
  /** `beforeinstallprompt` capturado e app ainda não instalado. */
  readonly canInstall: boolean;
  install(): Promise<InstallOutcome>;
  readonly isStandalone: boolean;
  /** Validado contra um cache `workbox-precache-v2-*` real (ADR-003). */
  readonly offlineReady: boolean;
  readonly online: boolean;
  /** iOS Safari fora do modo standalone: mostrar "Compartilhar > Tela de Início". */
  readonly showIosInstallTip: boolean;
}

/**
 * `useServiceWorkerUpdate()` (ADR-003). Com `skipWaiting` + `clientsClaim` o
 * SW novo nunca fica em espera, então a detecção é por troca de controlador,
 * e `controllerchange` é o único gatilho:
 * - no mount: `hadControllerRef = useRef(navigator.serviceWorker.controller !== null)`;
 * - em `controllerchange`: se `!hadControllerRef.current`, faz
 *   `hadControllerRef.current = true` e retorna (suprime só a aquisição
 *   inicial da 1ª instalação); senão, `updateReady = true`;
 * - logo, 1ª instalação seguida de atualização na mesma aba sinaliza no
 *   segundo `controllerchange` (o `ref` não fica congelado no mount).
 *
 * O toast é exibido só na `HomeScreen`. Nunca há reload automático.
 */
export interface ServiceWorkerUpdateApi {
  readonly updateReady: boolean;
  /** Botão "Atualizar agora": `window.location.reload()`, só por clique na `HomeScreen`. */
  applyUpdate: () => void;
  /** "Agora não": esconde o toast; a versão nova vale na próxima abertura natural. */
  dismissToast: () => void;
}

/* ------------------------------------------------------------------ */
/* Componentes                                                         */
/* ------------------------------------------------------------------ */

/** Pedido de realce; incrementar `seq` repete a animação. */
export interface HandHighlight {
  readonly target: HandTarget;
  readonly seq: number;
}

export interface AnalogClockProps {
  readonly time: ClockTime;
  /** Nome acessível do `<svg>` (inclui instruções de teclado quando interativo). */
  readonly label: string;
  readonly interactive?: boolean;
  readonly minuteStep?: MinuteStep;
  readonly lockMinute?: boolean;
  readonly linkHands?: boolean;
  readonly showSeconds?: boolean;
  /** Números vermelhos dos minutos (00, 05, ... 55). */
  readonly minuteLabels?: boolean;
  readonly highlight?: HandHighlight | null;
  readonly size?: 'md' | 'lg';
  /** Padrão: `day`; derive de `ATMOSPHERE_AMBIENT`. O mostrador continua claro. */
  readonly ambient?: MascotAmbient;
  readonly onChange?: (time: ClockTime, hand: HandName) => void;
  readonly onGrab?: (hand: HandName) => void;
}

export interface DigitalClockProps {
  /** Já no formato de exibição (12 h ou 24 h). */
  readonly hours: number;
  readonly minutes: number;
  /** Padrão: "Relógio digital marcando HH:MM". */
  readonly label?: string;
  /** Bloco a brilhar (dica); `seq` repete a animação. */
  readonly glow?: { readonly group: HandName; readonly seq: number } | null;
}

export interface TileProps {
  readonly tile: TileSpec;
  readonly used: boolean;
  /** Incrementar para tremer (resposta errada). */
  readonly shakeSeq?: number;
  readonly onDrop: (tileId: string, slotId: string) => void;
  readonly onTap: (tileId: string) => void;
  readonly onPick?: (tileId: string) => void;
}

/**
 * Lacuna (tile-first): NÃO é botão nem foco de teclado; quem age é a ficha.
 * Renderiza `SLOT_ID_ATTRIBUTE` e um nome acessível que muda ao preencher.
 */
export interface SlotProps {
  readonly slot: SlotSpec;
  /** Valor encaixado, ou `null` se vazia. */
  readonly filledWith: string | null;
  readonly over: boolean;
  readonly glowSeq?: number;
}

/** Contêiner `role="group"` com `aria-label` descritivo por modo. */
export interface AnswerRegionProps {
  readonly mode: GameMode;
  /** Use `ANSWER_REGION_LABELS[mode]`. */
  readonly ariaLabel: string;
  readonly children: ReactNode;
}

/** Banco de fichas de um grupo (opcional para F3; documenta a composição). */
export interface TileBankProps {
  readonly bank: BankSpec;
  readonly usedTileIds: readonly string[];
  readonly onDrop: (tileId: string, slotId: string) => void;
  readonly onTap: (tileId: string) => void;
}

export interface SpeechBubbleProps {
  readonly message: Message;
  /** Padrão: `polite`. Nunca `assertive`. */
  readonly live?: 'polite' | 'off';
  readonly tone?: 'neutral' | 'positive' | 'corrective';
}

/** Desenha os segmentos; selos via `<HandBadge>`. */
export interface MessageTextProps {
  readonly message: Message;
}

/** Selo gráfico inline (decorativo: `aria-hidden`). */
export interface HandBadgeProps {
  readonly kind: BadgeKind;
  readonly size?: 'inline' | 'md';
}

/** Medalhão do período com forma geométrica própria (redundância de cor). */
export interface PeriodMedallionProps {
  readonly period: Period;
  readonly size?: 'sm' | 'md' | 'lg';
}

/** Selo do período abaixo do relógio (nível 24 h) e no explorar. */
export interface PeriodBadgeProps {
  readonly period: Period;
  /** Botão "trocar" do explorar; sem ele, é só informativo. */
  readonly onToggle?: () => void;
}

/** `<dialog>` nativo, sem scroll-lock no `:root` (ADR-004). */
export interface TeachersDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onResetStars: () => void;
  /** URL `tree/{commit}` do código-fonte (AGPL §13). */
  readonly sourceUrl: string;
  readonly persistent: boolean;
}

export interface ConfettiProps {
  /** Incrementar `seq` dispara uma rajada; ignorado com movimento reduzido. */
  readonly burst: { readonly seq: number; readonly count: number } | null;
}

export interface ModeCardProps {
  readonly mode: ModeMeta;
  /** `null` para `explore` (sem estrelas). */
  readonly stars: StarCount | null;
  readonly onSelect: (id: ModeId) => void;
}

export interface LevelSelectorProps {
  readonly levels: readonly Level[];
  readonly current: LevelId;
  readonly onChange: (id: LevelId) => void;
}

export interface AppMenuProps {
  readonly sound: boolean;
  readonly voice: boolean;
  readonly onToggleSound: () => void;
  readonly onToggleVoice: () => void;
  readonly onOpenTeachers: () => void;
  /** Item "Código-fonte" (AGPL §13): `tree/{commit}`. */
  readonly sourceUrl: string;
  readonly pwa: Pick<PwaApi, 'canInstall' | 'install' | 'isStandalone' | 'showIosInstallTip'>;
}

export interface StarRatingProps {
  readonly value: StarCount;
  /** Ex.: "2 de 3 estrelas". */
  readonly label: string;
  readonly size?: 'sm' | 'lg';
  /** Animação escalonada da tela de resultado. */
  readonly animate?: boolean;
}

export interface ProgressDotsProps {
  readonly total: number;
  /** Índice da pergunta atual (0-based). */
  readonly current: number;
  /** Erros por pergunta concluída (0 = de primeira). */
  readonly results: readonly number[];
}

export interface UpdateToastProps {
  readonly visible: boolean;
  readonly onApply: () => void;
  readonly onDismiss: () => void;
}

/* ------------------------------------------------------------------ */
/* Matemática do relógio (implementação: F1a, domain/clockMath.ts)     */
/* ------------------------------------------------------------------ */

/**
 * Funções puras de tempo, escrita por extenso e geometria do relógio.
 * Ângulos em graus, sentido horário a partir do 12 (0 = topo).
 */
export interface ClockMathApi {
  /** `7 -> "07"`. */
  pad(n: number): string;
  /** 0–23 -> 1–12 (`0` e `12` -> `12`). */
  to12(h: number): number;
  /** Madrugada 0–5, manhã 6–11, tarde 12–17, noite 18–23. */
  periodOf(h: number): Period;
  atmosphereOf(h: number): Atmosphere;
  /** 0–59 por extenso; `feminine` para horas ("uma", "duas"). */
  numberWord(n: number, feminine?: boolean): string;
  /** Inverso de `numberWord` (masc. e fem.); `null` se não reconhecer. */
  wordToNumber(word: string): number | null;
  /** Frase dividida em texto fixo e lacunas (ver `PhrasePart`). */
  phraseParts(time: ClockTime, options?: PhraseOptions): readonly PhrasePart[];
  /** "São três horas e quinze minutos." */
  phraseText(parts: readonly PhrasePart[]): string;
  /** "São quinze horas e dez minutos." */
  phrase24(time: ClockTime): string;
  /** `(h % 12) * 30 + m * 0.5`. */
  hourHandAngle(time: ClockTime): number;
  /** `m * 6` (+ `s * 0.1` com `withSeconds`). */
  minuteHandAngle(time: ClockTime, withSeconds?: boolean): number;
  secondHandAngle(time: ClockTime): number;
  /** Menor distância angular entre dois ângulos (0–180). */
  angleDistance(a: number, b: number): number;
  /** Ângulo acumulado que gira pelo caminho mais curto (evita "volta inteira"). */
  shortestRotation(previousDeg: number | null, targetDeg: number): number;
  /** Ângulo -> minuto quantizado pelo passo (0–59). */
  angleToMinute(angle: number, step: MinuteStep): number;
  /** Ângulo -> hora 0–23 preservando a metade do dia de `current`. */
  angleToHour(angle: number, current: ClockTime): number;
  /** Ponteiro mais provável para um toque em `(angle, radius)` no viewBox 220. */
  pickHand(angle: number, radius: number, current: ClockTime): HandName;
  /** Muda o minuto; com `linkHands`, cruzar o 12 avança/recua a hora. */
  withMinute(current: ClockTime, minute: number, linkHands: boolean): ClockTime;
  /** Mesma leitura no analógico: `to12(h)` e `m` iguais. */
  sameReading(a: ClockTime, b: ClockTime): boolean;
  /** `"h:m"` para evitar repetição na rodada. */
  timeKey(time: ClockTime): string;
  /** Horas vizinhas com wrap: 12 h -> `to12(displayH +- 1)`; 24 h -> `(displayH +- 1 + 24) % 24`. */
  adjacentHours(displayH: number, h24: boolean): readonly [number, number];
  /** Fichas de hora possíveis no nível. */
  hourPool(level: Level): readonly number[];
  /** Fichas de minuto possíveis no nível. */
  minutePool(level: Level): readonly number[];
  /** Sorteia uma hora do nível que não esteja em `used` (até 50 tentativas). */
  randomTime(level: Level, used: ReadonlySet<string>, rng: Rng): ClockTime;
}
