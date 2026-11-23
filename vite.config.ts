// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright 2026 Luis Henrique Coutinho Beltrão
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { globSync, readFileSync } from 'node:fs';

import { basename } from 'node:path';
import { transform } from 'lightningcss';
import MagicString from 'magic-string';
import { staticContent } from './src/content/staticContent.ts';
import { EDUCATORS_CONTENT } from './src/content/educatorsArticle.ts';
import { reactStaticImports } from './build/reactStaticImports.ts';
const APP_COPY = staticContent.copy;

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};
let commit = process.env.GITHUB_SHA ?? '';
if (!commit) {
  try {
    commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    /* validated below */
  }
}
if (!/^[a-f0-9]{40}$/i.test(commit) || /^0+$/.test(commit))
  throw new Error('Build requires a real Git commit or GITHUB_SHA');
try {
  execFileSync('git', ['cat-file', '-e', `${commit}^{commit}`], { stdio: 'ignore' });
} catch {
  throw new Error('Build commit must exist in the Git object database');
}

const GLOBAL_KEYFRAMES: Readonly<Record<string, string>> = {
  'mascot-bounce': 'mascot-bounce',
  'mascot-bell-ring': 'mascot-bell-ring',
  'star-pop': 'star-pop',
  'colon-pulse': 'colon-pulse',
  'hint-glow': 'hint-glow',
};

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildStaticTemplates(resolveClass: (mod: string, local: string) => string): string {
  const td = (c: string) => resolveClass('TeachersDialog', c);
  const hs = (c: string) => resolveClass('HomeScreen', c);
  const tm = (c: string) => resolveClass('TicMascot', c);
  const es = (c: string) => resolveClass('ExploreScreen', c);
  const gs = (c: string) => resolveClass('GameScreen', c);
  const hb = (c: string) => resolveClass('HandBadge', c);

  const handBadgeHtml = (kind: string) =>
    `<svg viewBox="0 0 24 24" width="20" height="20" class="${hb('handBadge')}" aria-hidden="true" focusable="false" data-hand-badge="${kind}" data-size="inline"><g data-badge-layer="${kind}"><use href="./icons/sprite.svg#hb-${kind}"></use></g></svg>`;

  const educatorsHtml = [
    `<p class="${td('paragraph')}">${escapeHtml(EDUCATORS_CONTENT.intro)}</p>`,
    `<h3 id="rm-bncc-h" class="${td('sectionTitle')}">${escapeHtml(EDUCATORS_CONTENT.bnccHeading)}</h3>`,
    `<div class="${td('tableWrapper')}" role="region" aria-labelledby="rm-bncc-h">`,
    `<table class="${td('bnccTable')}" role="table"><thead><tr><th scope="col">Código</th><th scope="col">Resumo da habilidade</th><th scope="col">Onde aparece</th></tr></thead><tbody role="rowgroup">`,
    ...EDUCATORS_CONTENT.bnccSkills.map(
      (e) =>
        `<tr role="row" data-bncc-row="${e.code}"><th scope="row" role="rowheader">${e.code}</th><td role="cell">${escapeHtml(e.summary)}</td><td role="cell">${escapeHtml(e.where)}</td></tr>`,
    ),
    `</tbody></table></div>`,
    `<p class="${td('smallText')}">${escapeHtml(EDUCATORS_CONTENT.bnccDisclaimer)}</p>`,
    `<h3 class="${td('sectionTitle')}">${escapeHtml(EDUCATORS_CONTENT.levelsHeading)}</h3>`,
    `<ul class="${td('list')}">`,
    ...EDUCATORS_CONTENT.levels.map(
      (l) => `<li><strong>${escapeHtml(l.title)}:</strong> ${escapeHtml(l.description)}</li>`,
    ),
    `</ul>`,
    `<h3 class="${td('sectionTitle')}">${escapeHtml(EDUCATORS_CONTENT.modesHeading)}</h3>`,
    `<ul class="${td('list')}">`,
    ...EDUCATORS_CONTENT.modes.map(
      (m) => `<li><strong>${escapeHtml(m.title)}:</strong> ${escapeHtml(m.description)}</li>`,
    ),
    `</ul>`,
    `<h3 class="${td('sectionTitle')}">${escapeHtml(EDUCATORS_CONTENT.competenciesHeading)}</h3>`,
    `<p class="${td('paragraph')}">${escapeHtml(EDUCATORS_CONTENT.competencies)}</p>`,
    `<div class="${td('tagList')}" aria-hidden="true"><span class="${td('tagHour')}">azul + filete sólido = horas</span><span class="${td('tagMinute')}">vermelho + borda tracejada = minutos</span><span class="${td('tagPeriod')}">roxo + pílula = período do dia</span></div>`,
    `<h3 class="${td('sectionTitle')}">${escapeHtml(EDUCATORS_CONTENT.usageHeading)}</h3>`,
    `<ul class="${td('list')}">`,
    ...EDUCATORS_CONTENT.usageSuggestions.map((s) => `<li>${escapeHtml(s)}</li>`),
    `</ul>`,
  ].join('');

  const homeHeroHtml = [
    `<div class="${hs('mascotWrap')}">`,
    `<svg viewBox="0 0 120 120" width="96" height="96" class="${tm('mascot')}" aria-hidden="true" focusable="false" data-mascot="tic" data-mood="happy" data-size="md" data-mascot-ambient="day" data-motion="bounce"><g><g data-mascot-bells="true" data-motion="decorative" data-bell="left" fill="#ff8fab"><use data-bell="right" fill="#ff8fab" href="./icons/sprite.svg#tic-bells"></use></g><use href="./icons/sprite.svg#tic-body-day"></use><g class="${tm('clockHand')}"><use href="./icons/sprite.svg#tic-hand"></use></g><g data-mood-layer="happy"><g class="${tm('eyes')}"><use href="./icons/sprite.svg#tic-eyes-happy"></use></g><use href="./icons/sprite.svg#tic-face-happy"></use></g></g></svg>`,
    `</div>`,
    `<div class="${hs('titleBlock')}"><h1 id="rm-home-title" class="${hs('title')}">${escapeHtml(APP_COPY.home.title)}</h1><p class="${hs('subtitle')}">${escapeHtml(APP_COPY.home.subtitle)}</p></div>`,
  ].join('');

  const exploreFactsHtml = [
    `<ul class="${es('facts')}">`,
    `<li class="${es('factItem')}">${handBadgeHtml('hour-hand')}<span>${escapeHtml(APP_COPY.explore.facts[0])}</span></li>`,
    `<li class="${es('factItem')}">${handBadgeHtml('minute-hand')}<span>${escapeHtml(APP_COPY.explore.facts[1])}</span></li>`,
    `<li class="${es('factItem')}"><span class="${es('secondBadge')}" aria-hidden="true"><span class="${es('secondNeedle')}"></span></span><span>${escapeHtml(APP_COPY.explore.facts[2])}</span></li>`,
    `<li class="${es('factItem')}"><span class="${es('hourglassIcon')}" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke-linecap="round" stroke-linejoin="round" data-ui-icon="HourglassTime" aria-hidden="true"><use href="./icons/sprite.svg#ui-HourglassTime"></use></svg></span><span>${escapeHtml(APP_COPY.explore.facts[3])}</span></li>`,
    `</ul>`,
    `<p class="${es('dragTip')}">${escapeHtml(APP_COPY.explore.dragTip)}</p>`,
  ].join('');

  const handsLegendHtml = [
    `<span class="${gs('legendItem')}">${handBadgeHtml('hour-hand')}<span>pequeno = horas</span></span>`,
    `<span class="${gs('legendItem')}">${handBadgeHtml('minute-hand')}<span>grande = minutos</span></span>`,
  ].join('');

  const card = (local: string) => resolveClass('ModeCard', local);
  const modeIcons = {
    assemble: 'ClockHands',
    numbers: 'DigitalBlocks',
    words: 'PuzzleWords',
    hands: 'ClockHands',
    explore: 'CompassExplore',
  };
  const modeCards = staticContent.modesList
    .map((mode) => {
      const icon = modeIcons[mode.id];
      return `<template id="rm-card-${mode.id}"><div class="${card('illustrationWrap')}" aria-hidden="true"><img src="/src/assets/illustrations/mode-${mode.id}.webp" width="384" height="384" alt="" aria-hidden="true" loading="eager" decoding="async" class="${card('illustration')}" data-mode-illustration="${mode.id}"><span class="${card('modeBadge')}"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke-linecap="round" stroke-linejoin="round" data-ui-icon="${icon}" aria-hidden="true"><use href="./icons/sprite.svg#ui-${icon}"></use></svg></span></div><div class="${card('body')}"><span class="${card('title')}">${escapeHtml(mode.title)}</span><span class="${card('description')}">${escapeHtml(mode.description)}</span></div></template>`;
    })
    .join('');

  const jsonPayload = JSON.stringify(staticContent).replace(/</g, '\\u003c');

  return [
    modeCards,
    `<script id="rm-data" type="application/json">${jsonPayload}</script>`,
    `<template id="rm-tpl-educators">${educatorsHtml}</template>`,
    `<template id="rm-tpl-home-hero">${homeHeroHtml}</template>`,
    `<template id="rm-tpl-explore-facts">${exploreFactsHtml}</template>`,
    `<template id="rm-tpl-hands-legend">${handsLegendHtml}</template>`,
  ].join('');
}

// Allocate compact class names before JS minification. Keep CSS module scope
// at the compiler boundary so ordinary JS identifiers are never rewritten.
const classLookup = new Map<string, string>();
const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
for (const filename of globSync('src/**/*.module.css').sort()) {
  const module = basename(filename, '.module.css');
  const { exports } = transform({ filename, code: readFileSync(filename), cssModules: true });
  for (const local of Object.keys(exports ?? {}).sort()) {
    const index = classLookup.size;
    const short = alphabet[index % 52]! + Math.floor(index / 52).toString(36);
    classLookup.set(`${module}:${local}`, GLOBAL_KEYFRAMES[local] ?? short);
  }
}

function resolveClass(module: string, local: string): string {
  const name = classLookup.get(`${module}:${local}`);
  if (!name) throw new Error(`Unknown CSS module class ${module}.${local}`);
  return name;
}

function buildOptimizationPlugin(): Plugin {
  return {
    name: 'relogio-static-html',
    apply: 'build',
    enforce: 'pre',
    transform(source, id) {
      if (id.endsWith('.tsx')) {
        const match = /import styles from ('[^']+\.module\.css');/.exec(source);
        if (!match) return;
        const edited = new MagicString(source);
        edited.overwrite(match.index, match.index + match[0].length, `import * as styles from ${match[1]};`);
        return { code: edited.toString(), map: edited.generateMap({ source: id, hires: true, includeContent: true }) };
      }
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const injected = buildStaticTemplates(resolveClass);
        return html.replace('</body>', `${injected}</body>`);
      },
    },
  };
}

export default defineConfig(({ command }) => ({
  base: './',
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    target: 'baseline-widely-available',
    assetsInlineLimit: 0,
    cssMinify: 'lightningcss',
    // The single application chunk has no module dependencies to preload.
    modulePreload: { polyfill: false },
    rolldownOptions: { treeshake: { commonjs: true }, output: { codeSplitting: false } },
  },
  define: { __APP_VERSION__: JSON.stringify(pkg.version), __APP_COMMIT__: JSON.stringify(commit) },
  css: {
    modules:
      command !== 'build'
        ? {}
        : { generateScopedName: (local, file) => resolveClass(basename(file, '.module.css'), local) },
  },
  plugins: [
    reactStaticImports(),
    buildOptimizationPlugin(),
    {
      name: 'retain-component-css',
      enforce: 'post',
      apply: 'build',
      transform(code, id) {
        if (id.endsWith('.module.css')) return { code, moduleSideEffects: 'no-treeshake' };
      },
    },
    react(),
    VitePWA({
      strategies: 'generateSW',
      registerType: 'prompt',
      injectRegister: false,
      filename: 'sw.js',
      manifestFilename: 'manifest.webmanifest',
      manifest: {
        lang: 'pt-BR',
        description: 'Aprenda a ler as horas brincando com o Relógio Maluco.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        name: 'Relógio Maluco',
        short_name: 'Relógio Maluco',
        start_url: './',
        scope: './',
        display: 'standalone',
        theme_color: '#ffb703',
        background_color: '#ffffff',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,webp,woff2,png,svg,txt,webmanifest,md}'],
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        importScripts: ['sw-legacy-cleanup.js'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/\/LICENSE(\.txt)?$/, /\/THIRD_PARTY_LICENSES\.txt$/],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', 'legacy/**', 'e2e/**'],
  },
}));
