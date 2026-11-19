// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { useEffect, useId, useRef, type ReactElement } from 'react';

import { AnalogClock } from '@/components/AnalogClock';
import { AnswerRegion } from '@/components/AnswerRegion';
import { Button } from '@/components/Button';
import { DigitalClock } from '@/components/DigitalClock';
import { DragLayerProvider, useDragLayer } from '@/components/DragLayer';
import { HandBadge } from '@/components/HandBadge';
import { PeriodBadge } from '@/components/PeriodBadge';
import { ProgressDots } from '@/components/ProgressDots';
import { Slot } from '@/components/Slot';
import { SpeechBubble } from '@/components/SpeechBubble';
import { TicMascot } from '@/components/TicMascot';
import { Tile } from '@/components/Tile';
import { VisuallyHidden } from '@/components/VisuallyHidden';
import { APP_COPY } from '@/content/copy';
import {
  ANSWER_REGION_LABELS,
  type ClockTime,
  type Feedback,
  type GameControllerApi,
  type GameMode,
  type GameState,
  type HandHighlight,
  type HandName,
  type LevelId,
  type MascotMood,
  type Message,
  type Period,
  type Question,
  type SlotSpec,
} from '@/contracts';
import { clockMath } from '@/domain/clockMath';
import { renderMessage } from '@/domain/hints';
import { GROUP_NAMES } from '@/domain/question';
import { perfectCount } from '@/domain/scoring';
import { UiIcon } from '@/ui/icons/UiIcons';

import styles from './GameScreen.module.css';

// Fallback seguro para ambientes de teste (JSDOM) onde setPointerCapture não existe por padrão
if (
  typeof HTMLElement !== 'undefined' &&
  typeof HTMLElement.prototype.setPointerCapture !== 'function'
) {
  HTMLElement.prototype.setPointerCapture = function setPointerCaptureFallback() {};
}

export interface AnalogDescriptionOptions {
  readonly period?: Period | undefined;
  readonly minuteLabels?: boolean | undefined;
}

/**
 * Descreve geometricamente as posições e a identidade dos ponteiros no mostrador
 * (ponteiro curto das horas e ponteiro longo dos minutos, incluindo posições
 * intermediárias e período quando visível), permitindo resolver o desafio com
 * leitor de tela sem anunciar a resposta numérica/por extenso pronta.
 */
export function describeAnalogHandPositions(time: ClockTime): string {
  const h12 = clockMath.to12(time.h);
  const nextH12 = (h12 % 12) + 1;

  const hourDesc =
    time.m === 0
      ? `ponteiro curto das horas apontando para o número ${h12}`
      : `ponteiro curto das horas entre os números ${h12} e ${nextH12}`;

  let minuteDesc: string;
  if (time.m % 5 === 0) {
    const dialNum = time.m === 0 ? 12 : time.m / 5;
    minuteDesc = `ponteiro longo dos minutos apontando para o número ${dialNum}`;
  } else {
    const prevMark = Math.floor(time.m / 5);
    const prevDialNum = prevMark === 0 ? 12 : prevMark;
    const nextDialNum = (prevDialNum % 12) + 1;
    const ticksAfter = time.m % 5;
    const ticksText = ticksAfter === 1 ? '1 tracinho' : `${ticksAfter} tracinhos`;
    minuteDesc = `ponteiro longo dos minutos entre os números ${prevDialNum} e ${nextDialNum}, ${ticksText} depois do número ${prevDialNum}`;
  }

  return `${hourDesc}; ${minuteDesc}`;
}

export function describeAnalogStimulus(
  time: ClockTime,
  options: AnalogDescriptionOptions = {},
): string {
  const parts: string[] = [
    `Relógio analógico do desafio: ${describeAnalogHandPositions(time)}`,
  ];
  if (options.period !== undefined) {
    parts.push(`período ${options.period}`);
  }
  if (options.minuteLabels) {
    parts.push('marcadores de 5 em 5 minutos visíveis no mostrador');
  }
  return `${parts.join('; ')}.`;
}

export function describeInteractiveAnalogClock(
  time: ClockTime,
  lockMinute: boolean,
): string {
  const controlHint = lockMinute
    ? 'Use as setas esquerda e direita ou arraste o ponteiro curto das horas (ponteiro longo dos minutos travado no 12).'
    : 'Use as setas ou arraste os ponteiros.';
  return `Relógio analógico interativo. ${controlHint} Posição atual: ${describeAnalogHandPositions(time)}.`;
}

export interface MascotSignal {
  readonly mood: MascotMood;
  readonly bounceSeq: number;
}

export interface GameView {
  readonly seq: number;
  readonly mascot: MascotSignal;
  readonly shakeSeq: Readonly<Record<string, number>>;
  readonly handHighlight: HandHighlight | null;
  readonly slotGlow: { readonly slotId: string; readonly seq: number } | null;
  readonly digitalGlow: { readonly group: HandName; readonly seq: number } | null;
  readonly minuteLabels: boolean;
}

export interface GameSessionApi extends GameControllerApi {
  readonly message: Message | null;
  readonly tone: Feedback['tone'];
  readonly view: GameView;
  pickTile(tileId: string): void;
  listen(): void;
}

export interface GameScreenProps {
  readonly mode: GameMode;
  readonly levelId: LevelId;
  /** Estado, ações, mensagem do balão e sinais visuais da partida. */
  readonly session: GameSessionApi;
  /** "Voltar ao início" (cancela a fala e consome a entrada do histórico). */
  readonly onHome: () => void;
}

function getFilledTileValue(
  question: Question,
  filled: Readonly<Record<string, string>>,
  slot: SlotSpec,
): string | null {
  const placedTileId = filled[slot.id];
  if (placedTileId === undefined) {
    return null;
  }
  if (question.mode !== 'hands') {
    for (const bank of question.banks) {
      const tile = bank.tiles.find((tl) => tl.id === placedTileId);
      if (tile !== undefined) {
        return tile.value;
      }
    }
  }
  return slot.answer;
}

interface GameStageProps {
  readonly state: GameState;
  readonly session: GameSessionApi;
  readonly onHome: () => void;
}

function GameStage({ state, session, onHome }: GameStageProps): ReactElement {
  const promptId = `${useId()}-game-prompt`;
  const actionsRef = useRef<HTMLDivElement>(null);
  const { overSlotId } = useDragLayer();

  const { current, feedback } = state;
  const { question, filled, usedTileIds, done } = current;
  const { view } = session;

  // Foca o botão "Próxima" automaticamente ao concluir a pergunta
  useEffect(() => {
    if (!done) return;
    const nextBtn = actionsRef.current?.querySelector<HTMLButtonElement>(
      'button[data-game-action="next"]',
    );
    nextBtn?.focus({ preventScroll: true });
  }, [done, state.index]);

  const activeMessage =
    session.message ?? renderMessage(feedback.code, feedback.context);
  const score = perfectCount(state.results);
  const showMinuteLabels =
    (question.mode === 'hands' && question.minuteLabels) || view.minuteLabels;

  const slotGlowSeq = (slotId: string): number =>
    view.slotGlow?.slotId === slotId ? view.slotGlow.seq : 0;

  return (
    <section
      className={styles.screen}
      aria-labelledby={promptId}
      data-screen="game"
      data-game-mode={question.mode}
      data-game-level={state.level.id}
    >
      <header className={styles.topbar}>
        <Button
          variant="icon"
          aria-label={APP_COPY.game.back}
          onClick={onHome}
          icon={<UiIcon name="BackArrow" size={24} />}
        />

        <ProgressDots
          total={state.roundLength}
          current={state.index}
          results={state.results}
        />

        <div
          className={styles.scoreBadge}
          aria-label={`Estrelas: ${score}`}
          data-game-score={score}
        >
          <span className={styles.scoreStar} aria-hidden="true">
            <UiIcon name="SparkleStar" size={20} />
          </span>
          <span className="tabular-nums">{score}</span>
        </div>
      </header>

      <h1 id={promptId} className={styles.prompt}>
        {APP_COPY.game.prompts[question.mode]}
      </h1>

      {question.mode !== 'hands' ? (
        <VisuallyHidden>{APP_COPY.game.tileFirstHint}</VisuallyHidden>
      ) : null}

      <div className={styles.stage}>
        {/* Estímulo */}
        <div className={styles.stimulus} data-game-stimulus={question.stimulus}>
          {question.mode === 'numbers' ? (
            <>
              <div className={styles.clockBox}>
                <AnalogClock
                  time={question.time}
                  label={describeAnalogStimulus(question.time, {
                    period: question.period,
                    minuteLabels: showMinuteLabels,
                  })}
                  minuteLabels={showMinuteLabels}
                  highlight={view.handHighlight}
                  size="md"
                />
              </div>
              {question.period !== undefined ? (
                <PeriodBadge period={question.period} />
              ) : null}
            </>
          ) : null}

          {question.mode === 'words' ? (
            question.stimulus === 'analog' ? (
              <div className={styles.clockBox}>
                <AnalogClock
                  time={question.time}
                  label={describeAnalogStimulus(question.time, {
                    minuteLabels: showMinuteLabels,
                  })}
                  minuteLabels={showMinuteLabels}
                  highlight={view.handHighlight}
                  size="md"
                />
              </div>
            ) : (
              <DigitalClock
                hours={question.displayH}
                minutes={question.time.m}
                glow={view.digitalGlow}
              />
            )
          ) : null}

          {question.mode === 'hands' ? (
            <>
              <DigitalClock
                hours={question.displayH}
                minutes={question.time.m}
                glow={view.digitalGlow}
              />
              {question.phrase !== undefined ? (
                <p className={styles.stimulusPhrase}>{question.phrase}</p>
              ) : null}
            </>
          ) : null}
        </div>

        {/* Região de Resposta (role="group") */}
        <div className={styles.answerWrap}>
          <AnswerRegion
            mode={question.mode}
            ariaLabel={ANSWER_REGION_LABELS[question.mode]}
          >
            {question.mode === 'numbers' ? (
              <DigitalClock
                hours={question.displayH}
                minutes={question.time.m}
                label="Visor do relógio digital para encaixar horas e minutos"
              >
                {question.slots.map((slot, idx) => {
                  const filledWith = getFilledTileValue(question, filled, slot);
                  const gSeq = slotGlowSeq(slot.id);
                  return (
                    <span key={slot.id}>
                      {idx === 1 ? (
                        <span className={styles.digitalColon} aria-hidden="true">
                          :
                        </span>
                      ) : null}
                      <Slot
                        slot={slot}
                        filledWith={filledWith}
                        over={overSlotId === slot.id && filledWith === null}
                        {...(gSeq > 0 ? { glowSeq: gSeq } : {})}
                      />
                    </span>
                  );
                })}
              </DigitalClock>
            ) : null}

            {question.mode === 'words' ? (
              <p className={styles.phraseCard}>
                {question.parts.map((part, idx) => {
                  if (part.kind === 'text') {
                    return (
                      <span key={idx} className={styles.phraseWord}>
                        {part.text}
                      </span>
                    );
                  }
                  const slot = question.slots.find((sl) => sl.group === part.group);
                  if (slot === undefined) {
                    return null;
                  }
                  const filledWith = getFilledTileValue(question, filled, slot);
                  const gSeq = slotGlowSeq(slot.id);
                  return (
                    <Slot
                      key={slot.id}
                      slot={slot}
                      filledWith={filledWith}
                      over={overSlotId === slot.id && filledWith === null}
                      {...(gSeq > 0 ? { glowSeq: gSeq } : {})}
                    />
                  );
                })}
              </p>
            ) : null}

            {question.mode === 'hands' ? (
              <>
                <div className={styles.clockBoxLg}>
                  <AnalogClock
                    time={current.hands ?? question.start}
                    label={describeInteractiveAnalogClock(
                      current.hands ?? question.start,
                      question.lockMinute,
                    )}
                    interactive={!done}
                    minuteStep={question.minuteStep}
                    lockMinute={question.lockMinute}
                    minuteLabels={showMinuteLabels}
                    highlight={view.handHighlight}
                    size="lg"
                    onChange={(nextTime) => session.moveHands(nextTime)}
                  />
                </div>
                <p className={styles.handsLegend}>
                  <span className={styles.legendItem}>
                    <HandBadge kind="hour-hand" size="inline" />
                    <span>pequeno = horas</span>
                  </span>
                  <span className={styles.legendItem}>
                    <HandBadge kind="minute-hand" size="inline" />
                    <span>grande = minutos</span>
                  </span>
                </p>
              </>
            ) : null}
          </AnswerRegion>
        </div>
      </div>

      {/* Bancos de fichas (modos numbers e words) */}
      {question.mode !== 'hands' ? (
        <div className={styles.banks}>
          {question.banks.map((bank) => (
            <div
              key={bank.group}
              className={styles.bank}
              data-bank-group={bank.group}
            >
              <div className={styles.bankHeader}>
                <HandBadge
                  kind={
                    bank.group === 'hour'
                      ? 'hour-hand'
                      : bank.group === 'minute'
                        ? 'minute-hand'
                        : 'period'
                  }
                  size="inline"
                />
                <span className={styles.bankLabel}>{GROUP_NAMES[bank.group]}</span>
              </div>
              <div className={styles.bankTiles}>
                {bank.tiles.map((tile) => {
                  const shakeSeq = view.shakeSeq[tile.id] ?? 0;
                  return (
                    <Tile
                      key={tile.id}
                      tile={tile}
                      used={usedTileIds.includes(tile.id)}
                      {...(shakeSeq > 0 ? { shakeSeq } : {})}
                      onDrop={(tId, sId) => session.dropTile(tId, sId)}
                      onTap={(tId) => session.tapTile(tId)}
                      onPick={(tId) => session.pickTile(tId)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Mascote Tic + Balão de fala + Botões de ação */}
      <div className={styles.helper}>
        <div className={styles.mascotWrap}>
          <div className={styles.mascotHolder}>
            <TicMascot
              mood={view.mascot.mood}
              size="sm"
              ambient="day"
              {...(view.mascot.bounceSeq > 0
                ? { bounceSeq: view.mascot.bounceSeq }
                : {})}
            />
          </div>
          <SpeechBubble message={activeMessage} tone={session.tone} />
        </div>

        <div ref={actionsRef} className={styles.actions}>
          {!done ? (
            <Button
              variant="soft"
              onClick={() => session.requestHelp()}
              icon={<UiIcon name="HintBulb" size={20} />}
              data-game-action="hint"
            >
              {APP_COPY.game.hint}
            </Button>
          ) : null}

          {question.mode === 'hands' || done ? (
            <Button
              variant="soft"
              onClick={() => session.listen()}
              icon={<UiIcon name="SpeakWave" size={20} />}
              data-game-action="listen"
            >
              {APP_COPY.game.listen}
            </Button>
          ) : null}

          {question.mode === 'hands' && !done ? (
            <Button
              variant="go"
              onClick={() => session.checkHands()}
              icon={<UiIcon name="CheckBadge" size={22} />}
              data-game-action="check"
            >
              {APP_COPY.game.ready}
            </Button>
          ) : null}

          {done ? (
            <Button
              variant="go"
              onClick={() => session.next()}
              icon={<UiIcon name="NextArrow" size={22} />}
              data-game-action="next"
            >
              {APP_COPY.game.next}
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function GameScreen({
  mode,
  levelId,
  session,
  onHome,
}: GameScreenProps): ReactElement | null {
  const { state } = session;

  if (state === null) {
    return (
      <section
        className={styles.screen}
        data-screen="game"
        data-game-mode={mode}
        data-game-level={levelId}
      />
    );
  }

  return (
    <DragLayerProvider>
      <GameStage state={state} session={session} onHome={onHome} />
    </DragLayerProvider>
  );
}

export default GameScreen;
