// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { PeriodBadge } from '@/components/PeriodBadge';

describe('PeriodBadge', () => {
  it('renderiza pilula informativa sem botao quando onToggle esta ausente', async () => {
    const { container } = render(<PeriodBadge period="da manhã" />);
    expect(screen.getByText('manhã')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
    expect(container.querySelector('[data-period-medallion="manha"]')).not.toBeNull();

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it('renderiza botao de alternancia e aciona onToggle quando fornecido', async () => {
    const onToggle = vi.fn();
    const { container } = render(<PeriodBadge period="da noite" onToggle={onToggle} />);
    const btn = screen.getByRole('button', { name: /Trocar período/i });
    fireEvent.click(btn);
    expect(onToggle).toHaveBeenCalledTimes(1);

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
