// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { StrictMode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import type { SoundApi, SpeechApi } from '@/contracts';
import { ExploreScreen } from '@/screens/ExploreScreen';

function createFakeSound(): SoundApi {
  return {
    enabled: true,
    play: vi.fn(),
    unlock: vi.fn(),
  };
}

function createFakeSpeech(): SpeechApi {
  return {
    supported: true,
    enabled: true,
    speaking: false,
    speak: vi.fn(),
    speakMessage: vi.fn(),
    cancel: vi.fn(),
  };
}

describe('ExploreScreen', () => {
  it('aplica data-atmosphere em document.documentElement, sincroniza ATMOSPHERE_AMBIENT e faz cleanup no unmount', async () => {
    const user = userEvent.setup();
    const sound = createFakeSound();
    const speech = createFakeSpeech();
    const onHome = vi.fn();

    document.documentElement.removeAttribute('data-atmosphere');

    const { container, unmount } = render(
      <ExploreScreen
        sound={sound}
        speech={speech}
        onHome={onHome}
        initialTime={{ h: 9, m: 0 }}
      />,
    );

    expect(document.documentElement).toHaveAttribute('data-atmosphere', 'manha');
    expect(container.querySelector('[data-mascot-ambient="day"]')).not.toBeNull();
    expect(screen.getByText('São nove horas da manhã.')).toBeInTheDocument();
    expect(screen.getByText('ou: São nove horas.')).toBeInTheDocument();

    // Trocar período (+12h -> 21:00 noite -> ambient night)
    await user.click(screen.getByRole('button', { name: /Trocar período/i }));
    expect(document.documentElement).toHaveAttribute('data-atmosphere', 'noite');
    expect(container.querySelector('[data-mascot-ambient="night"]')).not.toBeNull();
    expect(screen.getByText('São nove horas da noite.')).toBeInTheDocument();
    expect(screen.getByText('ou: São vinte e uma horas.')).toBeInTheDocument();

    // Ouvir frase
    await user.click(screen.getByRole('button', { name: 'Ouvir' }));
    expect(speech.speak).toHaveBeenCalledWith('São nove horas da noite.');

    // Que horas são agora?
    await user.click(screen.getByRole('button', { name: 'Que horas são agora?' }));
    expect(speech.speak).toHaveBeenCalledWith(expect.stringMatching(/^Agora:/));

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);

    // Voltar ao início cancela fala
    await user.click(screen.getByRole('button', { name: 'Voltar ao início' }));
    expect(speech.cancel).toHaveBeenCalled();
    expect(onHome).toHaveBeenCalledTimes(1);

    // Cleanup no unmount remove data-atmosphere
    unmount();
    expect(document.documentElement.hasAttribute('data-atmosphere')).toBe(false);
  });

  it('cobre atmosferas madrugada e tarde com ATMOSPHERE_AMBIENT correspondente', () => {
    const sound = createFakeSound();
    const speech = createFakeSpeech();

    const { unmount: unmountMadrugada } = render(
      <ExploreScreen
        sound={sound}
        speech={speech}
        onHome={() => {}}
        initialTime={{ h: 3, m: 15 }}
      />,
    );
    expect(document.documentElement).toHaveAttribute('data-atmosphere', 'madrugada');
    unmountMadrugada();

    const { unmount: unmountTarde } = render(
      <ExploreScreen
        sound={sound}
        speech={speech}
        onHome={() => {}}
        initialTime={{ h: 15, m: 30 }}
      />,
    );
    expect(document.documentElement).toHaveAttribute('data-atmosphere', 'tarde');
    unmountTarde();
  });

  it('sob React StrictMode emite exatamente 1 unlock e 1 tick por gesto de seta no relogio', () => {
    const sound = createFakeSound();
    const speech = createFakeSpeech();

    const { unmount } = render(
      <StrictMode>
        <ExploreScreen
          sound={sound}
          speech={speech}
          onHome={() => {}}
          initialTime={{ h: 9, m: 0 }}
        />
      </StrictMode>,
    );

    const clockSvg = screen.getByRole('group', {
      name: /Relógio analógico para explorar\. Use as setas ou arraste os ponteiros\. Posição atual:/i,
    });

    // 1º gesto: seta para cima (+1 minuto -> 09:01)
    fireEvent.keyDown(clockSvg, { key: 'ArrowUp' });
    expect(sound.unlock).toHaveBeenCalledTimes(1);
    expect(sound.play).toHaveBeenCalledTimes(1);
    expect(sound.play).toHaveBeenLastCalledWith('tick');

    // 2º gesto: seta para a direita (+1 hora -> 10:01)
    fireEvent.keyDown(clockSvg, { key: 'ArrowRight' });
    expect(sound.unlock).toHaveBeenCalledTimes(2);
    expect(sound.play).toHaveBeenCalledTimes(2);
    expect(sound.play).toHaveBeenLastCalledWith('tick');

    unmount();
  });
});
