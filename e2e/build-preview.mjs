// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { preview } from 'vite';

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
