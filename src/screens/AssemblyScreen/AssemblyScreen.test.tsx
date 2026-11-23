// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { StrictMode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { AssemblyScreen } from './AssemblyScreen';
import { POSITIONS } from '@/domain/assembly';

class TestPointer extends MouseEvent {
  pointerId: number; isPrimary: boolean;
  constructor(type: string, init: PointerEventInit = {}) { super(type, init); this.pointerId = init.pointerId ?? 1; this.isPrimary = init.isPrimary ?? true; }
}
beforeEach(() => {
  vi.stubGlobal('PointerEvent', TestPointer);
  Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', { configurable: true, value: vi.fn() });
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); Reflect.deleteProperty(document, 'elementFromPoint'); });
function setup() {
  const recordStars = vi.fn(() => true), onHome = vi.fn(), onConfetti = vi.fn();
  const sound = { enabled: true, play: vi.fn(), unlock: vi.fn() };
  const speech = { enabled: true, supported: true, speaking: false, speak: vi.fn(), speakMessage: vi.fn(), cancel: vi.fn() };
  const view = render(<StrictMode><AssemblyScreen levelId={3} recordStars={recordStars} sound={sound}
    speech={speech} onConfetti={onConfetti} onHome={onHome} /></StrictMode>);
  return { ...view, recordStars, onHome, onConfetti, sound };
}
const piece = (p: number) => document.querySelector<HTMLButtonElement>(`[data-piece="${p}"]`)!;
const target = (p: number) => document.querySelector<HTMLButtonElement>(`[data-slot-id="assembly-${p}"]`)!;
function place(p: number) { fireEvent.click(piece(p)); fireEvent.click(target(p)); }

it('seleção, erro, correção, duas etapas, conclusão única, repetição e saída', async () => {
  const { recordStars, onHome, onConfetti, container } = setup();
  expect((await axe(container)).violations).toEqual([]);
  fireEvent.keyDown(piece(0), { key: 'Enter' });
  expect(piece(0)).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(target(3));
  expect(screen.getByRole('status')).toHaveTextContent('Tente outro encaixe');
  expect(piece(0)).not.toBeDisabled();
  fireEvent.click(target(0));
  expect(target(0)).toHaveTextContent('12');
  POSITIONS.slice(1).forEach(place);
  expect(recordStars).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Montar os minutos'));
  expect(container.querySelectorAll('[data-fixed-hour]')).toHaveLength(12);
  expect(container.querySelector('[data-fixed-hour="0"]')).toHaveTextContent('12');
  POSITIONS.slice(0, 11).forEach(place);
  expect(recordStars).not.toHaveBeenCalled();
  expect(screen.queryByText('Ver resultado')).toBeNull();
  place(11);
  expect(recordStars).toHaveBeenCalledExactlyOnceWith('assemble-3', 3);
  expect(onConfetti).toHaveBeenCalledTimes(1);
  expect(target(0)).toHaveTextContent('00'); expect(target(3)).toHaveTextContent('15');
  fireEvent.click(target(11));
  expect(recordStars).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByText('Ver resultado'));
  fireEvent.click(screen.getByText('Jogar de novo'));
  expect(screen.getByRole('heading')).toHaveTextContent('horas');
  expect(piece(0)).not.toBeDisabled();
  fireEvent.click(screen.getByText('Voltar ao início')); expect(onHome).toHaveBeenCalledOnce();
});

it.each(['mouse', 'touch'])('gestos %s: erro, cancelamento, fora, ocupado, segundo dedo e clique sintético', pointerType => {
  const { recordStars } = setup();
  let hit: Element | null = target(3);
  Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: () => hit });
  function drag(p: number, end = 'pointerup') {
    const button = piece(p);
    fireEvent.pointerDown(button, { pointerId: 1, pointerType, isPrimary: true, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(button, { pointerId: 1, pointerType, clientX: 30, clientY: 30 });
    fireEvent(button, new TestPointer(end, { bubbles: true, pointerId: 1, clientX: 30, clientY: 30 }));
    return button;
  }
  drag(0); expect(screen.getByRole('status')).toHaveTextContent('Tente outro encaixe');
  hit = target(0); drag(0, 'pointercancel'); expect(piece(0)).not.toBeDisabled();
  hit = null; drag(0); expect(piece(0)).not.toBeDisabled();
  hit = target(0); drag(0); expect(piece(0)).toBeDisabled();
  const other = drag(1); fireEvent.click(other, { detail: 1 });
  expect(piece(1)).not.toBeDisabled(); expect(piece(1)).toHaveAttribute('aria-pressed', 'false');
  hit = target(2);
  fireEvent.pointerDown(piece(2), { pointerId: 2, isPrimary: false, pointerType });
  fireEvent.pointerMove(piece(2), { pointerId: 2, clientX: 30, clientY: 30 });
  fireEvent.pointerUp(piece(2), { pointerId: 2 });
  expect(piece(2)).not.toBeDisabled();
  hit = target(1); drag(1); expect(piece(1)).toBeDisabled();
  expect(recordStars).not.toHaveBeenCalled();
});
