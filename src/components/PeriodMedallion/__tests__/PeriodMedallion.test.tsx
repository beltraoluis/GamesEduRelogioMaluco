// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { PeriodMedallion, normalizePeriodToAtmosphere } from '@/components/PeriodMedallion';
import type { Period } from '@/contracts';

describe('PeriodMedallion', () => {
  const periods: readonly Period[] = ['da madrugada', 'da manhã', 'da tarde', 'da noite'];

  it('renderiza os 4 medalhoes multicamada com aria-hidden="true" e zero violacoes axe', async () => {
    for (const period of periods) {
      const atmosphere = normalizePeriodToAtmosphere(period);
      const { container, unmount } = render(<PeriodMedallion period={period} size="lg" />);
      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
      expect(svg).toHaveAttribute('aria-hidden', 'true');
      expect(svg).toHaveAttribute('data-period-medallion', atmosphere);
      expect(container.querySelector(`[data-layer="${atmosphere}"]`)).not.toBeNull();

      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
      unmount();
    }
  });
});
