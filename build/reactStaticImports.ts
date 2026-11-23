// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { normalizePath, type Plugin } from 'vite';
import MagicString from 'magic-string';

const require = createRequire(import.meta.url);
const reactRoot = dirname(require.resolve('react/package.json'));
const domRoot = dirname(require.resolve('react-dom/package.json'));

/**
 * Expose the official runtime's static dependency edges to Rolldown. A require
 * of the whole React namespace keeps all of its exports alive; static imports
 * let the bundler retain only referenced exports. No function bodies, feature
 * flags, exports, errors or DevTools checks are rewritten here.
 *
 * This is deliberately pinned to the reviewed 19.3.1 distribution. An upgrade
 * must recheck these declarations and the production Activity/DevTools probe,
 * rather than silently applying a text transform to a different runtime.
 */
export function reactStaticImports(): Plugin {
  const declarations = new Map([
    [normalizePath(join(domRoot, 'cjs/react-dom.production.js')), {
      digest: '7a05d7f7bb2b02aae84018a88d4815a2181eef48d2cb8172d403eaa2b131eefd',
      before: 'var React = require("react");',
      after: 'import * as React from "react";',
    }],
    [normalizePath(join(domRoot, 'cjs/react-dom-client.production.js')), {
      digest: 'a319b413b7a19ee34422d9a12a8e7afd003c07846716d278ba1a0898e8cb6251',
      before: 'var Scheduler = require("scheduler"),\n  React = require("react"),\n  ReactDOM = require("react-dom");',
      after: 'import * as Scheduler from "scheduler";\nimport * as React from "react";\nimport * as ReactDOM from "react-dom";',
    }],
  ]);
  const verify = (source: string, expected: string) => {
    if (createHash('sha256').update(source).digest('hex') !== expected) {
      throw new Error('React distribution changed: review static imports and rerun the production runtime probe.');
    }
  };
  return {
    name: 'react-static-imports',
    apply: 'build',
    enforce: 'pre',
    buildStart() {
      // index.js only selects the production/development file. Unlike the DOM
      // entry points it has no checkDCE call; those DOM entry points stay intact.
      verify(readFileSync(join(reactRoot, 'index.js'), 'utf8'),
        '60caffdecbdc5db3bc4ec4e83df9488345ccb271d07533b9210bf5750918d97e');
      for (const root of [reactRoot, domRoot]) {
        if (JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version !== '19.3.1') {
          throw new Error('Static React imports require the ADR-001 version, 19.3.1.');
        }
      }
    },
    resolveId(id) {
      if (id === 'react') return join(reactRoot, 'cjs/react.production.js');
    },
    transform(source, id) {
      const declaration = declarations.get(id);
      if (!declaration) return;
      verify(source, declaration.digest);
      const start = source.indexOf(declaration.before);
      if (start < 0) throw new Error('Reviewed React dependency declaration missing.');
      const edited = new MagicString(source);
      edited.overwrite(start, start + declaration.before.length, declaration.after);
      return { code: edited.toString(), map: edited.generateMap({ source: id, hires: true, includeContent: true }) };
    },
  };
}
