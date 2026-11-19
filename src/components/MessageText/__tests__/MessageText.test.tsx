// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { MessageText } from '@/components/MessageText';
import { b, msg, s, t, term } from '@/domain/messages';

describe('MessageText', () => {
  it('renderiza segmentos text, strong, term com grupo pedagogico e HandBadge oculto para leitor de tela', async () => {
    const sample = msg(
      'help.digital.hour',
      t('Olhe o '),
      term('ponteiro pequeno', 'hour'),
      t(' '),
      b('hour-hand'),
      t(' '),
      s('antes'),
      t(' dos dois pontos '),
      b('colon', 'dois pontos'),
      t(' e o '),
      term('ponteiro grande', 'minute'),
      t(' no '),
      term('período', 'period'),
      t('.'),
    );

    const { container } = render(<MessageText message={sample} />);
    expect(screen.getByText('ponteiro pequeno')).toHaveAttribute('data-term-group', 'hour');
    expect(screen.getByText('ponteiro grande')).toHaveAttribute('data-term-group', 'minute');
    expect(screen.getByText('período')).toHaveAttribute('data-term-group', 'period');

    const strongEl = screen.getByText('antes');
    expect(strongEl.tagName).toBe('STRONG');

    const badges = container.querySelectorAll('svg[data-hand-badge]');
    expect(badges).toHaveLength(2);
    for (const badge of badges) {
      expect(badge).toHaveAttribute('aria-hidden', 'true');
    }

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
