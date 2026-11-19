// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { VisuallyHidden } from '@/components/VisuallyHidden';

describe('VisuallyHidden', () => {
  it('renderiza texto acessivel a leitores de tela sem violacoes axe', async () => {
    const { container } = render(
      <button type="button">
        <VisuallyHidden>Voltar ao início</VisuallyHidden>
      </button>,
    );

    expect(screen.getByRole('button', { name: 'Voltar ao início' })).toBeInTheDocument();

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
