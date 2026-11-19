#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const ROOT_DIR = fileURLToPath(new URL('..', import.meta.url));

const KB = 1024;
const LIMITS = {
  webpSingleMax: 28 * KB,
  webpTotalMax: 110 * KB,
  woff2TotalMax: 45 * KB,
  distJsGzipMax: 90 * KB,
  distCssGzipMax: 15 * KB,
  distImagesMax: 250 * KB,
  distPrecacheMax: 700 * KB,
};

const EXPECTED_WEBP_FILES = [
  'mode-numbers.webp',
  'mode-words.webp',
  'mode-hands.webp',
  'mode-explore.webp',
];

function formatKB(bytes) {
  return `${(bytes / KB).toFixed(2)} KB (${bytes} B)`;
}

function collectFiles(dirPath, acc = []) {
  const entries = readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, acc);
    } else if (entry.isFile()) {
      acc.push(fullPath);
    }
  }
  return acc;
}

function main() {
  const errors = [];

  // 1. Validar os 4 arquivos .webp em src/assets/illustrations/
  const illustrationsDir = join(ROOT_DIR, 'src/assets/illustrations');
  let webpTotalBytes = 0;

  for (const fileName of EXPECTED_WEBP_FILES) {
    const fullPath = join(illustrationsDir, fileName);
    const stat = statSync(fullPath, { throwIfNoEntry: false });
    if (!stat?.isFile()) {
      errors.push(`Ilustracao ausente: src/assets/illustrations/${fileName}`);
      continue;
    }
    const buf = readFileSync(fullPath);
    const isWebp =
      buf.length >= 12 &&
      buf.toString('ascii', 0, 4) === 'RIFF' &&
      buf.toString('ascii', 8, 12) === 'WEBP';
    if (!isWebp) {
      errors.push(`Arquivo nao e WebP valido: src/assets/illustrations/${fileName}`);
    }
    webpTotalBytes += stat.size;
    const ok = stat.size <= LIMITS.webpSingleMax;
    console.log(
      `[${ok ? 'PASS' : 'FAIL'}] WebP ${fileName}: ${formatKB(stat.size)} (limite <= ${formatKB(LIMITS.webpSingleMax)})`,
    );
    if (!ok) {
      errors.push(`WebP ${fileName} excede 28 KB: ${formatKB(stat.size)}`);
    }
  }

  const webpTotalOk = webpTotalBytes <= LIMITS.webpTotalMax;
  console.log(
    `[${webpTotalOk ? 'PASS' : 'FAIL'}] Soma dos 4 WebPs: ${formatKB(webpTotalBytes)} (limite <= ${formatKB(LIMITS.webpTotalMax)})`,
  );
  if (!webpTotalOk) {
    errors.push(`Soma dos 4 WebPs excede 110 KB: ${formatKB(webpTotalBytes)}`);
  }

  // 2. Validar fonte .woff2 e licenca OFL.txt em src/assets/fonts/
  const fontsDir = join(ROOT_DIR, 'src/assets/fonts');
  const fontsDirStat = statSync(fontsDir, { throwIfNoEntry: false });
  if (!fontsDirStat?.isDirectory()) {
    errors.push('Diretorio src/assets/fonts/ ausente.');
  } else {
    const oflStat = statSync(join(fontsDir, 'OFL.txt'), { throwIfNoEntry: false });
    if (!oflStat?.isFile()) {
      errors.push('Arquivo de licenca src/assets/fonts/OFL.txt ausente.');
    }

    const fontFiles = readdirSync(fontsDir).filter((f) => f.endsWith('.woff2'));
    if (fontFiles.length === 0) {
      errors.push('Nenhum arquivo .woff2 encontrado em src/assets/fonts/.');
    }

    let woff2TotalBytes = 0;
    for (const fileName of fontFiles) {
      const fullPath = join(fontsDir, fileName);
      const buf = readFileSync(fullPath);
      if (buf.length < 4 || buf.toString('ascii', 0, 4) !== 'wOF2') {
        errors.push(`Fonte nao possui assinatura wOF2 valida: src/assets/fonts/${fileName}`);
      }
      woff2TotalBytes += buf.length;
      console.log(
        `[INFO] Fonte src/assets/fonts/${fileName}: ${formatKB(buf.length)}`,
      );
    }

    const woff2Ok = woff2TotalBytes > 0 && woff2TotalBytes <= LIMITS.woff2TotalMax;
    console.log(
      `[${woff2Ok ? 'PASS' : 'FAIL'}] Total fontes .woff2: ${formatKB(woff2TotalBytes)} (limite <= ${formatKB(LIMITS.woff2TotalMax)})`,
    );
    if (!woff2Ok) {
      errors.push(`Fontes .woff2 excedem 45 KB: ${formatKB(woff2TotalBytes)}`);
    }
  }

  // 3. Quando dist/ existir, validar orcamentos de bundle e precache
  const distDir = join(ROOT_DIR, 'dist');
  if (statSync(distDir, { throwIfNoEntry: false })?.isDirectory()) {
    const distFiles = collectFiles(distDir);
    let jsGzipBytes = 0;
    let cssGzipBytes = 0;
    let imagesBytes = 0;
    let precacheBytes = 0;

    const imageExts = new Set(['.webp', '.png', '.svg', '.jpg', '.jpeg', '.ico']);

    for (const filePath of distFiles) {
      const rel = relative(distDir, filePath).replaceAll('\\', '/');
      if (rel.endsWith('.map')) {
        continue;
      }
      const buf = readFileSync(filePath);
      const ext = extname(filePath).toLowerCase();

      precacheBytes += buf.length;

      if (ext === '.js' && !rel.startsWith('sw') && !rel.startsWith('workbox-')) {
        jsGzipBytes += gzipSync(buf).length;
      } else if (ext === '.css') {
        cssGzipBytes += gzipSync(buf).length;
      } else if (imageExts.has(ext)) {
        imagesBytes += buf.length;
      }
    }

    const checks = [
      ['dist JS inicial (gzip)', jsGzipBytes, LIMITS.distJsGzipMax],
      ['dist CSS (gzip)', cssGzipBytes, LIMITS.distCssGzipMax],
      ['dist Imagens/Icones', imagesBytes, LIMITS.distImagesMax],
      ['dist Precache total', precacheBytes, LIMITS.distPrecacheMax],
    ];

    for (const [label, actual, limit] of checks) {
      const ok = actual <= limit;
      console.log(
        `[${ok ? 'PASS' : 'FAIL'}] ${label}: ${formatKB(actual)} (limite <= ${formatKB(limit)})`,
      );
      if (!ok) {
        errors.push(`${label} excede limite: ${formatKB(actual)} > ${formatKB(limit)}`);
      }
    }
  } else {
    console.log('[INFO] dist/ nao presente; validacao de assets de codigo-fonte concluida.');
  }

  if (errors.length > 0) {
    console.error(`[check-size] FALHA: ${errors.length} erro(s) de orcamento encontrado(s):`);
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log('[check-size] OK: todos os orcamentos de tamanho respeitados.');
}

main();
