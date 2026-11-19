// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Dist isolado da suíte F2d — nunca reutiliza `dist/` de outro worktree. */
export const RUNTIME_DIST = path.join(REPO_ROOT, 'e2e', '.runtime-dist');

/** Dist do sibling F2c (`21c1648`) para composição temporária de PWA/licenças. */
export const F2C_WORKTREE = path.resolve(REPO_ROOT, '..', 'f2c-pwa');
export const F2C_DIST = path.join(F2C_WORKTREE, 'dist');

export const SUBPATH = '/GamesEduRelogioMaluco';

/** Deve coincidir com playwright.config (E2E_PORT / 4177). */
export const PREVIEW_HOST = '127.0.0.1';
export const PREVIEW_PORT = Number(process.env.E2E_PORT ?? 4177);
export const PREVIEW_ORIGIN = `http://${PREVIEW_HOST}:${PREVIEW_PORT}`;
