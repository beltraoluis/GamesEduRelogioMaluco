// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright 2026 Luis Henrique Coutinho Beltrão
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };
let commit = process.env.GITHUB_SHA ?? '';
if (!commit) {
  try { commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { /* validated below */ }
}
if (!/^[a-f0-9]{40}$/i.test(commit) || /^0+$/.test(commit)) throw new Error('Build requires a real Git commit or GITHUB_SHA');
try { execFileSync('git', ['cat-file', '-e', `${commit}^{commit}`], { stdio: 'ignore' }); }
catch { throw new Error('Build commit must exist in the Git object database'); }

const isTest = Boolean(process.env.VITEST);

function compactBuildPlugin(): Plugin {
  const virtualId = 'virtual:pwa-register';
  const resolvedId = `\0${virtualId}`;
  return {
    name: 'relogio-compact-build',
    apply: 'build',
    enforce: 'pre',
    resolveId(id) {
      if (id === virtualId) return resolvedId;
      return undefined;
    },
    load(id) {
      if (id !== resolvedId) return undefined;
      return `export function registerSW(o={}){if('serviceWorker'in navigator){const n=()=>o.onOfflineReady?.(),t=s=>s?.addEventListener('statechange',()=>{if(s.state==='activated')n()});navigator.serviceWorker.register('./sw.js',{scope:'./'}).then(r=>{if(r.active)n();t(r.installing);t(r.waiting);r.addEventListener('updatefound',()=>t(r.installing))}).catch(e=>o.onRegisterError?.(e))}return()=>Promise.resolve()}`;
    },
    generateBundle(_options, bundle) {
      const freq = new Map<string, number>();
      const tokenRe = /\bcm_[a-zA-Z0-9_-]+/g;
      for (const item of Object.values(bundle)) {
        const text = item.type === 'chunk' ? item.code : typeof item.source === 'string' ? item.source : '';
        for (const m of text.matchAll(tokenRe)) {
          freq.set(m[0], (freq.get(m[0]) ?? 0) + 1);
        }
      }
      const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const tail = `${chars}0123456789_`;
      const map = new Map<string, string>();
      sorted.forEach(([token], i) => {
        const c0 = chars[i % chars.length]!;
        const n = Math.floor(i / chars.length);
        const short = n === 0 ? `_${c0}` : `${c0}${tail[n - 1]!}`;
        map.set(token, short);
      });
      for (const item of Object.values(bundle)) {
        if (item.type === 'chunk') {
          item.code = item.code.replace(tokenRe, (t) => map.get(t) ?? t);
        } else if (typeof item.source === 'string' && item.fileName.endsWith('.css')) {
          item.source = item.source.replace(tokenRe, (t) => map.get(t) ?? t);
        }
      }
    },
  };
}

export default defineConfig({
  base: './',
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    target: 'baseline-widely-available',
    assetsInlineLimit: 0,
    // The single application chunk has no module dependencies to preload.
    modulePreload: { polyfill: false },
    rolldownOptions: { output: { codeSplitting: false } },
  },
  define: { __APP_VERSION__: JSON.stringify(pkg.version), __APP_COMMIT__: JSON.stringify(commit) },
  css: {
    transformer: 'lightningcss',
    lightningcss: { cssModules: isTest ? {} : { pattern: 'cm_[hash]_[local]' } },
  },
  plugins: [compactBuildPlugin(), react(), VitePWA({ strategies: 'generateSW', registerType: 'prompt', injectRegister: false, filename: 'sw.js', manifestFilename: 'manifest.webmanifest', manifest: { lang: 'pt-BR', description: 'Aprenda a ler as horas brincando com o Relógio Maluco.', icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }, { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }], name: 'Relógio Maluco', short_name: 'Relógio Maluco', start_url: './', scope: './', display: 'standalone', theme_color: '#ffb703', background_color: '#ffffff' }, workbox: { globPatterns: ['**/*.{js,css,html,webp,woff2,png,svg,txt,webmanifest,md}'], skipWaiting: true, clientsClaim: true, cleanupOutdatedCaches: true, importScripts: ['sw-legacy-cleanup.js'], navigateFallback: 'index.html', navigateFallbackDenylist: [/\/LICENSE(\.txt)?$/, /\/THIRD_PARTY_LICENSES\.txt$/] } })],
  test: { globals: true, environment: 'jsdom', setupFiles: ['src/test/setup.ts'], exclude: ['**/node_modules/**', '**/dist/**', 'legacy/**', 'e2e/**'] },
});
