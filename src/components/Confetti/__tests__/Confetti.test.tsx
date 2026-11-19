// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { Confetti } from '@/components/Confetti';

describe('Confetti', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('renderiza particulas quando prefers-reduced-motion e false e burst e fornecido', async () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    const { container } = render(<Confetti burst={{ seq: 1, count: 12 }} />);
    const particles = container.querySelectorAll('[data-confetti-particle="true"]');
    expect(particles).toHaveLength(12);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it('nao renderiza nenhuma particula quando prefers-reduced-motion: reduce esta ativo', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    const { container } = render(<Confetti burst={{ seq: 2, count: 40 }} />);
    expect(container.querySelectorAll('[data-confetti-particle="true"]')).toHaveLength(0);
    expect(container.firstElementChild).toBeNull();
  });

  it('nao renderiza quando burst e null', () => {
    const { container } = render(<Confetti burst={null} />);
    expect(container.firstElementChild).toBeNull();
  });
});
