// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { expect, type Page } from '@playwright/test';

import {
  answerRegion,
  backHomeButton,
  homeHeading,
  levelRadio,
  levelSelectorButton,
  menuButton,
  modeCard,
  teachersDialog,
  teachersMenuItem,
} from './locators.ts';
import type { GameMode, ModeId } from '../../src/domain/types.ts';

export async function openHome(page: Page, path = '/'): Promise<void> {
  await page.goto(path);
  await expect(homeHeading(page)).toBeVisible();
}

export async function selectLevel(page: Page, level: 1 | 2 | 3 | 4): Promise<void> {
  const radio = levelRadio(page, level);
  const opener = levelSelectorButton(page);
  if (await opener.getAttribute('aria-expanded') === 'false') await opener.click();
  await expect(radio, `Radio do nível ${level} (APP_COPY.levels) deve existir`).toBeVisible({
    timeout: 5_000,
  });
  await radio.check();
  await expect(radio).toBeChecked();
}

export async function openMode(page: Page, id: ModeId): Promise<void> {
  const opener = levelSelectorButton(page);
  if (await opener.getAttribute('aria-expanded') === 'true') {
    await page.keyboard.press('Escape');
    await expect(opener).toHaveAttribute('aria-expanded', 'false');
  }
  await modeCard(page, id).click();
  if (id === 'explore') {
    await expect(page.getByRole('heading', { name: /Explorar/i })).toBeVisible();
    return;
  }
  await expect(answerRegion(page, id as GameMode)).toBeVisible();
}

export async function openTeachersDialog(page: Page): Promise<void> {
  await menuButton(page).click();
  await teachersMenuItem(page).click();
  await expect(teachersDialog(page)).toBeVisible();
}

export async function returnHome(page: Page): Promise<void> {
  await backHomeButton(page).click();
  await expect(homeHeading(page)).toBeVisible();
}
