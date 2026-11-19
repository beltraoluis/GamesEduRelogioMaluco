// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
const require = createRequire(import.meta.url);
const packages = ['react', 'react-dom', 'scheduler', 'workbox-core', 'workbox-precaching', 'workbox-routing', 'workbox-strategies'];
const licenses = packages.map(name => {
  const entry = require.resolve(name);
  let dir = dirname(entry);
  while (true) {
    try {
      const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
      if (pkg.name === name) return `${name} ${pkg.version}\n${readFileSync(join(dir, 'LICENSE'), 'utf8')}`;
    } catch { /* Ascend to the package root. */ }
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`License unavailable for ${name}`);
    dir = parent;
  }
});
licenses.push(`Fredoka font\n${readFileSync('src/assets/fonts/OFL.txt', 'utf8')}`);
copyFileSync('LICENSE', 'public/LICENSE.txt');
writeFileSync('public/THIRD_PARTY_LICENSES.txt', licenses.join('\n\n---\n\n'));
copyFileSync('design/source/illustrations/ASSETS-LICENSE.md', 'public/ASSETS-LICENSE.md');
