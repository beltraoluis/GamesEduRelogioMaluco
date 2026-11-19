// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { LevelSelector } from '@/components/LevelSelector';
import { LEVELS } from '@/domain/levels';

describe('LevelSelector', () => {
  it('permite navegar com botoes de seta e selecionar nivel por radio no popover', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    const { container, rerender } = render(
      <LevelSelector levels={LEVELS} current={1} onChange={onChange} />,
    );

    const prevBtn = screen.getByRole('button', { name: 'Nível anterior' });
    const nextBtn = screen.getByRole('button', { name: 'Próximo nível' });
    expect(prevBtn).toBeDisabled();
    expect(nextBtn).not.toBeDisabled();

    await user.click(nextBtn);
    expect(onChange).toHaveBeenCalledWith(2);

    rerender(<LevelSelector levels={LEVELS} current={2} onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Nível anterior' })).not.toBeDisabled();

    const trigger = screen.getByRole('button', { name: /Nível 2: Meias e quartos/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(4);
    expect(radios[1]).toBeChecked();

    const resultsOpen = await axe(container);
    expect(resultsOpen.violations).toHaveLength(0);

    await user.click(radios[3]!);
    expect(onChange).toHaveBeenCalledWith(4);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('fecha o popover com Escape e desabilita Proximo nivel no nivel 4', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<LevelSelector levels={LEVELS} current={4} onChange={onChange} />);

    expect(screen.getByRole('button', { name: 'Próximo nível' })).toBeDisabled();

    const trigger = screen.getByRole('button', { name: /Nível 4:/i });
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await user.keyboard('{Escape}');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });
});
