// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright 2026 Luis Henrique Coutinho Beltrão
import { defineConfig } from 'vitest/config';
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
export default defineConfig({
  base: './',
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: { target: 'baseline-widely-available', rolldownOptions: { output: { codeSplitting: false } } },
  define: { __APP_VERSION__: JSON.stringify(pkg.version), __APP_COMMIT__: JSON.stringify(commit) },
  css: { transformer: 'lightningcss', lightningcss: { cssModules: {} } },
  plugins: [react(), VitePWA({ strategies: 'generateSW', registerType: 'prompt', injectRegister: false, filename: 'sw.js', manifestFilename: 'manifest.webmanifest', manifest: { lang: 'pt-BR', description: 'Aprenda a ler as horas brincando com o Relógio Maluco.', icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }, { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }], name: 'Relógio Maluco', short_name: 'Relógio Maluco', start_url: './', scope: './', display: 'standalone', theme_color: '#ffb703', background_color: '#ffffff' }, workbox: { globPatterns: ['**/*.{js,css,html,webp,woff2,png,svg,txt,webmanifest,md}'], skipWaiting: true, clientsClaim: true, cleanupOutdatedCaches: true, importScripts: ['sw-legacy-cleanup.js'], navigateFallback: 'index.html', navigateFallbackDenylist: [/\/LICENSE(\.txt)?$/, /\/THIRD_PARTY_LICENSES\.txt$/] } })],
  test: { globals: true, environment: 'jsdom', setupFiles: ['src/test/setup.ts'], exclude: ['**/node_modules/**', '**/dist/**', 'legacy/**', 'e2e/**'] },
});
