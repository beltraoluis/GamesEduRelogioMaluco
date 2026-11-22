// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright 2026 Luis Henrique Coutinho Beltrão
import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
import a11y from 'eslint-plugin-jsx-a11y';

const boundaries = {
  domain: ['react', 'react-dom', 'storage', 'audio', 'hooks', 'components', 'screens', 'app', 'ui', 'contracts'],
  storage: ['react', 'audio', 'hooks', 'components', 'screens', 'app'],
  audio: ['react', 'domain', 'storage', 'hooks', 'components', 'screens', 'app'],
  hooks: ['components', 'screens', 'app'],
  components: ['screens', 'app'],
};
const spdx = { meta: { type: 'problem', schema: [] }, create(context) { return { Program(node) { const first = context.sourceCode.getAllComments()[0]; if (!first || !first.value.includes('SPDX-License-Identifier: AGPL-3.0-or-later')) context.report({ node, message: 'Missing SPDX license header.' }); } }; } };
export default [
  { ignores: ['legacy/**', 'e2e/fixtures/legacy-v6/**', 'dist/**', 'node_modules/**', 'coverage/**', 'e2e/.runtime-dist/**', 'playwright-report/**', 'test-results/**'] },
  ...tseslint.configs.recommended,
  { files: ['src/**/*.{ts,tsx,js,jsx}'], plugins: { 'react-hooks': hooks, 'jsx-a11y': a11y, local: { rules: { spdx } } }, rules: { ...hooks.configs.recommended.rules, ...a11y.configs.recommended.rules, 'local/spdx': 'error', 'no-restricted-syntax': ['error', { selector: 'ImportExpression', message: 'Dynamic imports are not allowed.' }] } },
  { files: ['src/domain/**/*.{ts,tsx,js,jsx}'], ignores: ['src/domain/__tests__/**'], rules: { 'no-restricted-globals': ['error', 'window', 'document'], 'no-restricted-properties': ['error', { object: 'Math', property: 'random' }, { object: 'Date', property: 'now' }] } },
  ...Object.entries(boundaries).map(([layer, forbidden]) => ({ files: [`src/${layer}/**/*.{ts,tsx,js,jsx}`], rules: { 'no-restricted-imports': ['error', { patterns: forbidden.flatMap(name => name.startsWith('react') ? [name, `${name}/*`] : [name, `${name}/*`, `@/${name}`, `@/${name}/*`, `**/${name}`, `**/${name}/*`]) }] } })),
];
