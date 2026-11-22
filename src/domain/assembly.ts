// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { content, formatText } from '../content/runtimeDomData';

export type AssemblyPhase = 'hours' | 'minutes';
export interface AssemblyState {
  readonly phase: AssemblyPhase;
  readonly placed: readonly number[];
  readonly mistakes: number;
  readonly selected: number | null;
  readonly message: string;
}
export const POSITIONS = Array.from({ length: 12 }, (_, i) => i);
const copy = content.assembly;
export const ASSEMBLY_INTRO = copy.intro;
export function assemblyLabel(phase: AssemblyPhase, position: number): string {
  return phase === 'hours' ? String(position || 12) : String(position * 5).padStart(2, '0');
}
export function dialPosition(position: number, radius = 39) {
  const angle = position * Math.PI / 6;
  return { left: `${50 + Math.sin(angle) * radius}%`, top: `${50 - Math.cos(angle) * radius}%` };
}
export function initialAssembly(): AssemblyState {
  return { phase: 'hours', placed: [], mistakes: 0, selected: null, message: ASSEMBLY_INTRO.hours };
}
export type AssemblyAction =
  | { type: 'select'; position: number }
  | { type: 'place'; piece: number; target: number }
  | { type: 'minutes' };
export function assemblyReducer(state: AssemblyState, action: AssemblyAction): AssemblyState {
  if (action.type === 'minutes') {
    return state.phase === 'hours' && state.placed.length === 12
      ? { ...state, phase: 'minutes', placed: [], selected: null, message: ASSEMBLY_INTRO.minutes }
      : state;
  }
  if (state.placed.length === 12) return state;
  const piece = action.type === 'select' ? action.position : action.piece;
  if (!POSITIONS.includes(piece) || state.placed.includes(piece)) return state;
  if (action.type === 'select') return { ...state, selected: piece,
    message: formatText(copy.selected, assemblyLabel(state.phase, piece)) };
  if (!POSITIONS.includes(action.target) || state.placed.includes(action.target)) return state;
  if (piece !== action.target) return { ...state, mistakes: state.mistakes + 1, selected: piece,
    message: formatText(copy.wrong, assemblyLabel(state.phase, piece), ASSEMBLY_INTRO[state.phase]) };
  const placed = [...state.placed, piece];
  return { ...state, placed, selected: null, message: placed.length === 12
    ? copy.finished[state.phase]
    : formatText(copy.progress, placed.length) };
}
