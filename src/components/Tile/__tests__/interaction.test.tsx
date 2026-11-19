// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DragLayerProvider } from '../../DragLayer';
import { Tile } from '..';
import { Slot } from '../../Slot';

class TestPointer extends MouseEvent {
  pointerId: number;
  isPrimary: boolean;
  constructor(type: string, init: PointerEventInit = {}) { super(type, init); this.pointerId = init.pointerId ?? 1; this.isPrimary = init.isPrimary ?? true; }
}
beforeEach(() => {
  vi.stubGlobal('PointerEvent', TestPointer);
  Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', { configurable: true, value: vi.fn() });
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => window.setTimeout(() => cb(0), 0));
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); Reflect.deleteProperty(document, 'elementFromPoint'); Reflect.deleteProperty(HTMLElement.prototype, 'animate'); });
const tile = { id: 'h1', group: 'hour' as const, value: '03' };
const slot = { id: 's1', group: 'hour' as const, answer: '03', label: 'Lacuna das horas' };
function setup() {
  const tap = vi.fn(), drop = vi.fn();
  const view = render(<DragLayerProvider><Tile tile={tile} used={false} onTap={tap} onDrop={drop} /><Slot slot={slot} filledWith={null} over={false} /></DragLayerProvider>);
  return { ...view, tap, drop, button: screen.getByRole('button') };
}
describe('tile drag', () => {
  it('does not tap or drop after pointercancel', () => {
    const { button, tap, drop } = setup();
    fireEvent.pointerDown(button, { clientX: 1, clientY: 1, pointerId: 1, isPrimary: true });
    fireEvent.pointerMove(button, { clientX: 4, clientY: 4, pointerId: 1, isPrimary: true });
    fireEvent.pointerCancel(button, { pointerId: 1, isPrimary: true });
    expect(tap).not.toHaveBeenCalled(); expect(drop).not.toHaveBeenCalled();
  });
  it('removes ghost on unmount and allows keyboard after a drag', () => {
    const portal = document.createElement('div'); portal.id = 'drag-layer'; document.body.append(portal);
    const { button, tap, unmount } = setup();
    fireEvent.pointerDown(button, { clientX: 1, clientY: 1, pointerId: 1, isPrimary: true });
    fireEvent.pointerMove(button, { clientX: 20, clientY: 20, pointerId: 1, isPrimary: true });
    expect(portal.textContent).toBe('03');
    fireEvent.pointerUp(button, { clientX: 20, clientY: 20, pointerId: 1, isPrimary: true });
    fireEvent.click(button, { detail: 1 });
    fireEvent.keyDown(button, { key: 'Enter' }); fireEvent.keyDown(button, { key: ' ' });
    expect(tap).toHaveBeenCalledTimes(2);
    unmount(); expect(portal.textContent).toBe(''); portal.remove();
  });
  it('cleans a ghost if the tile unmounts during a drag', () => {
    const portal = document.createElement('div'); portal.id = 'drag-layer'; document.body.append(portal);
    const { button, unmount } = setup();
    fireEvent.pointerDown(button, { clientX: 0, clientY: 0, pointerId: 1, isPrimary: true });
    fireEvent.pointerMove(button, { clientX: 20, clientY: 20, pointerId: 1, isPrimary: true });
    expect(portal.textContent).toBe('03');
    unmount(); expect(portal.textContent).toBe(''); portal.remove();
  });
  it('revalidates the slot on release', () => {
    const { button, drop } = setup();
    const target = screen.getByRole('img');
    Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: vi.fn(() => target) });
    fireEvent.pointerDown(button, { clientX: 0, clientY: 0, pointerId: 1, isPrimary: true });
    fireEvent.pointerMove(button, { clientX: 20, clientY: 20, pointerId: 1, isPrimary: true });
    act(() => fireEvent.pointerUp(button, { clientX: 20, clientY: 20, pointerId: 1, isPrimary: true }));
    expect(drop).toHaveBeenCalledWith('h1', 's1');
  });
});
it('runs and cancels the return animation', () => {
  const cancel = vi.fn();
  Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: () => ({ cancel, finished: new Promise(() => {}) }) });
  const { button, unmount } = setup();
  fireEvent.pointerDown(button, { clientX: 1, clientY: 1, pointerId: 1, isPrimary: true });
  fireEvent.pointerMove(button, { clientX: 30, clientY: 30, pointerId: 1, isPrimary: true });
  fireEvent.pointerUp(button, { clientX: 30, clientY: 30, pointerId: 1, isPrimary: true });
  unmount(); expect(cancel).toHaveBeenCalled();
});
it('accepts an accessible synthetic click after dragging', () => {
  const { button, tap } = setup();
  fireEvent.pointerDown(button, { clientX: 1, clientY: 1, pointerId: 1, isPrimary: true });
  fireEvent.pointerMove(button, { clientX: 30, clientY: 30, pointerId: 1, isPrimary: true });
  fireEvent.pointerUp(button, { clientX: 30, clientY: 30, pointerId: 1, isPrimary: true });
  fireEvent.click(button, { detail: 0 }); expect(tap).toHaveBeenCalledTimes(1);
});
it('removes the ghost when only the tile unmounts', () => {
  const portal = document.createElement('div'); portal.id = 'drag-layer'; document.body.append(portal);
  function Example({ show }: { readonly show: boolean }) { return <DragLayerProvider>{show && <Tile tile={tile} used={false} onTap={() => {}} onDrop={() => {}} />}</DragLayerProvider>; }
  const { rerender, unmount } = render(<Example show />); const button = screen.getByRole('button');
  fireEvent.pointerDown(button, { clientX: 0, clientY: 0, pointerId: 1, isPrimary: true });
  fireEvent.pointerMove(button, { clientX: 20, clientY: 20, pointerId: 1, isPrimary: true });
  expect(portal.textContent).toBe('03'); rerender(<Example show={false} />); expect(portal.textContent).toBe('');
  unmount(); portal.remove();
});
it('skips the return animation for reduced motion', () => {
  const animate = vi.fn();
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: animate });
  const portal = document.createElement('div'); portal.id = 'drag-layer'; document.body.append(portal);
  const { button, unmount } = setup();
  fireEvent.pointerDown(button, { clientX: 1, clientY: 1, pointerId: 1, isPrimary: true });
  fireEvent.pointerMove(button, { clientX: 30, clientY: 30, pointerId: 1, isPrimary: true });
  fireEvent.pointerUp(button, { clientX: 30, clientY: 30, pointerId: 1, isPrimary: true });
  expect(animate).not.toHaveBeenCalled(); expect(portal.textContent).toBe(''); unmount(); portal.remove();
});
