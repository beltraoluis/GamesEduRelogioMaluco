// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import type { TestInfo } from '@playwright/test';

/**
 * Marca a prova como dependente da composição F3 sem mascarar com skip/fix.
 * A suíte continua executando asserções reais; na G1 elas falham de forma honesta.
 */
export function requiresF3Composition(testInfo: TestInfo, reason: string): void {
  testInfo.annotations.push({
    type: 'requires-f3-composition',
    description: reason,
  });
}
