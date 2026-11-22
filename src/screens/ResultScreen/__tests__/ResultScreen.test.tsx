// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { buildRoundSummary } from '@/domain/scoring';
import { ResultScreen } from '@/screens/ResultScreen';

describe('ResultScreen', () => {
  it('renderiza mascote em modo celebrate, titulo, estrelas animadas, resumo e botoes', async () => {
    const user = userEvent.setup();
    const onPlayAgain = vi.fn();
    const onHome = vi.fn();
    const summary = buildRoundSummary('numbers', 1, [0, 0, 0, 0, 0, 0, 0, 0]);

    const { container } = render(
      <ResultScreen
        summary={summary}
        newRecord
        onPlayAgain={onPlayAgain}
        onHome={onHome}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Você é craque das horas!' })).toBeInTheDocument();
    expect(screen.getByText('Novo recorde!')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '3 de 3 estrelas' })).toBeInTheDocument();
    expect(
      screen.getByText('Você acertou de primeira 8 de 8 horários.'),
    ).toBeInTheDocument();

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: 'Jogar de novo' }));
    expect(onPlayAgain).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Início' }));
    expect(onHome).toHaveBeenCalledTimes(1);
  });

  it('convida a jogar de novo quando ganha menos de 3 estrelas e omite selo quando nao e recorde', () => {
    const summary = buildRoundSummary('words', 2, [1, 1, 1, 0, 0, 0, 0, 0]);

    render(
      <ResultScreen
        summary={summary}
        newRecord={false}
        onPlayAgain={() => {}}
        onHome={() => {}}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Muito bom!' })).toBeInTheDocument();
    expect(screen.queryByText('Novo recorde!')).toBeNull();
    expect(
      screen.getByText(/Jogue de novo para ganhar mais estrelas!/i),
    ).toBeInTheDocument();
  });
});
