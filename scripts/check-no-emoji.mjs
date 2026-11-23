#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = fileURLToPath(new URL('..', import.meta.url));

const TEXT_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.css',
  '.html',
  '.json',
  '.svg',
  '.md',
]);

const EXCLUDED_PREFIXES = [
  'legacy/',
  'src/domain/__tests__/fixtures/',
  'node_modules/',
  'dist/',
];

/**
 * Detecta emojis/pictogramas Unicode, seletores de variação (U+FE0E/U+FE0F),
 * sequências ZWJ (U+200D), keycap (U+20E3) e glifos crus de UI (★☆✔✕➜‹›▾← e blocos de setas/dingbats).
 * Permite tipografia pt-BR: “ ” (U+201C/U+201D), … (U+2026), · (U+00B7), – (U+2013), — (U+2014), º (U+00BA), ª (U+00AA).
 */
const FORBIDDEN_RE =
  /[\p{Extended_Pictographic}\u{FE0E}\u{FE0F}\u{200D}\u{20E3}\u{2039}\u{203A}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{2460}-\u{24FF}\u{2500}-\u{27BF}\u{2B00}-\u{2BFF}]/gu;

function isExcluded(relPath) {
  const normalized = relPath.replaceAll('\\', '/');
  return EXCLUDED_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function collectFiles(dirPath, acc = []) {
  const entries = readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);
    const relPath = relative(ROOT_DIR, fullPath).replaceAll('\\', '/');
    if (isExcluded(relPath)) {
      continue;
    }
    if (entry.isDirectory()) {
      collectFiles(fullPath, acc);
    } else if (entry.isFile() && TEXT_EXTENSIONS.has(extname(entry.name))) {
      acc.push(fullPath);
    }
  }
  return acc;
}

function scanFile(filePath) {
  const relPath = relative(ROOT_DIR, filePath).replaceAll('\\', '/');
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/u);
  const violations = [];

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx] ?? '';
    for (const match of line.matchAll(FORBIDDEN_RE)) {
      const glyph = match[0];
      const codePoint = glyph.codePointAt(0);
      const hex = codePoint !== undefined ? codePoint.toString(16).toUpperCase().padStart(4, '0') : '????';
      const column = (match.index ?? 0) + 1;
      violations.push({
        file: relPath,
        line: lineIdx + 1,
        column,
        glyph,
        codePoint: `U+${hex}`,
      });
    }
  }

  return violations;
}

function main() {
  const filesToScan = [];
  const indexHtmlPath = join(ROOT_DIR, 'index.html');
  if (statSync(indexHtmlPath, { throwIfNoEntry: false })?.isFile()) {
    filesToScan.push(indexHtmlPath);
  }
  const srcPath = join(ROOT_DIR, 'src');
  if (statSync(srcPath, { throwIfNoEntry: false })?.isDirectory()) {
    collectFiles(srcPath, filesToScan);
  }

  const allViolations = [];
  for (const file of filesToScan) {
    allViolations.push(...scanFile(file));
  }

  if (allViolations.length > 0) {
    console.error(`[check-no-emoji] FALHA: ${allViolations.length} glifo(s)/emoji(s) proibido(s) encontrado(s):`);
    for (const v of allViolations) {
      console.error(`  - ${v.file}:${v.line}:${v.column} -> "${v.glyph}" (${v.codePoint})`);
    }
    process.exit(1);
  }

  console.log(
    `[check-no-emoji] OK: ${filesToScan.length} arquivo(s) verificado(s) em src/ e index.html (0 emojis ou glifos proibidos).`,
  );
}

main();
