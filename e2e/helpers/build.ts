// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { existsSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

import { F2C_DIST, F2C_WORKTREE, REPO_ROOT, RUNTIME_DIST } from './paths.ts';

function run(command: string, args: string[], cwd: string): void {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0' },
  });
  if (result.status !== 0) {
    throw new Error(
      `Command failed (${command} ${args.join(' ')}) in ${cwd}:\n${result.stdout ?? ''}\n${result.stderr ?? ''}`,
    );
  }
}

/** Garante `e2e/.runtime-dist` fresco a partir deste worktree (não usa dist alheio). */
export function ensureRuntimeDist(options: { readonly force?: boolean } = {}): string {
  const marker = path.join(RUNTIME_DIST, 'index.html');
  if (!options.force && existsSync(marker) && existsSync(path.join(RUNTIME_DIST, 'sw.js'))) {
    return RUNTIME_DIST;
  }
  if (existsSync(RUNTIME_DIST)) {
    rmSync(RUNTIME_DIST, { recursive: true, force: true });
  }
  run('npx', ['vite', 'build', '--outDir', 'e2e/.runtime-dist', '--emptyOutDir'], REPO_ROOT);
  if (!existsSync(marker)) {
    throw new Error(`runtime dist missing after build: ${marker}`);
  }
  return RUNTIME_DIST;
}

/**
 * Dist F2c (`21c1648`) para provas de precache/licenças.
 * Prefere o `dist/` já buildado no sibling; se ausente, builda lá.
 */
export function ensureF2cDist(): string {
  if (
    existsSync(path.join(F2C_DIST, 'THIRD_PARTY_LICENSES.txt')) &&
    existsSync(path.join(F2C_DIST, 'sw.js'))
  ) {
    return F2C_DIST;
  }
  if (!existsSync(F2C_WORKTREE)) {
    throw new Error(`F2c worktree ausente em ${F2C_WORKTREE}`);
  }
  run('npm', ['run', 'build'], F2C_WORKTREE);
  if (!existsSync(path.join(F2C_DIST, 'THIRD_PARTY_LICENSES.txt'))) {
    throw new Error('F2c build não produziu THIRD_PARTY_LICENSES.txt');
  }
  return F2C_DIST;
}
