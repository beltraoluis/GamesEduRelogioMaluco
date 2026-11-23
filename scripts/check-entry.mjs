// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { readdirSync } from 'node:fs';
const files = readdirSync('dist/assets').filter(name => name.endsWith('.js'));
if (files.length !== 1) throw new Error(`Expected one application JS chunk, found ${files.length}`);
console.log(`Single application chunk: ${files[0]}`);
