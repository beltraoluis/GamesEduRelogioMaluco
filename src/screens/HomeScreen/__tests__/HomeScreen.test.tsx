// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { HomeScreen } from '@/screens/HomeScreen';

describe('HomeScreen', () => {
  it('renderiza mascote Tic, LevelSelector, 4 ModeCards com descricoes e estrelas, menu e dialogo', async () => {
    const user = userEvent.setup();
    const onSelectMode = vi.fn();
    const onChangeLevel = vi.fn();
    const onToggleSound = vi.fn();
    const onToggleVoice = vi.fn();
    const onResetStars = vi.fn();

    const { container } = render(
      <HomeScreen
        prefs={{
          level: 2,
          sound: true,
          voice: true,
          stars: { 'numbers-2': 3, 'words-2': 1 },
        }}
        persistent
        onSelectMode={onSelectMode}
        onChangeLevel={onChangeLevel}
        onToggleSound={onToggleSound}
        onToggleVoice={onToggleVoice}
        onResetStars={onResetStars}
        update={{
          updateReady: false,
          applyUpdate: () => {},
          dismissToast: () => {},
        }}
        sourceUrl="https://github.com/beltraoluis/GamesEduRelogioMaluco/tree/1c8594a"
      />,
    );

    expect(screen.getByRole('heading', { name: 'Relógio Maluco' })).toBeInTheDocument();
    expect(screen.getByText('Vamos aprender a ler as horas!')).toBeInTheDocument();
    expect(container.querySelector('svg[data-mascot="tic"][data-size="md"]')).not.toBeNull();

    // 4 modos com descrição curta
    expect(screen.getByText('Leia o relógio e arraste os números')).toBeInTheDocument();
    expect(screen.getByText('Monte a frase da hora')).toBeInTheDocument();
    expect(screen.getByText('Gire os ponteiros do relógio')).toBeInTheDocument();
    expect(screen.getByText('Brinque livremente com o relógio')).toBeInTheDocument();

    // Estrelas do nível 2
    expect(screen.getByRole('img', { name: '3 de 3 estrelas' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '1 de 3 estrelas' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '0 de 3 estrelas' })).toBeInTheDocument();

    // Toast oculto quando updateReady === false
    expect(screen.queryByText('Nova versão pronta.')).toBeNull();

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);

    // Selecionar modo
    await user.click(screen.getByRole('button', { name: /Números/i }));
    expect(onSelectMode).toHaveBeenCalledWith('numbers');

    // Abrir diálogo Para educadores pelo menu
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    await user.click(screen.getByRole('button', { name: /Para educadores/i }));
    expect(
      screen.getByRole('dialog', { name: 'Para educadores e famílias' }),
    ).toBeInTheDocument();
  });

  it('exibe toast Nova versao pronta na HomeScreen quando update.updateReady === true', async () => {
    const user = userEvent.setup();
    const applyUpdate = vi.fn();
    const dismissToast = vi.fn();

    render(
      <HomeScreen
        prefs={{ level: 1, sound: true, voice: true, stars: {} }}
        persistent
        onSelectMode={() => {}}
        onChangeLevel={() => {}}
        onToggleSound={() => {}}
        onToggleVoice={() => {}}
        onResetStars={() => {}}
        update={{
          updateReady: true,
          applyUpdate,
          dismissToast,
        }}
        sourceUrl="https://github.com/beltraoluis/GamesEduRelogioMaluco/tree/1c8594a"
      />,
    );

    expect(screen.getByText('Nova versão pronta.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Atualizar agora' }));
    expect(applyUpdate).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Agora não' }));
    expect(dismissToast).toHaveBeenCalledTimes(1);
  });
});
