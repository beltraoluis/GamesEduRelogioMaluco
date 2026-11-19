// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright 2026 Luis Henrique Coutinho Beltrão
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };
let commit = 'unknown';
try { commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { /* Build remains usable outside Git. */ }
export default defineConfig({
  base: './',
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: { target: 'baseline-widely-available' },
  define: { __APP_VERSION__: JSON.stringify(pkg.version), __APP_COMMIT__: JSON.stringify(commit) },
  css: { transformer: 'lightningcss', lightningcss: { cssModules: {} } },
  plugins: [react(), VitePWA({ strategies: 'generateSW', registerType: 'prompt', injectRegister: false, filename: 'sw.js', manifestFilename: 'manifest.webmanifest', manifest: { name: 'Relógio Maluco', short_name: 'Relógio Maluco', start_url: './', scope: './', display: 'standalone', theme_color: '#ffb703', background_color: '#ffffff' }, workbox: { skipWaiting: true, clientsClaim: true, cleanupOutdatedCaches: true, importScripts: ['sw-legacy-cleanup.js'], navigateFallback: 'index.html', navigateFallbackDenylist: [/\/LICENSE(\.txt)?$/, /\/THIRD_PARTY_LICENSES\.txt$/] } })],
  test: { globals: true, environment: 'jsdom', setupFiles: ['src/test/setup.ts'], exclude: ['**/node_modules/**', '**/dist/**', 'legacy/**', 'e2e/**'] },
});
