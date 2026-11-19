// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { SpeechBubble } from '@/components/SpeechBubble';
import { b, msg, s, t, term } from '@/domain/messages';

describe('SpeechBubble', () => {
  it('renderiza mensagem com aria-live polite por padrao e texto plano limpo sem emojis', async () => {
    const sample = msg(
      'help.digital.hour',
      t('Veja os números '),
      s('antes'),
      t(' dos dois pontos '),
      b('colon'),
      t(': eles mostram as '),
      term('horas', 'hour'),
      t('.'),
    );

    const { container } = render(<SpeechBubble message={sample} />);
    const bubble = container.querySelector('[data-speech-bubble="true"]');
    expect(bubble).not.toBeNull();
    expect(bubble).toHaveAttribute('aria-live', 'polite');
    expect(bubble).toHaveAttribute('data-tone', 'neutral');
    expect(bubble).toHaveAttribute(
      'data-plain-text',
      'Veja os números antes dos dois pontos: eles mostram as horas.',
    );
    expect(screen.getByText('antes').tagName).toBe('STRONG');
    expect(screen.getByText('horas')).toHaveAttribute('data-term-group', 'hour');

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it('suporta tons positive e corrective com redundancia iconografica e live off', async () => {
    const praise = msg('praise', t('Muito bem! São três horas.'));
    const { container, rerender } = render(
      <SpeechBubble message={praise} tone="positive" live="off" />,
    );

    const bubble = container.querySelector('[data-speech-bubble="true"]');
    expect(bubble).toHaveAttribute('aria-live', 'off');
    expect(bubble).toHaveAttribute('data-tone', 'positive');
    expect(container.querySelector('[data-ui-icon="CheckBadge"]')).not.toBeNull();

    const hint = msg('drop.hour.look-hour-hand', t('Olhe o '), term('ponteiro pequeno', 'hour'), b('hour-hand'));
    rerender(<SpeechBubble message={hint} tone="corrective" />);
    expect(bubble).toHaveAttribute('data-tone', 'corrective');
    expect(container.querySelector('[data-ui-icon="HintBulb"]')).not.toBeNull();

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
