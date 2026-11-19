// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { AnalogClock } from '..';

class TestPointer extends MouseEvent {
  pointerId: number; isPrimary: boolean;
  constructor(type: string, init: PointerEventInit = {}) { super(type, init); this.pointerId = init.pointerId ?? 1; this.isPrimary = init.isPrimary ?? true; }
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });
describe('AnalogClock', () => {
  it('supports keyboard, debounced announcements and accessibility', async () => {
    const onChange = vi.fn();
    const { container } = render(<AnalogClock label="Relógio interativo" time={{ h: 3, m: 0 }} interactive onChange={onChange} minuteLabels />);
    expect((await axe(container)).violations).toEqual([]);
    vi.useFakeTimers();
    fireEvent.keyDown(screen.getByRole('group'), { key: 'ArrowUp' });
    expect(onChange).toHaveBeenCalledWith({ h: 3, m: 1 }, 'minute');
    act(() => vi.advanceTimersByTime(400));
    expect(screen.getByText('03:01')).toBeTruthy();
  });
  it('ignores non-primary and null or singular matrices', () => {
    vi.stubGlobal('PointerEvent', TestPointer);
    const onChange = vi.fn(); render(<AnalogClock label="Relógio" time={{ h: 3, m: 0 }} interactive onChange={onChange} />);
    const svg = screen.getByRole('group') as unknown as SVGSVGElement;
    Object.defineProperty(svg, 'getScreenCTM', { configurable: true, value: vi.fn(() => null) });
    fireEvent.pointerDown(svg, { isPrimary: false }); fireEvent.pointerDown(svg, { isPrimary: true });
    Object.defineProperty(svg, 'getScreenCTM', { configurable: true, value: () => ({ inverse: () => { throw new DOMException('singular'); } }) });
    expect(() => fireEvent.pointerDown(svg, { isPrimary: true })).not.toThrow(); expect(onChange).not.toHaveBeenCalled();
  });
  it('cancels previous highlight animation', () => {
    const cancel = vi.fn();
    Object.defineProperty(SVGElement.prototype, 'animate', { configurable: true, value: () => ({ cancel, finished: Promise.resolve() }) });
    const { rerender, unmount } = render(<AnalogClock label="Relógio" time={{ h: 3, m: 0 }} highlight={{ target: 'hour', seq: 1 }} />);
    rerender(<AnalogClock label="Relógio" time={{ h: 3, m: 0 }} highlight={{ target: 'hour', seq: 1 }} />);
    expect(cancel).not.toHaveBeenCalled();
    rerender(<AnalogClock label="Relógio" time={{ h: 3, m: 0 }} highlight={{ target: 'hour', seq: 2 }} />);
    expect(cancel).toHaveBeenCalledTimes(1); unmount(); expect(cancel).toHaveBeenCalledTimes(2);
  });
});
