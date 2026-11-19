// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { StarRating } from '@/components/StarRating';

describe('StarRating', () => {
  it('renderiza estrelas cheias e vazias conforme value com label acessivel', async () => {
    const { container } = render(
      <StarRating value={2} label="2 de 3 estrelas" size="lg" animate />,
    );
    const group = screen.getByRole('img', { name: '2 de 3 estrelas' });
    expect(group).toBeInTheDocument();

    const filled = container.querySelectorAll('[data-filled="true"]');
    const empty = container.querySelectorAll('[data-filled="false"]');
    expect(filled).toHaveLength(2);
    expect(empty).toHaveLength(1);

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
