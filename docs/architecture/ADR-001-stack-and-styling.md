# ADR-001 — Stack e estilização

- **Status:** Aceito (G0)
- **Data:** 2026-11-19
- **Decisores:** Coordenador Antigravity, Assessor Opus, Argon, Codex, Grok; aprovado pelo usuário
- **Escopo:** migração do Relógio Maluco (JS puro, sem build) para React + Vite + TypeScript

## Contexto

O jogo legado (`legacy/`) é HTML/CSS/JS sem build, com service worker manual (`relogio-maluco-v6`). A migração precisa de tipagem estrita, testes do domínio, componentes reutilizáveis e PWA gerado por ferramenta, sem perder o funcionamento offline nem pesar em tablets escolares de baixo custo.

## Decisão

### Versões fixadas

| Ferramenta | Versão | Observação |
|---|---|---|
| React / React DOM | `19.3.1` | sem React Compiler na fase inicial |
| Vite | `8.3.x` | faixa de patch liberada |
| `vite-plugin-pwa` | `2.0.0` | exata; ver ADR-003 |
| Vitest | `5.1.1` | exata; ambiente `jsdom` só para componentes |
| TypeScript | `5.9.3` | **`<6.1` obrigatório**: limite de compatibilidade do `typescript-eslint` |
| Node | `^22.12.0 \|\| ^24` | campo `engines` do `package.json` |

Dependências de runtime ficam restritas a `react` e `react-dom`. Qualquer nova dependência de runtime exige CCR.

### TypeScript

`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride` e `verbatimModuleSyntax` ligados. Imports só de tipo usam `import type`. `moduleResolution: "bundler"`, imports sem extensão.

Fronteiras:

- `src/domain/**`: TypeScript puro, sem React, DOM, `window`, `document` ou imports fora de `domain/`.
- `src/contracts/index.ts`: contratos congelados (tipos, props, APIs dos hooks, `PEDAGOGICAL_COLORS`). Mudanças passam por CCR.
- Todo `.ts`/`.tsx` começa com o cabeçalho SPDX `AGPL-3.0-or-later` (ADR-004).
- Nenhum emoji em `src/`. Ícones são SVG; os emojis das mensagens do legado viraram selos (`BadgeKind`).

### Estilização

- **CSS Modules** por componente (`*.module.css`). Sem CSS-in-JS e sem framework utilitário.
- **Tokens em `@layer`**: ordem `@layer reset, tokens, base, components, utilities;`. Os tokens são custom properties em `:root` (`--color-hour`, `--space-*`, `--radius-*`, `--font-*`, `--motion-*`). As cores pedagógicas espelham `PEDAGOGICAL_COLORS` e estão sob CCR.
- **Tema noturno** por atributo (`data-ambient="night"`) com `hourOnDark`/`minuteOnDark`.
- **`lightningcss`** como transformador CSS do Vite (`css.transformer: 'lightningcss'`), com `targets` derivados do browserslist (proposta inicial: Safari iOS 15+, Chrome 100+, Firefox ESR; confirmar em F0a). **Fallback PostCSS** (`postcss-preset-env` + `autoprefixer`), documentado e testado em CI, para o caso de o `lightningcss` quebrar com `@layer` aninhado ou CSS Modules.
- **Fonte** `.woff2` self-hosted em `public/fonts/` (subconjunto latino com acentos do pt-BR), `font-display: swap`, pré-carregada no `index.html`. Nenhuma fonte de CDN, para não quebrar o offline e não vazar dados a terceiros (LGPD, ADR-004).

### Orçamento de bundle e assets

Medido no `dist/` de produção, gzip. Os números abaixo são o **teto inicial** proposto pelo Assessor e passam a valer como referência até a primeira medição real em F0a/F1; ajustes depois disso exigem CCR.

| Item | Orçamento |
|---|---|
| JS inicial (único chunk, ADR-003) | ≤ 90 KB |
| CSS total | ≤ 20 KB |
| Fonte(s) `.woff2` | ≤ 60 KB no total |
| Ícones/ilustrações SVG | ≤ 40 KB no total |
| Precache total do service worker | ≤ 400 KB |

Um script de CI (`size-limit` ou equivalente) falha o build quando o orçamento é ultrapassado. Aumentar o orçamento exige CCR.

## Consequências

- O typecheck do CI pega `undefined` atribuído a opcional e índice não verificado.
- Atualizar o TypeScript para 6.1 ou mais fica bloqueado até o `typescript-eslint` dar suporte.
- O `lightningcss` acelera o build e resolve o nesting nativo; o fallback PostCSS mantém uma saída de emergência.
- Fonte self-hosted aumenta o precache, mas garante tipografia idêntica offline.

## Alternativas rejeitadas

- **Tailwind/UnoCSS:** classes utilitárias espalham as cores pedagógicas e dificultam a trava sob CCR.
- **CSS-in-JS em runtime:** custo de JS e de hidratação sem benefício para um app de poucas telas.
- **Google Fonts via CDN:** quebra o offline e envia dados de navegação a terceiros.
