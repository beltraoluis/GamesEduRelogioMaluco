// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const PREVIEW_HOST = '127.0.0.1';
export const PREVIEW_PORT = Number(process.env.E2E_PORT ?? 4177);
if (!Number.isInteger(PREVIEW_PORT) || PREVIEW_PORT < 1 || PREVIEW_PORT > 65535) {
  throw new Error('E2E_PORT deve ser uma porta TCP entre 1 e 65535');
}

export const PREVIEW_ORIGIN = `http://${PREVIEW_HOST}:${PREVIEW_PORT}`;
export const RUNTIME_DIST = path.join(REPO_ROOT, 'e2e', '.runtime-dist', String(PREVIEW_PORT), 'local');
export const F2C_DIST = path.join(path.dirname(RUNTIME_DIST), 'f2c');
export const F2C_SHA = process.env.E2E_F2C_SHA;
export const SUBPATH = '/GamesEduRelogioMaluco';
