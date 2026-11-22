// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import type { Locator, Page } from '@playwright/test';

import { ANSWER_REGION_LABELS } from '../../src/contracts/index.ts';
import { APP_COPY } from '../../src/content/copy.ts';
import type { GameMode, ModeId } from '../../src/domain/types.ts';

export { ANSWER_REGION_LABELS, APP_COPY };

export const MODE_IDS = ['assemble', 'numbers', 'words', 'hands', 'explore'] as const satisfies readonly ModeId[];

export function modeTitle(id: ModeId): string {
  return APP_COPY.modes[id].title;
}

export function levelName(id: 1 | 2 | 3 | 4): string {
  return APP_COPY.levels[id].name;
}

export function homeHeading(page: Page): Locator {
  return page.getByRole('heading', { name: APP_COPY.home.title, level: 1 });
}

export function modeCard(page: Page, id: ModeId): Locator {
  const title = modeTitle(id);
  return page.getByRole('button', { name: new RegExp(escapeRegExp(title)) });
}

export function levelSelectorButton(page: Page): Locator {
  return page.getByRole('group', { name: 'Níveis', exact: true })
    .locator('button[data-level-current]');
}

export function levelRadio(page: Page, id: 1 | 2 | 3 | 4): Locator {
  return page.getByRole('radio', { name: new RegExp(escapeRegExp(levelName(id))) });
}

export function menuButton(page: Page): Locator {
  return page.getByRole('button', { name: /^(Menu|Abrir menu|Fechar menu)$/i });
}

export function soundSwitch(page: Page): Locator {
  return page.getByRole('switch', { name: /Som/i });
}

export function voiceSwitch(page: Page): Locator {
  return page.getByRole('switch', { name: /Voz/i });
}

export function teachersMenuItem(page: Page): Locator {
  return page.getByRole('menuitem', { name: APP_COPY.menu.teachers }).or(
    page.getByRole('button', { name: APP_COPY.menu.teachers }),
  );
}

export function iosInstallTip(page: Page): Locator {
  return page.getByText(APP_COPY.menu.iosInstallTip, { exact: true });
}

export function teachersDialog(page: Page): Locator {
  return page.getByRole('dialog', { name: APP_COPY.teachers.title });
}

export function resetProgressButton(page: Page): Locator {
  return page.getByRole('button', { name: APP_COPY.teachers.resetButton });
}

export function resetConfirmButton(page: Page): Locator {
  return page.getByRole('button', { name: APP_COPY.resetProgress.confirmButton });
}

export function resetCancelButton(page: Page): Locator {
  return page.getByRole('button', { name: APP_COPY.resetProgress.cancelButton });
}

export function answerRegion(page: Page, mode: GameMode): Locator {
  return page.getByRole('group', { name: ANSWER_REGION_LABELS[mode] });
}

export function tileButtons(page: Page): Locator {
  return page.getByRole('button', { name: /^(Horas|Minutos|Período):/ });
}

export function backHomeButton(page: Page): Locator {
  return page
    .getByRole('button', { name: APP_COPY.game.back })
    .or(page.getByRole('button', { name: APP_COPY.result.home }))
    .or(page.getByRole('link', { name: APP_COPY.result.home }));
}

export function readyButton(page: Page): Locator {
  return page.getByRole('button', { name: APP_COPY.game.ready });
}

export function nextButton(page: Page): Locator {
  return page.getByRole('button', { name: APP_COPY.game.next });
}

export function hintButton(page: Page): Locator {
  return page.getByRole('button', { name: APP_COPY.game.hint });
}

export function listenButton(page: Page): Locator {
  return page.getByRole('button', { name: APP_COPY.game.listen });
}

export function confettiParticles(page: Page): Locator {
  return page.locator('[data-confetti-particle="true"]');
}

export function offlineReadyBadge(page: Page): Locator {
  return page.getByText(APP_COPY.menu.offlineReady, { exact: true });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
