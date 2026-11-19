// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { DigitalClock } from '..';
import { AnswerRegion } from '../../AnswerRegion';
import { Slot } from '../../Slot';
import { Tile } from '../../Tile';
import { DragLayerProvider } from '../../DragLayer';

afterEach(() => vi.restoreAllMocks());
it('renders accessible clocks, slots and tiles with cancellable animations', async () => {
  const cancel = vi.fn();
  Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: () => ({ cancel, finished: Promise.resolve() }) });
  const slot = { id: 'h', group: 'hour' as const, answer: '03', label: 'Lacuna das horas' };
  const tile = { id: 'h1', group: 'hour' as const, value: '03' };
  const { container, rerender, unmount } = render(<DragLayerProvider><AnswerRegion mode="numbers" ariaLabel="Resposta"><DigitalClock hours={3} minutes={5} glow={{ group: 'hour', seq: 1 }} /><Slot slot={slot} filledWith={null} over glowSeq={1} /><Tile tile={tile} used={false} shakeSeq={1} onTap={() => {}} onDrop={() => {}} /></AnswerRegion></DragLayerProvider>);
  expect(screen.getByRole('group', { name: 'Relógio digital marcando 03:05' })).toBeTruthy();
  expect(screen.getByRole('img', { name: 'Lacuna das horas: vazia' }).tagName).toBe('SPAN');
  expect((await axe(container)).violations).toEqual([]);
  rerender(<DragLayerProvider><AnswerRegion mode="numbers" ariaLabel="Resposta"><DigitalClock hours={3} minutes={5} glow={{ group: 'minute', seq: 2 }} /><Slot slot={slot} filledWith="03" over={false} glowSeq={2} /><Tile tile={tile} used={false} shakeSeq={2} onTap={() => {}} onDrop={() => {}} /></AnswerRegion></DragLayerProvider>);
  expect(screen.getByRole('img', { name: 'Lacuna das horas: 03' }).hasAttribute('data-filled')).toBe(true);
  expect(cancel).toHaveBeenCalledTimes(3); unmount(); expect(cancel).toHaveBeenCalledTimes(6);
});
