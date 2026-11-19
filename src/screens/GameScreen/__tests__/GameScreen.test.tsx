// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { useState, type ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import type { ClockTime, GameMode, GameState, LevelId } from '@/contracts';
import { gameReducer, initGame } from '@/domain/gameReducer';
import { renderMessage } from '@/domain/hints';
import {
  describeAnalogHandPositions,
  describeAnalogStimulus,
  describeInteractiveAnalogClock,
  GameScreen,
  type GameSessionApi,
  type GameView,
} from '@/screens/GameScreen';

const DEFAULT_VIEW: GameView = {
  seq: 0,
  mascot: { mood: 'happy', bounceSeq: 0 },
  shakeSeq: {},
  handHighlight: null,
  slotGlow: null,
  digitalGlow: null,
  minuteLabels: false,
};

function createSessionHarness(
  mode: GameMode,
  levelId: LevelId,
  seed = 42,
): {
  readonly Wrapper: ({ onHome }: { readonly onHome?: () => void }) => ReactElement;
  readonly spies: {
    readonly pickTile: ReturnType<typeof vi.fn>;
    readonly listen: ReturnType<typeof vi.fn>;
  };
} {
  const pickTile = vi.fn();
  const listen = vi.fn();

  function Wrapper({ onHome = () => {} }: { readonly onHome?: () => void }): ReactElement {
    const [state, setState] = useState<GameState>(() =>
      initGame({
        type: 'start',
        sessionId: 'test-session',
        mode,
        levelId,
        seed,
      }),
    );

    const session: GameSessionApi = {
      state,
      message: renderMessage(state.feedback.code, state.feedback.context),
      tone: state.feedback.tone,
      view: DEFAULT_VIEW,
      start(nextMode, nextLevelId) {
        setState(
          initGame({
            type: 'start',
            sessionId: 'test-session-2',
            mode: nextMode,
            levelId: nextLevelId,
            seed,
          }),
        );
      },
      dropTile(tileId, slotId) {
        setState((prev) => gameReducer(prev, { type: 'drop-tile', tileId, slotId }));
      },
      tapTile(tileId) {
        setState((prev) => gameReducer(prev, { type: 'tap-tile', tileId }));
      },
      moveHands(time: ClockTime) {
        setState((prev) => gameReducer(prev, { type: 'move-hands', time }));
      },
      checkHands() {
        setState((prev) => gameReducer(prev, { type: 'check-hands' }));
      },
      requestHelp() {
        setState((prev) => gameReducer(prev, { type: 'request-help' }));
      },
      next() {
        setState((prev) => gameReducer(prev, { type: 'next' }));
      },
      pickTile,
      listen,
    };

    return (
      <GameScreen
        mode={mode}
        levelId={levelId}
        session={session}
        onHome={onHome}
      />
    );
  }

  return { Wrapper, spies: { pickTile, listen } };
}

describe('GameScreen', () => {
  it('renderiza modo numbers (niveis 1 a 4), barra de 8 pilulas, encaixe tile-first e avanco', async () => {
    const user = userEvent.setup();
    const { Wrapper, spies } = createSessionHarness('numbers', 4, 101);

    const { container } = render(<Wrapper />);

    // 8 pílulas de progresso
    expect(screen.getByRole('img', { name: 'Pergunta 1 de 8' })).toBeInTheDocument();
    expect(container.querySelectorAll('[data-dot-index]')).toHaveLength(8);

    // Orientação tile-first presente
    expect(
      screen.getByText('Escolha uma ficha e toque Enter ou Espaço para encaixar'),
    ).toBeInTheDocument();

    // Selo do período no nível 4 (24h)
    expect(container.querySelector('[data-period-badge]')).not.toBeNull();

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);

    // Encontra as fichas corretas de hora e minuto e encaixa por clique/tap
    const hourSlot = screen.getByRole('img', { name: /Lacuna das horas: vazia/i });
    expect(hourSlot).toBeInTheDocument();

    // Testa botão Dica antes de concluir
    await user.click(screen.getByRole('button', { name: 'Dica' }));

    // Tenta todas as fichas de horas até preencher a lacuna das horas, depois minutos
    const hourTiles = screen.getAllByRole('button', { name: /^Horas:/i });
    for (const tile of hourTiles) {
      if (!tile.hasAttribute('disabled')) {
        await user.click(tile);
      }
    }

    const minuteTiles = screen.getAllByRole('button', { name: /^Minutos:/i });
    for (const tile of minuteTiles) {
      if (!tile.hasAttribute('disabled')) {
        await user.click(tile);
      }
    }

    // Ao concluir a pergunta, o botão Próxima aparece e Ouvir fica disponível
    const nextBtn = screen.getByRole('button', { name: 'Próxima' });
    expect(nextBtn).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ouvir' }));
    expect(spies.listen).toHaveBeenCalledTimes(1);

    await user.click(nextBtn);
    expect(screen.getByRole('img', { name: 'Pergunta 2 de 8' })).toBeInTheDocument();
  });

  it('renderiza modo words (nivel 4 com horas, minutos e periodo) e passa no axe', async () => {
    const { Wrapper } = createSessionHarness('words', 4, 202);
    const { container } = render(<Wrapper />);

    expect(
      screen.getByRole('group', {
        name: 'Resposta: frase da hora com lacunas para completar',
      }),
    ).toBeInTheDocument();

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it('renderiza modo hands com relogio interativo, legenda com HandBadge e botao Pronto!', async () => {
    const user = userEvent.setup();
    const { Wrapper } = createSessionHarness('hands', 2, 303);
    const { container } = render(<Wrapper />);

    expect(
      screen.getByRole('group', {
        name: 'Resposta: relógio analógico para girar os ponteiros',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('pequeno = horas')).toBeInTheDocument();
    expect(screen.getByText('grande = minutos')).toBeInTheDocument();

    const checkBtn = screen.getByRole('button', { name: 'Pronto!' });
    await user.click(checkBtn);

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it('descreve geometricamente os ponteiros (curto/horas, longo/minutos, posicoes intermediarias e periodo) sem vazar a resposta pronta', () => {
    // 1) Hora exata (Nível 1 - 03:00): ambos em números exatos
    const descExact = describeAnalogStimulus({ h: 3, m: 0 });
    expect(descExact).toContain('ponteiro curto das horas apontando para o número 3');
    expect(descExact).toContain('ponteiro longo dos minutos apontando para o número 12');
    expect(descExact).not.toMatch(/03:00|3 horas/);

    // 2) Múltiplo de 5 com posição intermediária das horas (Níveis 2/3 - 07:45)
    const descQuarter = describeAnalogStimulus({ h: 7, m: 45 });
    expect(descQuarter).toContain('ponteiro curto das horas entre os números 7 e 8');
    expect(descQuarter).toContain('ponteiro longo dos minutos apontando para o número 9');
    expect(descQuarter).not.toMatch(/45 minutos|07:45/);

    // 3) Minuto a minuto em 24h com período visual e dicas (Nível 4 - 15:23 da tarde)
    const descMinute24 = describeAnalogStimulus(
      { h: 15, m: 23 },
      { period: 'da tarde', minuteLabels: true },
    );
    expect(descMinute24).toContain('ponteiro curto das horas entre os números 3 e 4');
    expect(descMinute24).toContain(
      'ponteiro longo dos minutos entre os números 4 e 5, 3 tracinhos depois do número 4',
    );
    expect(descMinute24).toContain('período da tarde');
    expect(descMinute24).toContain('marcadores de 5 em 5 minutos visíveis no mostrador');
    expect(descMinute24).not.toMatch(/15:23|23 minutos|15 horas/);

    // 4) Caso 1 tracinho depois do 12 (00:01 da madrugada)
    const descMidnightPlus1 = describeAnalogHandPositions({ h: 0, m: 1 });
    expect(descMidnightPlus1).toContain('ponteiro curto das horas entre os números 12 e 1');
    expect(descMidnightPlus1).toContain(
      'ponteiro longo dos minutos entre os números 12 e 1, 1 tracinho depois do número 12',
    );

    // 5) Relógio interativo preserva instruções de controle e informa posição atual
    const descInteractiveLock = describeInteractiveAnalogClock({ h: 5, m: 0 }, true);
    expect(descInteractiveLock).toContain('Relógio analógico interativo.');
    expect(descInteractiveLock).toContain('Use as setas esquerda e direita ou arraste o ponteiro curto das horas');
    expect(descInteractiveLock).toContain('Posição atual: ponteiro curto das horas apontando para o número 5');

    const descInteractiveFree = describeInteractiveAnalogClock({ h: 10, m: 30 }, false);
    expect(descInteractiveFree).toContain('Relógio analógico interativo. Use as setas ou arraste os ponteiros.');
    expect(descInteractiveFree).toContain('ponteiro curto das horas entre os números 10 e 11');
    expect(descInteractiveFree).toContain('ponteiro longo dos minutos apontando para o número 6');
  });

  it('expoe descricao acessivel dos ponteiros no DOM da GameScreen nos modos numbers, words (analog) e hands', () => {
    // Modo numbers nível 4 (com período)
    const { Wrapper: NumbersL4 } = createSessionHarness('numbers', 4, 77);
    const { unmount: unmountNumbers } = render(<NumbersL4 />);
    const stimulusClock = screen.getByRole('group', {
      name: /Relógio analógico do desafio: ponteiro curto das horas.*; ponteiro longo dos minutos.*; período da /i,
    });
    expect(stimulusClock).toBeInTheDocument();
    unmountNumbers();

    // Modo hands nível 1 (lockMinute = true)
    const { Wrapper: HandsL1 } = createSessionHarness('hands', 1, 88);
    const { unmount: unmountHands } = render(<HandsL1 />);
    const interactiveClock = screen.getByRole('group', {
      name: /Relógio analógico interativo\..*Posição atual: ponteiro curto das horas/i,
    });
    expect(interactiveClock).toBeInTheDocument();
    unmountHands();
  });
});
