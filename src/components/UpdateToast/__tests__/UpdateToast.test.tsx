// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { UpdateToast } from '@/components/UpdateToast';

describe('UpdateToast', () => {
  it('nao renderiza quando visible e false', () => {
    const { container } = render(
      <UpdateToast visible={false} onApply={vi.fn()} onDismiss={vi.fn()} />,
    );
    expect(container.firstElementChild).toBeNull();
  });

  it('renderiza botoes Atualizar agora e Agora nao quando visible e true e passa no vitest-axe', async () => {
    const onApply = vi.fn();
    const onDismiss = vi.fn();
    const { container } = render(
      <UpdateToast visible onApply={onApply} onDismiss={onDismiss} />,
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar agora' }));
    expect(onApply).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Agora não' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
