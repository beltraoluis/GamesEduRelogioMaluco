// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { expect, test } from '@playwright/test';

test('React 19 de produção preserva Activity, callback atual e DevTools', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const trace: string[] = [];
    Object.assign(window, {
      devtoolsTrace: trace,
      __REACT_DEVTOOLS_GLOBAL_HOOK__: {
        supportsFiber: true,
        checkDCE: () => trace.push('checkDCE'),
        inject: (renderer: { version: string }) => { trace.push(`inject:${renderer.version}`); return 1; },
        onCommitFiberRoot() {}, onCommitFiberUnmount() {},
      },
    });
  });
  await page.goto('/react-probe/index.html');
  const evidence = () => page.evaluate(() => {
    const probe = window as unknown as { runtimeProbe: () => { version: string; events: string[]; pending?: number } };
    return probe.runtimeProbe();
  });
  await page.getByRole('button', { name: 'Começar', exact: true }).click();
  await expect.poll(evidence).toEqual({ version: '19.3.1', events: ['initial:1:question-started'], pending: 0 });
  await page.getByRole('button', { name: 'Ocultar com evento pendente' }).click();
  await expect(page.getByText('Atividade visível')).toBeHidden();
  await expect.poll(evidence).toMatchObject({ events: ['initial:1:question-started'], pending: 1 });
  await page.getByRole('button', { name: 'Reexibir' }).click();
  const expected = { version: '19.3.1', events: ['initial:1:question-started', 'latest:2:help-shown'], pending: 0 };
  await expect.poll(evidence).toEqual(expected);
  await page.getByRole('button', { name: 'Ocultar com evento pendente' }).click();
  await page.getByRole('button', { name: 'Reexibir' }).click();
  await expect.poll(evidence).toEqual(expected);
  expect(await page.evaluate(() => (window as unknown as { devtoolsTrace: string[] }).devtoolsTrace))
    .toEqual(['checkDCE', 'checkDCE', 'inject:19.3.1']);
  expect(errors).toEqual([]);
});
