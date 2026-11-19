# ADR-001 — Stack e estilização

- **Status:** Aceito (G0)
- **Data:** 2026-11-19 (sincronizado com F0a `cf59f65` e F0c `a6cdd25`)
- **Decisores:** Coordenador Antigravity, Assessor Opus, Argon, Codex, Grok; aprovado pelo usuário
- **Escopo:** migração do Relógio Maluco (JS puro, sem build) para React + Vite + TypeScript

## Contexto

O jogo legado (`legacy/`) é HTML/CSS/JS sem build, com service worker manual (`relogio-maluco-v6`). A migração precisa de tipagem estrita, testes do domínio, componentes reutilizáveis e PWA gerado por ferramenta, sem perder o funcionamento offline nem pesar em tablets escolares de baixo custo.

## Decisão

### Versões fixadas

| Ferramenta | Versão | Observação |
|---|---|---|
| React / React DOM | `19.3.1` | sem React Compiler na fase inicial |
| Vite | `8.3.8` | **exata**: 8.3.0–8.3.6 são afetadas pelo [GHSA-p4f5-76q4-ffq7](https://github.com/vitejs/vite/security/advisories/GHSA-p4f5-76q4-ffq7) (crítico, dev server exposto à rede); exceção aprovada no F0a |
| `vite-plugin-pwa` | `2.0.0` | exata; ver ADR-003 |
| Vitest | `5.1.1` | exata; ambiente `jsdom` só para componentes |
| TypeScript | `5.9.3` | **`<6.1` obrigatório**: limite de compatibilidade do `typescript-eslint` |
| Node | `^22.22.2 \|\| ^24.15.0` | campo `engines.node` do `package.json`; piso exigido por `jsdom@31.0.1` |

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
- **Atmosfera do dia** por atributo no contêiner raiz: `data-atmosphere="madrugada | manha | tarde | noite"` (tipo `Atmosphere`, derivado de `periodOf(h)`). Ela muda só o fundo externo e os textos fora dos cards (`--ambient-*`). Cards (`#ffffff`) e mostrador (`#fffdf5`) continuam sempre claros, como o F0c define.
- **`MascotAmbient` é derivado, nunca independente:** `ATMOSPHERE_AMBIENT` (`contracts`) mapeia `madrugada`/`noite` para `'night'` e `manha`/`tarde` para `'day'`. Não existe `data-ambient`.
- As variantes `hourOnDark`/`minuteOnDark` valem **só no visor digital escuro** (`#1e2832` / `#263238`), e não seguem a atmosfera.
- **`lightningcss`** como transformador CSS do Vite (`css.transformer: 'lightningcss'`), com `targets` derivados do browserslist (proposta inicial: Safari iOS 15+, Chrome 100+, Firefox ESR). **Passou no spike F0a**: com `lightningcss@1.33.0` + Rolldown, `@layer`, nesting (expandido corretamente), `@starting-style`, `linear()` e CSS Modules saíram íntegros.
- **Fallback PostCSS** (`postcss-preset-env` + `autoprefixer`): plano de contingência só documentado, **não instalado** (o F0a mostrou que não é necessário). Reativar exige CCR e só se justifica por regressão do `lightningcss`.
- **Fonte** `.woff2` self-hosted em `public/fonts/` (subset pt-BR definido no F0c, `visual-system.md` §5), `font-display: swap`, fallback calibrado com `size-adjust` e pré-carregada no `index.html`. Nenhuma fonte de CDN, para não quebrar o offline e não vazar dados a terceiros (LGPD, ADR-004).

### Orçamento de bundle e assets

Medido no `dist/` de produção (JS/CSS em gzip; fontes e imagens em bytes do arquivo). Fontes e ilustrações seguem os tetos do F0c. JS, CSS e precache são o **teto inicial** do Assessor até a primeira medição real em F1; ajustes depois disso exigem CCR.

| Item | Orçamento |
|---|---|
| JS inicial (único chunk, ADR-003) | ≤ 90 KB |
| CSS total | ≤ 20 KB |
| Fonte(s) `.woff2` | ≤ 45 KB (46 080 B) no total (F0c) |
| Ilustrações dos cards `.webp` 384×384 | ≤ 28 KB cada, ≤ 110 KB no total (F0c; hoje ≈ 38 KB) |
| Ícones/mascote SVG inline | ≤ 40 KB no total |
| Precache total do service worker | ≤ 512 KB (recalculado com os tetos do F0c) |

Um script de CI (`size-limit` ou equivalente) falha o build quando o orçamento é ultrapassado. Aumentar o orçamento exige CCR.

## Consequências

- O typecheck do CI pega `undefined` atribuído a opcional e índice não verificado.
- Atualizar o TypeScript para 6.1 ou mais fica bloqueado até o `typescript-eslint` dar suporte.
- O `lightningcss` (validado no F0a) acelera o build e resolve o nesting. O fallback PostCSS fica só no papel.
- Vite fixo em `8.3.8`: atualizações de patch passam por revisão de advisories, e o `npm audit` não basta como fonte única (F0a).
- Fonte self-hosted aumenta o precache, mas garante tipografia idêntica offline.

## Alternativas rejeitadas

- **Tailwind/UnoCSS:** classes utilitárias espalham as cores pedagógicas e dificultam a trava sob CCR.
- **CSS-in-JS em runtime:** custo de JS e de hidratação sem benefício para um app de poucas telas.
- **Google Fonts via CDN:** quebra o offline e envia dados de navegação a terceiros.
