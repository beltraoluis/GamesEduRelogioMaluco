#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
// Run after `npm run build -- --sourcemap`. Diagnostic attribution only: the
// official acceptance gates remain check:size and a clean build without maps.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';
import { decode } from '@jridgewell/sourcemap-codec';

const root = process.argv[2] ?? 'dist';
function collect(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? collect(path) : [path];
  });
}
const paths = collect(root);
const files = paths.filter(path => !path.endsWith('.map')).map(path => {
  const bytes = readFileSync(path);
  return { file: relative(root, path), bytes: bytes.length, gzip: gzipSync(bytes).length };
}).sort((a, b) => b.bytes - a.bytes);
const modules = new Map();
for (const path of paths.filter(path => path.endsWith('.js.map') && !/^(sw|workbox-)/.test(relative(root, path)))) {
  const map = JSON.parse(readFileSync(path, 'utf8'));
  const lines = readFileSync(path.slice(0, -4), 'utf8').split('\n');
  decode(map.mappings).forEach((segments, line) => {
    segments.forEach((segment, index) => {
      if (segment.length < 4) return;
      const source = map.sources[segment[1]];
      const parts = modules.get(source) ?? [];
      parts.push(lines[line].slice(segment[0], segments[index + 1]?.[0] ?? lines[line].length));
      modules.set(source, parts);
    });
  });
}
if (!modules.size) throw new Error('No application sourcemap found; build with --sourcemap first.');
console.log(JSON.stringify({
  note: 'Mapped minified spans. Per-module gzip sizes are NOT additive; use check:size for budgets.',
  files,
  modules: [...modules].map(([source, parts]) => {
    const code = parts.join('');
    return { source, bytes: Buffer.byteLength(code), gzip: gzipSync(code).length };
  }).sort((a, b) => b.bytes - a.bytes),
}, null, 2));
