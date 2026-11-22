#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

// Compare immutable snapshots with the official build and size gate. The source
// worktree and its node_modules/dist are never modified by this measurement.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const refs = process.argv.slice(2);
if (!refs.length) throw new Error('Usage: node scripts/measure-build.mjs <commit> [<commit> ...]');
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const gitDir = git('rev-parse', '--absolute-git-dir');
const root = mkdtempSync(join(tmpdir(), 'relogio-measure-'));
const results = [];
console.log(`Logs and clean snapshots: ${root}`);

for (const [index, ref] of refs.entries()) {
  const sha = git('rev-parse', '--verify', `${ref}^{commit}`);
  const cwd = join(root, `${index}-${sha.slice(0, 8)}`);
  mkdirSync(cwd);
  const archive = execFileSync('git', ['archive', sha], { maxBuffer: 64 * 1024 * 1024 });
  execFileSync('tar', ['-x', '-C', cwd], { input: archive });
  // The Vite source-link check must resolve the measured SHA, not a new fake repo.
  writeFileSync(join(cwd, '.git'), `gitdir: ${gitDir}\n`);
  const env = { ...process.env, NODE_ENV: 'production', GITHUB_SHA: sha };
  let log = `commit=${sha}\nnode=${process.version}\nNODE_ENV=production\nGITHUB_SHA=${sha}\n`;
  let sizeGate = 1;
  for (const args of [['ci', '--include=dev'], ['run', 'build'], ['run', 'check:size']]) {
    const run = spawnSync('npm', args, { cwd, env, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    log += `\n$ npm ${args.join(' ')}\n${run.stdout ?? ''}${run.stderr ?? ''}\nexit=${run.status}\n`;
    writeFileSync(join(cwd, 'measurement.log'), log);
    if (run.error || (run.status !== 0 && args[1] !== 'check:size')) {
      throw new Error(`Build/install failed; see ${cwd}/measurement.log`, { cause: run.error });
    }
    if (args[1] === 'check:size') sizeGate = run.status;
  }
  const bytes = label => {
    const line = log.split('\n').find(line => line.includes(label) && /^\[(PASS|FAIL)\]/.test(line));
    const count = line?.match(/\((\d+) B\)/)?.[1];
    if (!count) throw new Error(`Official check did not report ${label}`);
    return Number(count);
  };
  results.push({ sha, jsGzipBytes: bytes('dist JS inicial'), precacheBytes: bytes('dist Precache total'), sizeGate });
  console.log(results.at(-1));
  writeFileSync(join(root, 'results.json'), JSON.stringify({ node: process.version, results }, null, 2));
}
console.log('Baseline budget failures are recorded as sizeGate=1; no limits or build inputs were changed.');
