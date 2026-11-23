// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import '@/styles/index.css';
import { StarIcon } from '@/ui/icons/StarIcon';
import { UI_ICON_NAMES, UiIcon } from '@/ui/icons/UiIcons';
import { MODE_ILLUSTRATION_SRCS, ModeIllustration } from '@/ui/illustrations/ModeIllustration';

describe('ModeIllustration', () => {
  it('renderiza as 5 ilustracoes dos modos com atributos de performance e acessibilidade', async () => {
    const modes = ['assemble', 'numbers', 'words', 'hands', 'explore'] as const;
    for (const mode of modes) {
      expect(MODE_ILLUSTRATION_SRCS[mode]).toBeTruthy();
      const { container, unmount } = render(<ModeIllustration mode={mode} className="custom-img" />);
      const img = container.querySelector('img');
      expect(img).not.toBeNull();
      expect(img).toHaveAttribute('alt', '');
      expect(img).toHaveAttribute('aria-hidden', 'true');
      expect(img).toHaveAttribute('loading', 'eager');
      expect(img).toHaveAttribute('decoding', 'async');
      expect(img).toHaveAttribute('width', '384');
      expect(img).toHaveAttribute('height', '384');
      expect(img).toHaveClass('custom-img');
      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
      unmount();
    }
  });
});

describe('StarIcon e UiIcons', () => {
  it('renderiza StarIcon preenchida, contorno e sparkle sem violacoes axe', async () => {
    const { container } = render(
      <div>
        <StarIcon filled />
        <StarIcon filled={false} />
        <StarIcon variant="sparkle" title="Estrela brilhante" />
      </div>,
    );
    const svgs = container.querySelectorAll('svg');
    expect(svgs).toHaveLength(3);
    expect(svgs[0]).toHaveAttribute('aria-hidden', 'true');
    expect(svgs[2]).toHaveAttribute('role', 'img');
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it('cobre 100% da familia de icones SVG duotone sem emojis e sem violacoes axe', async () => {
    expect(UI_ICON_NAMES.length).toBeGreaterThanOrEqual(33);
    const { container } = render(
      <div>
        {UI_ICON_NAMES.map((name) => (
          <UiIcon key={name} name={name} size={24} />
        ))}
        <UiIcon name="TeacherBook" title="Para educadores" className="icon-teacher" />
      </div>,
    );
    const svgs = container.querySelectorAll('svg');
    expect(svgs).toHaveLength(UI_ICON_NAMES.length + 1);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
