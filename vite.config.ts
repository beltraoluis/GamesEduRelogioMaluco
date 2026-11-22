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

const REACT_ESM_FILES: Readonly<Record<string, string>> = {
  react: './node_modules/react/cjs/react.production.js',
  'react/jsx-runtime': './node_modules/react/cjs/react-jsx-runtime.production.js',
  'react-dom': './node_modules/react-dom/cjs/react-dom.production.js',
  'react-dom/client': './node_modules/react-dom/cjs/react-dom-client.production.js',
  scheduler: './node_modules/scheduler/cjs/scheduler.production.js',
};

function cjsReactToEsm(id: string, raw: string): string {
  let code = raw.replace(/^"use strict";/m, '');
  if (id === 'react') {
    code = code
      .replace('Component.prototype.isReactComponent = {};', 'function _initComp() { Component.prototype.isReactComponent = {};')
      .replace('pureComponentPrototype.isPureReactComponent = !0;', 'pureComponentPrototype.isPureReactComponent = !0; }');
  } else if (id === 'scheduler') {
    code = code
      .replace(/^exports\.unstable_now\s*=\s*void 0;/m, 'export var unstable_now = void 0;')
      .replace(/\bexports\.unstable_now\s*=/g, 'unstable_now =')
      .replace(/\bexports\.unstable_now\(/g, 'unstable_now(');
  } else if (id === 'react-dom') {
    code = code.replace(/^var React = require\("react"\);/m, 'import * as React from "react";');
  } else if (id === 'react-dom/client') {
    code = code
      .replace(
        /^var Scheduler = require\("scheduler"\),\s*React = require\("react"\),\s*ReactDOM = require\("react-dom"\);/m,
        'import * as Scheduler from "scheduler";\nimport * as React from "react";\nimport * as ReactDOM from "react-dom";',
      )
      .replace('log$1 = Scheduler.log,', 'log$1 = void 0,')
      .replace('unstable_setDisableYieldValue = Scheduler.unstable_setDisableYieldValue,', 'unstable_setDisableYieldValue = void 0,')
      .replace(
        'ReactDOMSharedInternals.d = {',
        'export const _dom_d = {',
      )
      .replace(
        'ReactDOMSharedInternals.findDOMNode = function (componentOrElement) {',
        'export const _findDOMNode = function (componentOrElement) {',
      )
      .replace(
        /ReactDOMHydrationRoot\.prototype\.render\s*=\s*ReactDOMRoot\.prototype\.render\s*=/,
        'ReactDOMRoot.prototype.render =',
      )
      .replace(
        /ReactDOMHydrationRoot\.prototype\.unmount\s*=\s*ReactDOMRoot\.prototype\.unmount\s*=/,
        'ReactDOMRoot.prototype.unmount =',
      )
      .replace(
        /function ReactDOMHydrationRoot\(internalRoot\)\s*\{\s*this\._internalRoot\s*=\s*internalRoot;\s*\}\s*ReactDOMHydrationRoot\.prototype\.unstable_scheduleHydration\s*=\s*function\s*\(target\)\s*\{[\s\S]*?attemptExplicitHydrationTarget\(target\);\s*\}\s*\};/,
        `function ReactDOMHydrationRoot(internalRoot) {
  this._internalRoot = internalRoot;
  this.render = ReactDOMRoot.prototype.render;
  this.unmount = ReactDOMRoot.prototype.unmount;
  this.unstable_scheduleHydration = function (target) {
    if (target) {
      var updatePriority = resolveUpdatePriority();
      target = { blockedOn: null, target: target, priority: updatePriority };
      for (
        var i = 0;
        i < queuedExplicitHydrationTargets.length &&
        0 !== updatePriority &&
        updatePriority < queuedExplicitHydrationTargets[i].priority;
        i++
      );
      queuedExplicitHydrationTargets.splice(i, 0, target);
      0 === i && attemptExplicitHydrationTarget(target);
    }
  };
}`,
      );
  }
  const exported: string[] = [];
  code = code.replace(/^exports\.([a-zA-Z0-9_$]+)\s*=/gm, (_m, name: string) => {
    exported.push(name);
    return `const _exp_${name} =`;
  });
  code += `\nexport { ${exported.map((n) => `_exp_${n} as ${n}`).join(', ')} };\n`;
  return code;
}

function compactBuildPlugin(): Plugin {
  const virtualId = 'virtual:pwa-register';
  const resolvedId = `\0${virtualId}`;
  const reactPrefix = '\0react-esm:';
  return {
    name: 'relogio-compact-build',
    apply: 'build',
    enforce: 'pre',
    resolveId(id) {
      if (id === virtualId) return resolvedId;
      if (id in REACT_ESM_FILES) return { id: `${reactPrefix}${id}`, moduleSideEffects: id === 'react-dom/client' };
      return undefined;
    },
    load(id) {
      if (id === resolvedId) {
        return `export function registerSW(o={}){if('serviceWorker'in navigator){const n=()=>o.onOfflineReady?.(),t=s=>s?.addEventListener('statechange',()=>{if(s.state==='activated')n()});navigator.serviceWorker.register('./sw.js',{scope:'./'}).then(r=>{if(r.active)n();t(r.installing);t(r.waiting);r.addEventListener('updatefound',()=>t(r.installing))}).catch(e=>o.onRegisterError?.(e))}return()=>Promise.resolve()}`;
      }
      if (id.startsWith(reactPrefix)) {
        const pkgId = id.slice(reactPrefix.length);
        const relPath = REACT_ESM_FILES[pkgId];
        if (!relPath) return undefined;
        const raw = readFileSync(new URL(relPath, import.meta.url), 'utf8');
        return cjsReactToEsm(pkgId, raw);
      }
      return undefined;
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
      const dynamicKeys = new Set([
        'sm', 'md', 'lg', 'inline', 'primary', 'soft', 'go', 'icon', 'ghost',
        'numbers', 'words', 'hands', 'explore', 'perfect', 'completed', 'current', 'pending',
        'neutral', 'positive', 'corrective',
      ]);
      const fiberProps = [
        '__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE',
        '__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE',
        'memoizedState', 'memoizedProps', 'stateNode', 'updateQueue', 'pendingProps',
        'subtreeFlags', 'containerInfo', '_fragmentFiber', 'childLanes', 'pendingLanes',
        'suspendedLanes', 'pingedLanes', 'expiredLanes', 'entangledLanes', 'entanglements',
        'finishedWork', 'finishedLanes', 'callbackNode', 'callbackPriority', 'cancelPendingCommit',
        'expirationTimes', 'eventTimes', 'alternate', 'sibling', 'dehydrated', 'dependencies',
        'deletions', 'baseState', 'baseQueue', 'firstBaseUpdate', 'lastBaseUpdate',
        'lastRenderedReducer', 'lastRenderedState', 'isReactComponent', 'isPureReactComponent',
        'cachePool', '_currentValue', '_visibility', 'elementType', '$$typeof',
        '_eventListeners', '__reactViewTransition', '_internalRoot', '_observers',
        'hoistableStyles', 'hoistableScripts', 'interleaved', 'firstContext', 'memoizedValue',
      ];
      for (const item of Object.values(bundle)) {
        if (item.type === 'chunk') {
          let code = item.code.replace(tokenRe, (t) => map.get(t) ?? t);
          fiberProps.forEach((prop, idx) => {
            code = code.replace(new RegExp(`\\b${prop}\\b`, 'g'), `_$${idx.toString(36)}`);
          });
          const cssObjRe = /\b([a-zA-Z0-9_$]+)=\{((?:[a-zA-Z0-9_$-]+|"[^"]+"):\`[a-zA-Z_][a-zA-Z0-9_]\`(?:,(?:[a-zA-Z0-9_$-]+|"[^"]+"):\`[a-zA-Z_][a-zA-Z0-9_]\`)*)\}/g;
          const objMaps = new Map<string, { full: string; propMap: Map<string, string> }>();
          for (const m of code.matchAll(cssObjRe)) {
            const varName = m[1]!;
            const body = m[2]!;
            const propMap = new Map<string, string>();
            for (const pm of body.matchAll(/([a-zA-Z0-9_$-]+|"[^"]+"):\`([a-zA-Z_][a-zA-Z0-9_])\`/g)) {
              propMap.set(pm[1]!.replace(/^"|"$/g, ''), pm[2]!);
            }
            objMaps.set(varName, { full: m[0], propMap });
          }
          for (const [varName, { full, propMap }] of objMaps) {
            for (const [k, v] of propMap) {
              if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k)) {
                code = code.replace(new RegExp(`\\b${varName.replace(/\$/g, '\\$')}\\.${k}\\b`, 'g'), `\`${v}\``);
              }
            }
            const kept = [...propMap.entries()].filter(([k]) => dynamicKeys.has(k)).map(([k, v]) => `${k}:\`${v}\``);
            code = code.replace(full, `${varName}={${kept.join(',')}}`);
          }
          item.code = code;
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
