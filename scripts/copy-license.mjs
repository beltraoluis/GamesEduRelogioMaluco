// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
const require = createRequire(import.meta.url);
const packages = ['react', 'react-dom', 'scheduler', 'workbox-core', 'workbox-precaching', 'workbox-routing', 'workbox-strategies', 'workbox-window'];
const groupedLicenses = new Map();
for (const name of packages) {
  const entry = require.resolve(name);
  let dir = dirname(entry);
  while (true) {
    try {
      const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
      if (pkg.name === name) {
        const license = readFileSync(join(dir, 'LICENSE'), 'utf8');
        const names = groupedLicenses.get(license) ?? [];
        names.push(`${name} ${pkg.version}`);
        groupedLicenses.set(license, names);
        break;
      }
    } catch { /* Ascend to the package root. */ }
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`License unavailable for ${name}`);
    dir = parent;
  }
}
const licenses = Array.from(groupedLicenses, ([license, names]) => `${names.join('\n')}\n${license}`);
licenses.push(`Fredoka font\n${readFileSync('src/assets/fonts/OFL.txt', 'utf8')}`);
copyFileSync('LICENSE', 'public/LICENSE.txt');
writeFileSync('public/THIRD_PARTY_LICENSES.txt', licenses.join('\n\n---\n\n'));
writeFileSync('public/ASSETS-LICENSE.md', readFileSync('design/source/illustrations/ASSETS-LICENSE.md', 'utf8') + readFileSync('scripts/assets-pwa-license.md', 'utf8'));
