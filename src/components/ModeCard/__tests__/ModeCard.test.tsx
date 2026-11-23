// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { ModeCard } from '@/components/ModeCard';
import { getMode } from '@/domain/modes';

describe('ModeCard', () => {
  it('renderiza ilustracao WebP 384x384, titulo, descricao curta e estrelas para modos pontuados', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const numbersMode = getMode("numbers");

    const { container } = render(
      <ModeCard mode={numbersMode} stars={2} onSelect={onSelect} />,
    );

    expect(screen.getByText('Números')).toBeInTheDocument();
    expect(screen.getByText('Leia o relógio e arraste os números')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '2 de 3 estrelas' })).toBeInTheDocument();

    const img = container.querySelector('img[data-mode-illustration="numbers"]');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('width', '384');
    expect(img).toHaveAttribute('height', '384');
    expect(img).toHaveAttribute('alt', '');

    await user.click(screen.getByRole('button', { name: /Números/i }));
    expect(onSelect).toHaveBeenCalledWith('numbers');

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it('nao renderiza estrelas para o modo explorar (stars = null)', async () => {
    const onSelect = vi.fn();
    const exploreMode = getMode("explore");

    const { container } = render(
      <ModeCard mode={exploreMode} stars={null} onSelect={onSelect} />,
    );

    expect(screen.getByText('Explorar')).toBeInTheDocument();
    expect(screen.getByText('Brinque livremente com o relógio')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /estrelas/i })).toBeNull();

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
