// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { AppMenu } from '@/components/AppMenu';

const BASE_PWA = {
  canInstall: false,
  install: vi.fn().mockResolvedValue('unavailable' as const),
  isStandalone: false,
  showIosInstallTip: false,
};

describe('AppMenu', () => {
  it('abre popover auto, alterna switches de som/voz, aciona educadores e expoe link Codigo-fonte', async () => {
    const user = userEvent.setup();
    const onToggleSound = vi.fn();
    const onToggleVoice = vi.fn();
    const onOpenTeachers = vi.fn();
    const sourceUrl = 'https://github.com/beltraoluis/GamesEduRelogioMaluco/tree/1c8594a';

    const { container } = render(
      <AppMenu
        sound
        voice={false}
        onToggleSound={onToggleSound}
        onToggleVoice={onToggleVoice}
        onOpenTeachers={onOpenTeachers}
        sourceUrl={sourceUrl}
        pwa={BASE_PWA}
      />,
    );

    const trigger = screen.getByRole('button', { name: 'Menu' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('aria-label', 'Fechar menu');

    const soundSwitch = screen.getByRole('switch', { name: /Som: ligado/i });
    const voiceSwitch = screen.getByRole('switch', { name: /Voz: desligada/i });
    expect(soundSwitch).toHaveAttribute('aria-checked', 'true');
    expect(voiceSwitch).toHaveAttribute('aria-checked', 'false');

    await user.click(soundSwitch);
    expect(onToggleSound).toHaveBeenCalledTimes(1);

    await user.click(voiceSwitch);
    expect(onToggleVoice).toHaveBeenCalledTimes(1);

    const sourceLink = screen.getByRole('link', { name: /Código-fonte/i });
    expect(sourceLink).toHaveAttribute('href', sourceUrl);

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: /Para educadores/i }));
    expect(onOpenTeachers).toHaveBeenCalledTimes(1);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });

  it('exibe botao Instalar quando canInstall e dica iOS Safari quando showIosInstallTip', async () => {
    const user = userEvent.setup();
    const install = vi.fn().mockResolvedValue('accepted' as const);

    const { rerender } = render(
      <AppMenu
        sound
        voice
        onToggleSound={() => {}}
        onToggleVoice={() => {}}
        onOpenTeachers={() => {}}
        sourceUrl="https://github.com/beltraoluis/GamesEduRelogioMaluco/tree/1c8594a"
        pwa={{
          canInstall: true,
          install,
          isStandalone: false,
          showIosInstallTip: false,
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Menu' }));
    const installBtn = screen.getByRole('button', { name: /Instalar/i });
    await user.click(installBtn);
    expect(install).toHaveBeenCalledTimes(1);

    rerender(
      <AppMenu
        sound
        voice
        onToggleSound={() => {}}
        onToggleVoice={() => {}}
        onOpenTeachers={() => {}}
        sourceUrl="https://github.com/beltraoluis/GamesEduRelogioMaluco/tree/1c8594a"
        pwa={{
          canInstall: false,
          install,
          isStandalone: false,
          showIosInstallTip: true,
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Menu' }));
    expect(
      screen.getByText(/No iPhone\/iPad: Compartilhar > Adicionar à Tela de Início/i),
    ).toBeInTheDocument();
  });
});
