// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { expect, test } from '@playwright/test';

import { openHome } from './helpers/app.ts';
import { requiresF3Composition } from './helpers/composition.ts';
import { APP_COPY, menuButton, soundSwitch, voiceSwitch } from './helpers/locators.ts';

test.describe('Menu Som/Voz e AGPL tree/{commit} [F3]', () => {
  test('[F3] switches Som e Voz com aria-checked', async ({ page }, testInfo) => {
    requiresF3Composition(testInfo, 'AppMenu role=switch (F2b)');

    await openHome(page);
    await menuButton(page).click();

    const sound = soundSwitch(page);
    const voice = voiceSwitch(page);
    await expect(sound).toBeVisible();
    await expect(voice).toBeVisible();

    const soundBefore = await sound.getAttribute('aria-checked');
    await sound.click();
    await expect(sound).toHaveAttribute('aria-checked', soundBefore === 'true' ? 'false' : 'true');

    const voiceBefore = await voice.getAttribute('aria-checked');
    await voice.click();
    await expect(voice).toHaveAttribute('aria-checked', voiceBefore === 'true' ? 'false' : 'true');
  });

  test('[F3] Código-fonte aponta tree/{commit} do build (F5.2.1)', async ({ page }, testInfo) => {
    requiresF3Composition(testInfo, 'AppMenu sourceUrl = buildSourceUrl(__APP_COMMIT__) (F2b/F2c)');

    await openHome(page);
    await menuButton(page).click();
    const source = page.getByRole('link', { name: APP_COPY.menu.source }).or(
      page.getByRole('menuitem', { name: APP_COPY.menu.source }),
    );
    await expect(source).toBeVisible();
    const href = await source.getAttribute('href');
    expect(href).toMatch(/^https:\/\/github\.com\/beltraoluis\/GamesEduRelogioMaluco\/tree\/[0-9a-f]{7,40}$/i);
    expect(href).not.toMatch(/\/tree\/main$/);
    expect(href).not.toContain('unknown');
  });

  test('[F3] Chromium desktop: tip iOS ausente (negativo)', async ({ page, browserName }, testInfo) => {
    requiresF3Composition(testInfo, 'showIosInstallTip false fora de iOS');
    test.skip(browserName !== 'chromium', 'negativo desktop no Chromium');

    await openHome(page);
    await menuButton(page).click();
    await expect(page.getByText(APP_COPY.menu.iosInstallTip)).toHaveCount(0);
  });
});
