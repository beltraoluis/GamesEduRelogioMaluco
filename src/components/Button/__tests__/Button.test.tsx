// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { Button } from '@/components/Button';
import { UiIcon } from '@/ui/icons/UiIcons';

describe('Button', () => {
  it('renderiza variantes com icone, responde ao clique e passa no vitest-axe', async () => {
    const onClick = vi.fn();
    const { container } = render(
      <Button
        variant="go"
        size="lg"
        icon={<UiIcon name="CheckBadge" />}
        onClick={onClick}
      >
        Pronto!
      </Button>,
    );

    const btn = screen.getByRole('button', { name: 'Pronto!' });
    expect(btn).toHaveAttribute('type', 'button');
    expect(btn).toHaveAttribute('data-variant', 'go');
    expect(btn).toHaveAttribute('data-size', 'lg');

    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
