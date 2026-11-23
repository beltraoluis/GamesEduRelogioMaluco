#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = fileURLToPath(new URL('..', import.meta.url));
const TOKENS_CSS_PATH = join(ROOT_DIR, 'src/styles/tokens.css');

function parseHexToRgb(hex) {
  const clean = hex.trim().replace(/^#/u, '');
  if (clean.length === 3) {
    const r = Number.parseInt((clean[0] ?? '0') + (clean[0] ?? '0'), 16);
    const g = Number.parseInt((clean[1] ?? '0') + (clean[1] ?? '0'), 16);
    const b = Number.parseInt((clean[2] ?? '0') + (clean[2] ?? '0'), 16);
    return [r, g, b];
  }
  if (clean.length === 6) {
    const r = Number.parseInt(clean.slice(0, 2), 16);
    const g = Number.parseInt(clean.slice(2, 4), 16);
    const b = Number.parseInt(clean.slice(4, 6), 16);
    return [r, g, b];
  }
  throw new Error(`Hex inválido: ${hex}`);
}

function relativeLuminance(hex) {
  const [r8, g8, b8] = parseHexToRgb(hex);
  const toLinear = (c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const r = toLinear(r8);
  const g = toLinear(g8);
  const b = toLinear(b8);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hexA, hexB) {
  const lumA = relativeLuminance(hexA);
  const lumB = relativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

function extractVariables(blockText) {
  const vars = new Map();
  const re = /(--[a-z0-9-]+)\s*:\s*([^;]+);/giu;
  for (const match of blockText.matchAll(re)) {
    const name = match[1]?.trim();
    const value = match[2]?.trim();
    if (name && value) {
      vars.set(name, value);
    }
  }
  return vars;
}

function parseTokensCss(cssContent) {
  const rootMatch = cssContent.match(/:root\s*\{([\s\S]*?)\}/u);
  if (!rootMatch?.[1]) {
    throw new Error('Bloco :root não encontrado em src/styles/tokens.css');
  }
  const rootVars = extractVariables(rootMatch[1]);

  const atmospheres = new Map();
  const atmoNames = ['madrugada', 'manha', 'tarde', 'noite'];
  for (const name of atmoNames) {
    const atmoRe = new RegExp(
      `\\[data-atmosphere=['"]${name}['"]\\][^{]*\\{([\\s\\S]*?)\\}`,
      'u',
    );
    const match = cssContent.match(atmoRe);
    if (!match?.[1]) {
      throw new Error(`Bloco [data-atmosphere="${name}"] não encontrado em src/styles/tokens.css`);
    }
    atmospheres.set(name, extractVariables(match[1]));
  }

  return { rootVars, atmospheres };
}

function requireHex(vars, tokenName) {
  const val = vars.get(tokenName);
  if (!val) {
    throw new Error(`Token obrigatório ausente: ${tokenName}`);
  }
  const hexMatch = val.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/u);
  if (!hexMatch?.[0]) {
    throw new Error(`Token ${tokenName} não contém cor hex válida: ${val}`);
  }
  return hexMatch[0].toLowerCase();
}

function extractAllHexStops(value) {
  const matches = value.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/gu);
  if (!matches || matches.length === 0) {
    throw new Error(`Nenhuma parada hex encontrada em: ${value}`);
  }
  return matches.map((h) => h.toLowerCase());
}

function main() {
  const cssContent = readFileSync(TOKENS_CSS_PATH, 'utf8');
  const { rootVars, atmospheres } = parseTokensCss(cssContent);

  const surfaceCard = requireHex(rootVars, '--color-surface-card');
  const surfaceDial = requireHex(rootVars, '--color-surface-dial');
  const surfaceElevated = requireHex(rootVars, '--color-surface-elevated');
  const visorBg = requireHex(rootVars, '--color-visor-bg');
  const visorBezel = requireHex(rootVars, '--color-visor-bezel');

  const checks = [];
  const addCheck = (label, fgHex, bgHex, minRatio) => {
    const ratio = contrastRatio(fgHex, bgHex);
    checks.push({
      label,
      fgHex,
      bgHex,
      ratio,
      minRatio,
      passed: ratio >= minRatio,
    });
  };

  // 1. Pares pedagógicos em #ffffff, #fffdf5 e respectivos -soft (texto >= 4.5:1 e traço/ícone >= 3.0:1)
  const pedagogicalGroups = ['hour', 'minute', 'period', 'second', 'success'];
  for (const group of pedagogicalGroups) {
    const color = requireHex(rootVars, `--color-${group}`);
    const soft = requireHex(rootVars, `--color-${group}-soft`);
    const ledge = requireHex(rootVars, `--color-${group}-ledge`);

    addCheck(`--color-${group} vs --color-surface-card (texto AA)`, color, surfaceCard, 4.5);
    addCheck(`--color-${group} vs --color-surface-dial (texto AA)`, color, surfaceDial, 4.5);
    addCheck(`--color-${group} vs --color-${group}-soft (texto AA)`, color, soft, 4.5);
    addCheck(`--color-${group} vs --color-surface-card (traco/icone AA)`, color, surfaceCard, 3.0);
    addCheck(`--color-${group}-ledge vs --color-${group}-soft (texto pequeno)`, ledge, soft, 4.5);
  }

  // 2. Tipografia interna
  const ink = requireHex(rootVars, '--color-ink');
  const inkMuted = requireHex(rootVars, '--color-ink-muted');
  const warningInk = requireHex(rootVars, '--color-warning-ink');
  addCheck('--color-ink vs --color-surface-card', ink, surfaceCard, 4.5);
  addCheck('--color-ink vs --color-surface-dial', ink, surfaceDial, 4.5);
  addCheck('--color-ink-muted vs --color-surface-card', inkMuted, surfaceCard, 4.5);
  addCheck('--color-ink-muted vs --color-surface-dial', inkMuted, surfaceDial, 4.5);
  addCheck('--color-warning-ink vs --color-surface-elevated', warningInk, surfaceElevated, 4.5);

  // 3. Visor digital escuro (#1e2832 e #263238)
  const onDarkTokens = ['--color-hour-on-dark', '--color-minute-on-dark', '--color-colon-on-dark'];
  for (const token of onDarkTokens) {
    const fg = requireHex(rootVars, token);
    addCheck(`${token} vs --color-visor-bg (#1e2832)`, fg, visorBg, 4.5);
    addCheck(`${token} vs --color-visor-bezel (#263238)`, fg, visorBezel, 4.5);
  }

  // 4. Textos fora de cards nas 4 atmosferas
  for (const [atmoName, atmoVars] of atmospheres.entries()) {
    const ambientInk = requireHex(atmoVars, '--ambient-ink');
    const ambientInkMuted = requireHex(atmoVars, '--ambient-ink-muted');
    const ambientBgRaw = atmoVars.get('--ambient-bg');
    if (!ambientBgRaw) {
      throw new Error(`--ambient-bg ausente na atmosfera ${atmoName}`);
    }
    const stops = extractAllHexStops(ambientBgRaw);
    for (const [idx, stopHex] of stops.entries()) {
      addCheck(
        `[${atmoName}] --ambient-ink vs parada #${idx + 1} (${stopHex})`,
        ambientInk,
        stopHex,
        4.5,
      );
      addCheck(
        `[${atmoName}] --ambient-ink-muted vs parada #${idx + 1} (${stopHex})`,
        ambientInkMuted,
        stopHex,
        4.5,
      );
    }
  }

  const failures = checks.filter((c) => !c.passed);
  for (const c of checks) {
    const status = c.passed ? 'PASS' : 'FAIL';
    console.log(
      `[${status}] ${c.label}: ${c.ratio.toFixed(2)}:1 (min ${c.minRatio.toFixed(1)}:1, ${c.fgHex} em ${c.bgHex})`,
    );
  }

  if (failures.length > 0) {
    console.error(`[check-contrast] FALHA: ${failures.length} verificacao(oes) abaixo do limite WCAG 2.2 AA.`);
    process.exit(1);
  }

  console.log(`[check-contrast] OK: todas as ${checks.length} verificacoes WCAG 2.2 AA aprovadas.`);
}

main();
