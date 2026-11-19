// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { TeachersDialog } from '@/components/TeachersDialog';
import { BNCC_SKILL_CODES } from '@/content/educators';

describe('TeachersDialog', () => {
  it('renderiza <dialog> nativo com tabela BNCC completa, aviso AGPL §13 e confirmacao em 2 etapas', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onResetStars = vi.fn();
    const sourceUrl = 'https://github.com/beltraoluis/GamesEduRelogioMaluco/tree/1c8594a';

    const { container } = render(
      <TeachersDialog
        open
        onClose={onClose}
        onResetStars={onResetStars}
        sourceUrl={sourceUrl}
        persistent
      />,
    );

    const dialog = screen.getByRole('dialog', { name: 'Para educadores e famílias' });
    expect(dialog).toHaveAttribute('closedby', 'any');

    // Verifica todas as 6 habilidades BNCC na tabela
    const table = screen.getByRole('table');
    for (const code of BNCC_SKILL_CODES) {
      expect(within(table).getByText(code)).toBeInTheDocument();
    }

    // Verifica texto AGPL §13 e links
    expect(screen.getByText(/compilados e minificados/i)).toBeInTheDocument();
    expect(screen.getByText(/npm ci/i)).toBeInTheDocument();
    expect(screen.getAllByText(/THIRD_PARTY_LICENSES\.txt/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('link', { name: /Código-fonte \(1c8594a\)/i })).toHaveAttribute(
      'href',
      sourceUrl,
    );

    // Confirmacao em 2 etapas para apagar progresso
    const step1Btn = screen.getByRole('button', { name: 'Apagar progresso deste aparelho' });
    await user.click(step1Btn);
    expect(onResetStars).not.toHaveBeenCalled();
    expect(
      screen.getByText('Tem certeza? Todas as estrelas salvas neste aparelho serão apagadas.'),
    ).toBeInTheDocument();

    // Cancelar volta para etapa 1 sem apagar
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onResetStars).not.toHaveBeenCalled();

    // Confirmar na etapa 2 apaga e anuncia 'Progresso apagado.'
    await user.click(screen.getByRole('button', { name: 'Apagar progresso deste aparelho' }));
    await user.click(screen.getByRole('button', { name: 'Sim, apagar' }));
    expect(onResetStars).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Progresso apagado.')).toBeInTheDocument();

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('exibe aviso discreto quando persistent === false', () => {
    render(
      <TeachersDialog
        open
        onClose={() => {}}
        onResetStars={() => {}}
        sourceUrl="https://github.com/beltraoluis/GamesEduRelogioMaluco/tree/1c8594a"
        persistent={false}
      />,
    );

    expect(
      screen.getByText(/Neste aparelho o progresso não pode ser salvo/i),
    ).toBeInTheDocument();
  });
});
