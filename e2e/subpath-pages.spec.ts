// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { openMode, selectLevel } from './helpers/app.ts';
import { solveLevelOneNumbers } from './helpers/clock.ts';
import { requiresF3Composition } from './helpers/composition.ts';
import { homeHeading, modeCard } from './helpers/locators.ts';
import { F2C_DIST, F2C_SHA, RUNTIME_DIST, SUBPATH } from './helpers/paths.ts';
import { listCacheNames, waitForServiceWorkerControl } from './helpers/preferences.ts';
import { startSwitchableServer } from './helpers/static-server.ts';
import { waitForWorkboxPrecache } from './helpers/sw.ts';

test.describe('Subpath GitHub Pages (base: ./)', () => {
  test('runtime-dist isolado responde 200 em / e no subpath (G1)', async () => {
    const distDir = RUNTIME_DIST;
    expect(existsSync(path.join(distDir, 'index.html'))).toBe(true);
    expect(distDir).toBe(RUNTIME_DIST);

    const server = await startSwitchableServer({ distDir });
    server.setRoot('dist');

    try {
      const rootIndex = await fetch(`${server.origin}/`);
      expect(rootIndex.status).toBe(200);
      const rootHtml = await rootIndex.text();
      expect(rootHtml).toMatch(/Relógio Maluco/);

      const rootLicense = await fetch(`${server.origin}/LICENSE.txt`);
      expect(rootLicense.status).toBe(200);

      const assetMatch = rootHtml.match(/assets\/[^"']+\.js/);
      expect(assetMatch, 'index deve referenciar asset JS hashed').toBeTruthy();
      const assetUrl = `${server.origin}/${assetMatch![0]}`;
      expect((await fetch(assetUrl)).status).toBe(200);
      expect((await fetch(`${server.origin}/sw.js`)).status).toBe(200);

      server.setSubpath(SUBPATH);
      const subIndex = await fetch(`${server.origin}${SUBPATH}/`);
      expect(subIndex.status).toBe(200);
      const subHtml = await subIndex.text();
      expect(subHtml).toMatch(/Relógio Maluco/);

      const subLicense = await fetch(`${server.origin}${SUBPATH}/LICENSE.txt`);
      expect(subLicense.status).toBe(200);
      expect(await subLicense.text()).toMatch(/GNU AFFERO/i);

      const subAsset = `${server.origin}${SUBPATH}/${assetMatch![0]}`;
      expect((await fetch(subAsset)).status).toBe(200);
      expect((await fetch(`${server.origin}${SUBPATH}/sw.js`)).status).toBe(200);

      const manifest = await fetch(`${server.origin}${SUBPATH}/manifest.webmanifest`);
      expect(manifest.status).toBe(200);
      const manifestJson = (await manifest.json()) as { start_url?: string; scope?: string };
      expect(manifestJson.start_url).toBe('./');
      expect(manifestJson.scope).toBe('./');
    } finally {
      await server.close();
    }
  });

  test('[F3] subpath offline com UI completa (ModeCard etc.)', async ({ browser }, testInfo) => {
    requiresF3Composition(
      testInfo,
      'UI completa + offlineReady no subpath (F2c/F3); HTTP/SW/assets já verdes sem F3',
    );

    const distDir = RUNTIME_DIST;
    const server = await startSwitchableServer({ distDir });
    server.setRoot('dist');
    server.setSubpath(SUBPATH);

    const context = await browser.newContext({
      baseURL: `${server.origin}${SUBPATH}/`,
      serviceWorkers: 'allow',
    });
    const page = await context.newPage();

    try {
      await page.goto('./');
      await expect(homeHeading(page)).toBeVisible();
      const controller = await waitForServiceWorkerControl(page, 20_000);
      expect(controller).toContain(`${SUBPATH}/sw.js`);
      const caches = await listCacheNames(page);
      expect(caches.some((name) => name.includes('workbox-precache-v2-'))).toBe(true);
      await context.setOffline(true);
      const response = await page.reload();
      expect(response?.fromServiceWorker()).toBe(true);
      expect(await page.evaluate(() => navigator.onLine)).toBe(false);
      await expect(homeHeading(page)).toBeVisible();
      await selectLevel(page, 1);
      await openMode(page, 'numbers');
      await solveLevelOneNumbers(page);
    } finally {
      await context.close();
      await server.close();
    }
  });

  test('F2c composition: SW + precache no subpath (sem UI F3)', async ({ browser }) => {
    const distDir = F2C_SHA ? F2C_DIST : RUNTIME_DIST;
    const server = await startSwitchableServer({ distDir });
    server.setRoot('dist');
    server.setSubpath(SUBPATH);
    const context = await browser.newContext({
      baseURL: `${server.origin}${SUBPATH}/`,
      serviceWorkers: 'allow',
    });
    const page = await context.newPage();
    try {
      await page.goto('./');
      await expect(homeHeading(page)).toBeVisible();
      const controller = await waitForServiceWorkerControl(page, 20_000);
      expect(controller).toContain(`${SUBPATH}/sw.js`);
      await waitForWorkboxPrecache(page);
    } finally {
      await context.close();
      await server.close();
    }
  });

  test('[F3] card de montagem usa ilustração própria no HTML estático pré-hidratação e no subpath Pages', async ({
    browser,
  }, testInfo) => {
    requiresF3Composition(
      testInfo,
      'Template estático rm-card-assemble e asset emitido resolvido no subpath Pages',
    );

    const distDir = RUNTIME_DIST;
    const server = await startSwitchableServer({ distDir });
    server.setRoot('dist');
    server.setSubpath(SUBPATH);

    const subpathBase = `${server.origin}${SUBPATH}/`;
    const context = await browser.newContext({ baseURL: subpathBase });
    const page = await context.newPage();

    const extractTemplateImgSrc = (html: string, mode: 'assemble' | 'numbers'): string => {
      const tplMatch = html.match(
        new RegExp(`<template id="rm-card-${mode}">([\\s\\S]*?)<\\/template>`),
      );
      expect(tplMatch, `Template estático rm-card-${mode} deve existir no HTML`).toBeTruthy();

      const imgTags = tplMatch![1]!.match(/<img\b[^>]*>/g) ?? [];
      const modeImgTag = imgTags.find((tag) =>
        new RegExp(`data-mode-illustration=["']${mode}["']`).test(tag),
      );
      expect(
        modeImgTag,
        `Template rm-card-${mode} deve conter <img data-mode-illustration="${mode}">`,
      ).toBeTruthy();

      const srcMatch = modeImgTag!.match(/\bsrc=["']([^"']+)["']/);
      expect(srcMatch, `Imagem do template rm-card-${mode} deve ter src`).toBeTruthy();
      return srcMatch![1]!;
    };

    try {
      // 1. HTML estático bruto anterior à hidratação servido sob o subpath
      const indexRes = await fetch(subpathBase);
      expect(indexRes.status).toBe(200);
      const rawHtml = await indexRes.text();

      const assembleSrc = extractTemplateImgSrc(rawHtml, 'assemble');
      const numbersSrc = extractTemplateImgSrc(rawHtml, 'numbers');
      expect(assembleSrc).toMatch(/^\.\/assets\/mode-assemble-[^/"']+\.(?:webp|png)$/);
      expect(assembleSrc).not.toBe(numbersSrc);

      const resolvedAssembleUrl = new URL(assembleSrc, subpathBase);
      expect(resolvedAssembleUrl.pathname).toMatch(
        new RegExp(`^${SUBPATH}/assets/mode-assemble-[^/]+\\.(?:webp|png)$`),
      );
      expect(existsSync(path.join(distDir, assembleSrc.replace(/^\.\//, '')))).toBe(true);

      const assetRes = await fetch(resolvedAssembleUrl);
      expect(assetRes.status).toBe(200);
      expect(assetRes.headers.get('content-type') ?? '').toMatch(/^image\/(?:webp|png)/);
      expect((await assetRes.arrayBuffer()).byteLength).toBeGreaterThan(0);

      // 2. Navegador no subpath: template no DOM, hidratação e resolução HTTP
      const assembleResponsePromise = page.waitForResponse(
        (res) => new URL(res.url()).pathname === resolvedAssembleUrl.pathname,
        { timeout: 10_000 },
      );

      await page.goto('./');
      await expect(homeHeading(page)).toBeVisible();
      await expect(modeCard(page, 'assemble')).toBeVisible();

      const assembleResponse = await assembleResponsePromise;
      expect(assembleResponse.status()).toBe(200);

      await expect
        .poll(
          () =>
            page.evaluate(async () => {
              const assembleImg = document.querySelector(
                '[data-mode-card="assemble"] img[data-mode-illustration="assemble"]',
              ) as HTMLImageElement | null;
              const numbersImg = document.querySelector(
                '[data-mode-card="numbers"] img[data-mode-illustration="numbers"]',
              ) as HTMLImageElement | null;
              if (
                !assembleImg ||
                !numbersImg ||
                !assembleImg.complete ||
                assembleImg.naturalWidth <= 0 ||
                !assembleImg.currentSrc ||
                !numbersImg.currentSrc
              ) {
                return false;
              }
              await assembleImg.decode();
              return true;
            }),
          { timeout: 10_000 },
        )
        .toBe(true);

      const domSnapshot = await page.evaluate(() => {
        const tpl = document.getElementById('rm-card-assemble') as HTMLTemplateElement | null;
        const tplImg = tpl?.content.querySelector('img[data-mode-illustration="assemble"]');
        const assembleImg = document.querySelector(
          '[data-mode-card="assemble"] img[data-mode-illustration="assemble"]',
        ) as HTMLImageElement | null;
        const numbersImg = document.querySelector(
          '[data-mode-card="numbers"] img[data-mode-illustration="numbers"]',
        ) as HTMLImageElement | null;
        return {
          templateSrc: tplImg?.getAttribute('src') ?? null,
          cardAttrSrc: assembleImg?.getAttribute('src') ?? null,
          cardCurrentSrc: assembleImg?.currentSrc ?? null,
          numbersCurrentSrc: numbersImg?.currentSrc ?? null,
          complete: assembleImg?.complete ?? false,
          naturalWidth: assembleImg?.naturalWidth ?? 0,
        };
      });

      expect(domSnapshot.templateSrc).toBe(assembleSrc);
      expect(domSnapshot.cardAttrSrc).toBe(assembleSrc);
      expect(domSnapshot.cardCurrentSrc).toBe(resolvedAssembleUrl.toString());
      expect(domSnapshot.cardCurrentSrc).not.toBe(domSnapshot.numbersCurrentSrc);
      expect(domSnapshot.complete).toBe(true);
      expect(domSnapshot.naturalWidth).toBeGreaterThan(0);
    } finally {
      await context.close();
      await server.close();
    }
  });
});
