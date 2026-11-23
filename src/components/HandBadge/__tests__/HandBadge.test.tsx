// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { HandBadge } from '@/components/HandBadge';
import type { BadgeKind } from '@/contracts';

describe('HandBadge', () => {
  const kinds: readonly BadgeKind[] = ['hour-hand', 'minute-hand', 'period', 'colon'];

  it('renderiza miniaturas vetoriais com aria-hidden="true" para todas as variantes', async () => {
    for (const kind of kinds) {
      const { container, unmount } = render(<HandBadge kind={kind} size="md" />);
      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
      expect(svg).toHaveAttribute('aria-hidden', 'true');
      expect(svg).toHaveAttribute('data-hand-badge', kind);
      expect(container.querySelector(`[data-badge-layer="${kind}"]`)).not.toBeNull();

      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
      unmount();
    }
  });
});
