// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { ProgressDots } from '@/components/ProgressDots';

describe('ProgressDots', () => {
  it('renderiza estados perfect, completed, current e pending com redundancia geometrica', async () => {
    const { container } = render(
      <ProgressDots total={5} current={2} results={[0, 2]} />,
    );
    expect(screen.getByRole('img', { name: 'Pergunta 3 de 5' })).toBeInTheDocument();

    expect(container.querySelector('[data-dot-index="0"]')).toHaveAttribute('data-state', 'perfect');
    expect(container.querySelector('[data-dot-index="1"]')).toHaveAttribute('data-state', 'completed');
    expect(container.querySelector('[data-dot-index="2"]')).toHaveAttribute('data-state', 'current');
    expect(container.querySelector('[data-dot-index="3"]')).toHaveAttribute('data-state', 'pending');
    expect(container.querySelector('[data-dot-index="4"]')).toHaveAttribute('data-state', 'pending');

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
