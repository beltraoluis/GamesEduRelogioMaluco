// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AnalogClock } from '..';
import { clockMath as math } from '../../../domain/clockMath';
class TestPointer extends MouseEvent { pointerId: number; isPrimary: boolean; constructor(type: string, init: PointerEventInit = {}) { super(type, init); this.pointerId = init.pointerId ?? 1; this.isPrimary = init.isPrimary ?? true; } }
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
it('calculates angles, wraps time and chooses hands', () => {
  expect(math.hourHandAngle({ h: 3, m: 30 })).toBe(105);
  expect(math.minuteHandAngle({ h: 3, m: 30, s: 30 }, true)).toBe(183);
  expect(math.angleToMinute(359, 5)).toBe(0); expect(math.angleToHour(90, { h: 15, m: 0 })).toBe(15);
  expect(math.pickHand(0, 10, { h: 3, m: 0 })).toBe('minute');
  expect(math.withMinute({ h: 23, m: 59 }, 0, true)).toEqual({ h: 0, m: 0 });
  expect(math.shortestRotation(350, 10)).toBe(370); expect(math.angleDistance(350, 10)).toBe(20);
});
it('tracks a primary pointer and keeps linked minute rollover continuous', () => {
  vi.stubGlobal('PointerEvent', TestPointer);
  vi.stubGlobal('DOMPoint', class { x: number; y: number; constructor(x: number, y: number) { this.x = x; this.y = y; } matrixTransform() { return this; } });
  const onChange = vi.fn(), onGrab = vi.fn();
  render(<AnalogClock label="Relógio" interactive time={{ h: 3, m: 59 }} linkHands onChange={onChange} onGrab={onGrab} />);
  const svg = screen.getByRole('group') as unknown as SVGSVGElement;
  Object.defineProperties(svg, { getScreenCTM: { value: () => ({ inverse: () => ({}) }) }, setPointerCapture: { value: vi.fn() }, hasPointerCapture: { value: () => false } });
  fireEvent.pointerDown(svg, { pointerId: 1, isPrimary: true, clientX: 110, clientY: 20 });
  fireEvent.pointerMove(svg, { pointerId: 2, isPrimary: false, clientX: 200, clientY: 110 });
  expect(onChange).not.toHaveBeenCalled();
  fireEvent.pointerMove(svg, { pointerId: 1, isPrimary: true, clientX: 110, clientY: 20 });
  expect(onChange).toHaveBeenCalledWith({ h: 4, m: 0 }, 'minute');
  fireEvent.pointerMove(svg, { pointerId: 1, isPrimary: true, clientX: 120, clientY: 20 });
  expect(onChange.mock.lastCall?.[0].h).toBe(4);
  fireEvent.pointerUp(svg, { pointerId: 1, isPrimary: true }); expect(onGrab).toHaveBeenCalledWith('minute');
});
it('freezes a hand at its visible angle when grabbed during a transition', () => {
  vi.stubGlobal('PointerEvent', TestPointer);
  vi.stubGlobal('DOMPoint', class { x: number; y: number; constructor(x: number, y: number) { this.x = x; this.y = y; } matrixTransform() { return this; } });
  const nativeStyle = window.getComputedStyle;
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudo) => element.getAttribute('data-hand') === 'hour' ? { transform: 'matrix(0.70710678, 0.70710678, -0.70710678, 0.70710678, 0, 0)' } as CSSStyleDeclaration : nativeStyle(element, pseudo));
  render(<AnalogClock label="Relógio" interactive time={{ h: 3, m: 0 }} />);
  const svg = screen.getByRole('group') as unknown as SVGSVGElement;
  Object.defineProperties(svg, { getScreenCTM: { value: () => ({ inverse: () => ({}) }) }, setPointerCapture: { value: vi.fn() } });
  const hand = svg.querySelector<SVGGElement>('[data-hand="hour"]');
  fireEvent.pointerDown(svg, { pointerId: 1, isPrimary: true, clientX: 140, clientY: 100 });
  expect(hand?.style.transition).toBe('none'); expect(hand?.style.transform).toBe('rotate(45deg)');
});
it('ignores a non-finite inverse transform', () => {
  vi.stubGlobal('PointerEvent', TestPointer);
  vi.stubGlobal('DOMPoint', class { matrixTransform() { return { x: NaN, y: NaN }; } });
  const change = vi.fn(); render(<AnalogClock label="Relógio" interactive time={{ h: 3, m: 0 }} onChange={change} />);
  const svg = screen.getByRole('group'); Object.defineProperty(svg, 'getScreenCTM', { value: () => ({ inverse: () => ({}) }) });
  expect(() => fireEvent.pointerDown(svg, { isPrimary: true })).not.toThrow(); expect(change).not.toHaveBeenCalled();
});
it('handles locked minutes and keyboard hour wrapping', () => {
  const change = vi.fn(); render(<AnalogClock label="Relógio" interactive time={{ h: 0, m: 0 }} lockMinute onChange={change} />);
  const svg = screen.getByRole('group'); fireEvent.keyDown(svg, { key: 'ArrowUp' }); expect(change).not.toHaveBeenCalled();
  fireEvent.keyDown(svg, { key: 'ArrowLeft' }); expect(change).toHaveBeenCalledWith({ h: 23, m: 0 }, 'hour');
});
it('handles reverse minute rollover and selection of the minute hand', () => {
  expect(math.withMinute({ h: 0, m: 0 }, 59, true)).toEqual({ h: 23, m: 59 });
  expect(math.withMinute({ h: 4, m: 2 }, 10, false)).toEqual({ h: 4, m: 10 });
  expect(math.pickHand(0, 80, { h: 3, m: 0 })).toBe('minute');
  expect(math.shortestRotation(null, 45)).toBe(45);
});

it('selects the minute hand near the center and links the 45-to-zero crossing', () => {
  vi.stubGlobal('PointerEvent', TestPointer);
  vi.stubGlobal('DOMPoint', class { x: number; y: number; constructor(x: number, y: number) { this.x = x; this.y = y; } matrixTransform() { return this; } });
  const change = vi.fn(), grab = vi.fn();
  const { unmount } = render(<AnalogClock label="Relógio" interactive time={{ h: 3, m: 0 }} onChange={change} onGrab={grab} />);
  let svg = screen.getByRole('group') as unknown as SVGSVGElement;
  Object.defineProperties(svg, { getScreenCTM: { value: () => ({ inverse: () => ({}) }) }, setPointerCapture: { value: vi.fn() }, hasPointerCapture: { value: () => false } });
  fireEvent.pointerDown(svg, { pointerId: 1, isPrimary: true, clientX: 110, clientY: 100 });
  expect(grab).toHaveBeenCalledWith('minute');
  fireEvent.lostPointerCapture(svg, { pointerId: 1, isPrimary: true });
  fireEvent.pointerDown(svg, { pointerId: 2, isPrimary: true, clientX: 110, clientY: 100 });
  expect(grab).toHaveBeenCalledTimes(2); unmount();
  render(<AnalogClock label="Relógio" interactive time={{ h: 3, m: 45 }} linkHands onChange={change} />);
  svg = screen.getByRole('group') as unknown as SVGSVGElement;
  Object.defineProperties(svg, { getScreenCTM: { value: () => ({ inverse: () => ({}) }) }, setPointerCapture: { value: vi.fn() }, hasPointerCapture: { value: () => false } });
  fireEvent.pointerDown(svg, { pointerId: 1, isPrimary: true, clientX: 20, clientY: 110 });
  fireEvent.pointerMove(svg, { pointerId: 1, isPrimary: true, clientX: 110, clientY: 20 });
  expect(change).toHaveBeenCalledWith({ h: 4, m: 0 }, 'minute');
  expect(svg.querySelector('[data-hand="minute"] [data-minute-eyelet]')).not.toBeNull();
});
