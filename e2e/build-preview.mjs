// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { build, preview } from 'vite';

const port = Number(process.env.E2E_PORT ?? 4177);
const host = '127.0.0.1';
const output = path.resolve('e2e/.runtime-dist', String(port));
const local = path.join(output, 'local');
const f2c = path.join(output, 'f2c');
const sha = process.env.E2E_F2C_SHA;

// Reserve the port before generating any artifacts. Playwright waits for this
// process's readiness signal, even if an unrelated service answers HTTP.
await preview({ build: { outDir: local }, preview: { host, port, strictPort: true } });

execFileSync('npm', ['run', 'build', '--', '--outDir', local, '--emptyOutDir'], { stdio: 'inherit' });
// Separate test-only entry, built through the same production config. It is
// generated after the application's SW manifest, never shipped or counted as
// an application asset. This exercises Activity and export liveness in the
// actual optimized runtime, in addition to the source-level Vitest coverage.
const probe = path.join(local, 'react-probe');
await build({ publicDir: false, build: { outDir: probe, emptyOutDir: true,
  rolldownOptions: { input: path.resolve('e2e/fixtures/react-runtime/probe.tsx'), output: { entryFileNames: 'probe.js' } },
} });
const payload = readFileSync(path.join(local, 'index.html'), 'utf8').match(/<script id="rm-data"[\s\S]*?<\/script>/)?.[0];
if (!payload) throw new Error('Production content payload missing');
writeFileSync(path.join(probe, 'index.html'), `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>React runtime probe</title><div id="root"></div>${payload}<script type="module" src="./probe.js"></script></html>`);
rmSync(f2c, { recursive: true, force: true });
if (sha) {
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('E2E_F2C_SHA exige um SHA completo');
  const checkout = mkdtempSync(path.join(tmpdir(), 'relogio-f2c-'));
  try {
    execFileSync('git', ['clone', '--shared', '--no-checkout', '.', checkout], { stdio: 'inherit' });
    execFileSync('git', ['checkout', '--detach', sha], { cwd: checkout, stdio: 'inherit' });
    execFileSync('npm', ['ci', '--include=dev'], { cwd: checkout, stdio: 'inherit' });
    execFileSync('npm', ['run', 'build', '--', '--outDir', f2c, '--emptyOutDir'], {
      cwd: checkout,
      env: { ...process.env, GITHUB_SHA: sha },
      stdio: 'inherit',
    });
  } finally {
    rmSync(checkout, { recursive: true, force: true });
  }
}
console.log('F2D_PREVIEW_READY');
