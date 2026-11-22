// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { useEffect, useReducer, useRef, useState } from 'react';
import { Button } from '@/components/Button';
import { DragLayerProvider, useDragLayer } from '@/components/DragLayer';
import { StarRating } from '@/components/StarRating';
import { TicMascot } from '@/components/TicMascot';
import type { LevelId, PreferencesApi, SoundApi, SpeechApi } from '@/contracts';
import { ASSEMBLY_INTRO, POSITIONS, assemblyLabel, assemblyReducer, dialPosition, initialAssembly } from '@/domain/assembly';
import type { AssemblyPhase } from '@/domain/assembly';
import { starsFor } from '@/domain/scoring';
import { useTileDrag } from '@/hooks/useTileDrag';
import styles from './AssemblyScreen.module.css';

interface Props {
  readonly levelId: LevelId;
  readonly sound: SoundApi;
  readonly speech: SpeechApi;
  readonly recordStars: PreferencesApi['recordStars'];
  readonly onConfetti: (count: number) => void;
  readonly onHome: () => void;
}

function Piece({ position, phase, used, selected, onSelect, onDrop }: {
  position: number; phase: AssemblyPhase; used: boolean; selected: boolean;
  onSelect: (position: number) => void; onDrop: (piece: number, target: number) => void;
}) {
  const label = assemblyLabel(phase, position);
  const drag = useTileDrag({ tileId: String(position), group: phase === 'hours' ? 'hour' : 'minute', label,
    disabled: used, onTap: () => onSelect(position),
    onDrop: (_, target) => onDrop(position, Number(target.replace('assembly-', ''))) });
  return <button type="button" className={styles.piece} data-piece={position} data-dragging={drag.dragging}
    disabled={used} aria-pressed={selected} aria-label={`Peça ${label}`} {...drag.bind}>{label}</button>;
}

function AssemblyGame({ levelId, sound, speech, recordStars, onConfetti, onHome, onAgain }: Props & { onAgain: () => void }) {
  const [state, dispatch] = useReducer(assemblyReducer, undefined, initialAssembly);
  const [result, setResult] = useState(false);
  const completed = useRef(false);
  const next = useRef<HTMLButtonElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const { overSlotId } = useDragLayer();
  const full = state.placed.length === 12;
  const done = full && state.phase === 'minutes';
  const stars = starsFor(state.mistakes);

  useEffect(() => { title.current?.focus(); }, [state.phase, result]);
  useEffect(() => { if (full) next.current?.focus({ preventScroll: true }); }, [full]);
  useEffect(() => {
    if (!done || completed.current) return;
    completed.current = true;
    recordStars(`assemble-${levelId}`, stars);
    sound.play('fanfare');
    speech.speak('Muito bem! Você montou o relógio completo!');
    onConfetti(40);
  }, [done, levelId, stars, recordStars, sound, speech, onConfetti]);

  function place(piece: number, target: number) {
    const action = { type: 'place', piece, target } as const;
    const updated = assemblyReducer(state, action);
    if (updated === state) return;
    sound.play(updated.mistakes > state.mistakes ? 'wrong' : 'drop');
    dispatch(action);
  }
  function select(position: number) {
    sound.unlock(); sound.play('pick'); dispatch({ type: 'select', position });
  }

  if (result) return <section className={styles.result} data-screen="assembly-result" aria-labelledby="assembly-title">
    <TicMascot mood="celebrate" size="lg" ambient="day" />
    <h1 id="assembly-title" ref={title} tabIndex={-1}>Você montou o relógio!</h1>
    <StarRating value={stars} size="lg" label={`${stars} de 3 estrelas`} animate />
    <p>12 horas e 12 marcações de minutos nos seus lugares.</p>
    <div className={styles.actions}><Button variant="go" onClick={onAgain}>Jogar de novo</Button>
      <Button onClick={onHome}>Início</Button></div>
  </section>;

  return <section className={styles.screen} data-screen="assemble" data-phase={state.phase} aria-labelledby="assembly-title">
    <header className={styles.header}><Button onClick={onHome}>Voltar ao início</Button>
      <span>Etapa {state.phase === 'hours' ? 1 : 2} de 2 · {state.placed.length}/12</span></header>
    <h1 id="assembly-title" ref={title} tabIndex={-1}>Monte o relógio: {state.phase === 'hours' ? 'horas' : 'minutos'}</h1>
    <p>{ASSEMBLY_INTRO[state.phase]}</p>
    <p>Arraste cada peça ou toque na peça e depois no encaixe.</p>
    <div className={styles.playArea} data-group={state.phase === 'hours' ? 'hour' : 'minute'}>
      <div className={styles.dial} role="group" aria-label="Mostrador do relógio">
        <span className={styles.center} aria-hidden="true" />
        {state.phase === 'minutes' && POSITIONS.map(position => <span key={`hour-${position}`}
          className={styles.fixedHour} style={dialPosition(position, 25)} data-fixed-hour={position}>
          {assemblyLabel('hours', position)}</span>)}
        {POSITIONS.map(position => {
          const filled = state.placed.includes(position);
          return <button key={position} type="button" className={styles.target} style={dialPosition(position)}
            data-slot-id={`assembly-${position}`} data-filled={filled ? '' : undefined}
            data-over={overSlotId === `assembly-${position}`} disabled={filled}
            aria-label={`Encaixe ${position === 0 ? 'no topo' : `na posição ${position} do relógio`}${filled ? `: ${assemblyLabel(state.phase, position)}, preenchido` : ', vazio'}`}
            onClick={() => state.selected !== null && place(state.selected, position)}>
            {filled ? assemblyLabel(state.phase, position) : <span aria-hidden="true">·</span>}
          </button>;
        })}
      </div>
      <div className={styles.bank} role="group" aria-label={`Peças de ${state.phase === 'hours' ? 'horas' : 'minutos'}`}>
        {POSITIONS.map(position => <Piece key={`${state.phase}-${position}`} position={position} phase={state.phase}
          used={state.placed.includes(position)} selected={state.selected === position} onSelect={select} onDrop={place} />)}
      </div>
    </div>
    <p className={styles.feedback} role="status" aria-live="polite" aria-atomic="true">{state.message}</p>
    <div className={styles.actions}>
      <Button onClick={() => speech.speak(`${ASSEMBLY_INTRO[state.phase]} Arraste cada peça ou toque na peça e depois no encaixe.`)}>Ouvir instruções</Button>
      {full && <button ref={next} type="button" className={styles.next} onClick={() => {
        speech.cancel(); sound.play('pick');
        if (done) setResult(true); else dispatch({ type: 'minutes' });
      }}>{done ? 'Ver resultado' : 'Montar os minutos'}</button>}
    </div>
  </section>;
}

export function AssemblyScreen(props: Props) {
  const [attempt, setAttempt] = useState(0);
  return <DragLayerProvider key={attempt}><AssemblyGame {...props} onAgain={() => {
    props.speech.cancel(); props.onConfetti(0); setAttempt(value => value + 1);
  }} /></DragLayerProvider>;
}
