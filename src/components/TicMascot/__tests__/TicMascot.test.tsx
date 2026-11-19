// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { TicMascot } from '@/components/TicMascot';
import type { MascotAmbient, MascotMood, MascotSize } from '@/contracts';

describe('TicMascot', () => {
  const moods: readonly MascotMood[] = ['happy', 'think', 'celebrate', 'hint'];
  const sizes: readonly MascotSize[] = ['sm', 'md', 'lg'];
  const ambients: readonly MascotAmbient[] = ['day', 'night'];

  it('mantem as duas sinetas rosas gemeas e aria-hidden="true" em todos os humores, tamanhos e ambientes', async () => {
    for (const mood of moods) {
      for (const size of sizes) {
        for (const ambient of ambients) {
          const { container, unmount } = render(
            <TicMascot mood={mood} size={size} ambient={ambient} bounceSeq={2} />,
          );
          const svg = container.querySelector('svg');
          expect(svg).not.toBeNull();
          expect(svg).toHaveAttribute('aria-hidden', 'true');
          expect(svg).toHaveAttribute('data-mood', mood);
          expect(svg).toHaveAttribute('data-size', size);
          expect(svg).toHaveAttribute('data-mascot-ambient', ambient);
          expect(svg).toHaveAttribute('data-bounce-seq', '2');

          const leftBell = container.querySelector('[data-bell="left"]');
          const rightBell = container.querySelector('[data-bell="right"]');
          expect(leftBell).not.toBeNull();
          expect(rightBell).not.toBeNull();
          expect(leftBell).toHaveAttribute('fill', '#ff8fab');
          expect(rightBell).toHaveAttribute('fill', '#ff8fab');

          const moodLayer = container.querySelector(`[data-mood-layer="${mood}"]`);
          expect(moodLayer).not.toBeNull();

          const results = await axe(container);
          expect(results.violations).toHaveLength(0);
          unmount();
        }
      }
    }
  });
});
