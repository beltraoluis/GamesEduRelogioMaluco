# Sistema Visual Definitivo — "Oficina Tátil do Tempo" (`Relógio Maluco`)

<!--
  SPDX-FileCopyrightText: 2026 Luis Henrique Coutinho Beltrão
  SPDX-License-Identifier: AGPL-3.0-or-later
-->

> **Status:** Especificação Visual Definitiva (F0c — Fechamento G0) — Acordos da Rodada 2 + Revisões Cruzadas (Codex, Grok, Claude Opus & Argon)  
> **Direção de Arte:** *Oficina Tátil do Tempo* (Brinquedo de madeira Montessori & Paper-Craft fosco em camadas)  
> **Acessibilidade & Conformidade:** **WCAG 2.2 AA** estrito (`≥ 4,5:1` texto normal / `≥ 3,0:1` componentes gráficos e texto grande), redundância geométrica obrigatória para daltonismo e conformidade `AGPL-3.0-or-later`.

---

## 1. Visão Geral e Princípios da Direção Visual

A **"Oficina Tátil do Tempo"** transforma o aprendizado de leitura de horas (analógica, digital e por extenso em português) em uma experiência concreta, acolhedora e livre de sobrecarga cognitiva para crianças em fase de alfabetização matemática (6 a 10 anos):

1. **Invariância Cromo-Pedagógica (CCR — Color-Concept Binding):** Cada grandeza temporal possui uma assinatura cromática, geométrica e tátil **única e imutável** em todas as telas, modos de jogo, dicas e feedbacks:
   - **Hora (`--color-hour`):** Azul Cobalto Real (`#1560bd`) + forma **curta/larga com seta arredondada / ícone circular**.
   - **Minuto (`--color-minute`):** Vermelho-Coral Vibrante (`#d62839`) + forma **longa/esguia com ilhós vazado / ícone losango-anel**.
   - **Período do Dia (`--color-period`):** Roxo Ametista (`#7b2cbf`) + formato **pílula (`9999px`) com medalhão celeste `<PeriodMedallion />`**.
   - **Segundo (`--color-second`):** Verde-Água Profundo (`#0f766e`) + ponteiro **agulha fina com contrapeso circular**.
   - **Sucesso (`--color-success`):** Verde Floresta (`#2e7d32`) — **estritamente desacoplado de `--color-second`** para evitar ambiguidade semântica entre "segundos" e "resposta correta".
2. **Isolamento de Superfície Pedagógica:** O fundo da aplicação reage ao ciclo de 24 horas (4 atmosferas: `madrugada`, `manha`, `tarde`, `noite`), mas **os cards de atividade (`#ffffff`) e o mostrador do relógio (`#fffdf5`) permanecem sempre claros**. Isso garante que os contrastes **WCAG 2.2 AA** validados dos tokens pedagógicos nunca degradem quando a criança explora horários noturnos.
3. **Fisicalidade Tátil (3D Toy & Matte Paper-Craft):** Botões, fichas encaixáveis e controles possuem chanfro inferior físico (`-ledge` de `3px` a `4px`), bordas arredondadas generosas (`16px` a `24px`) e resposta imediata de pressão (`translateY(2px)` no `:active`).

---

## 2. Tokens Pedagógicos WCAG 2.2 AA (Travados sob CCR)

Todos os tokens abaixo foram auditados contra as superfícies claras primárias (`#ffffff` para cards/fichas, `#fffdf5` para o mostrador do relógio e os respectivos fundos `-soft`) e superfícies escuras (`#1e2832` / `#263238` para o visor digital), cumprindo **WCAG 2.2 AA (≥ 4,5:1 para texto normal)**.

### 2.1. Tabela Mestre de Tokens Pedagógicos e Semânticos

| Token CSS | Hex | Papel Semântico / Pedagógico | Contraste em `#ffffff` | Contraste em `#fffdf5` | Token `-soft` (Fundo Ficha/Badge) | Contraste Token vs `-soft` | Token `-ledge` (Borda 3D / Texto Pequeno Alta Densidade) |
| :--- | :--- | :--- | :---: | :---: | :--- | :---: | :--- |
| `--color-hour` | `#1560bd` | **Horas** (ponteiro curto, dígitos HH, ficha de hora) | **6,10 : 1** (AA) | **5,99 : 1** (AA) | `--color-hour-soft: #e8f1fc` | **5,35 : 1** (AA) | `--color-hour-ledge: #0d4285` |
| `--color-minute` | `#d62839` | **Minutos** (ponteiro longo, dígitos MM, ficha de minuto) | **4,97 : 1** (AA) | **4,88 : 1** (AA) | `--color-minute-soft: #fff5f6` | **4,65 : 1** (AA) | `--color-minute-ledge: #9b1826` (`7,70:1` em `#fff5f6` / `7,16:1` em `#fdebed`) |
| `--color-period` | `#7b2cbf` | **Período 24h** (da manhã, da tarde, da noite, da madrugada) | **7,11 : 1** (AA) | **6,98 : 1** (AA) | `--color-period-soft: #f3eafa` | **6,08 : 1** (AA) | `--color-period-ledge: #561d87` |
| `--color-second` | `#0f766e` | **Segundos / Modo Explorar** (ponteiro fino, engrenagens de tempo contínuo) | **5,47 : 1** (AA) | **5,37 : 1** (AA) | `--color-second-soft: #e6f4f2` | **4,84 : 1** (AA) | `--color-second-ledge: #0a524c` |
| `--color-success` | `#2e7d32` | **Acerto / Confirmação** (desacoplado de `--color-second`; nunca isolado só por cor) | **5,13 : 1** (AA) | **5,03 : 1** (AA) | `--color-success-soft: #e9f5ea` | **4,57 : 1** (AA) | `--color-success-ledge: #1b5e20` |

> **Regra de Legibilidade sobre `--color-minute-soft` (`#fff5f6`):** O ajuste de `--color-minute-soft` para `#fff5f6` garante contraste **`4,65 : 1`** com `--color-minute` (`#d62839`), aprovando **WCAG 2.2 AA** em texto normal. Ainda assim, para **texto pequeno ou rótulos secundários de alta densidade** renderizados sobre `--color-minute-soft`, deve-se preferir `--color-minute-ledge` (`#9b1826`, que atinge **`7,70 : 1`** sobre `#fff5f6` e **`7,16 : 1`** mesmo sobre tons rosados mais densos), assegurando folga nível AAA.

### 2.2. Tokens para Superfície Escura (Visor Digital `#1e2832` / `#263238`)

Dentro do visor digital escuro (`--color-visor-bg: #1e2832`, moldura `--color-visor-bezel: #263238`), os tokens primários de hora e minuto são substituídos por suas variantes luminosas de alto contraste:

| Token CSS | Hex | Escopo CCR | Uso no Visor Digital Escuro | Contraste em `#1e2832` | Contraste em `#263238` |
| :--- | :--- | :---: | :--- | :---: | :---: |
| `--color-hour-on-dark` | `#8ec5ff` | **CCR Hora** | Dígitos de **Hora (HH)** e badge `H` dentro do visor digital escuro | **8,24 : 1** (AAA) | **7,26 : 1** (AAA) |
| `--color-minute-on-dark` | `#ff9aa2` | **CCR Minuto** | Dígitos de **Minuto (MM)** e badge `M` dentro do visor digital escuro | **7,40 : 1** (AAA) | **6,51 : 1** (AA) |
| `--color-colon-on-dark` | `#ffb703` | *Auxiliar (Não-CCR)* | Dois-pontos central (`<ColonBadge />`) no visor digital escuro | **8,56 : 1** (AAA) | **7,54 : 1** (AAA) |

> **Nota sobre `--color-colon-on-dark`:** Este token é um **acento visual auxiliar de pontuação** do visor digital (alinhado ao latão/âmbar `--color-warning-accent: #ffb703` da oficina) e **não pertence** ao conjunto CCR travado de grandezas pedagógicas (`hour`, `minute`, `period`, `second`, `success`).

### 2.3. Declaração CSS Canônica (`:root`)

```css
:root {
  /* Superfícies Internas Invariantes (Isolamento Pedagógico) */
  --color-surface-card: #ffffff;
  --color-surface-dial: #fffdf5;
  --color-surface-elevated: #fff9e6;
  --color-border-card: #e2d9c5;
  --color-border-ledge: #cbbd9f;

  /* Tipografia Interna (sobre #ffffff e #fffdf5) */
  --color-ink: #1e2832;          /* 14,85:1 em #fff */
  --color-ink-muted: #475569;    /* 7,58:1 em #fff */

  /* Visor Digital Escuro */
  --color-visor-bg: #1e2832;
  --color-visor-bezel: #263238;
  --color-hour-on-dark: #8ec5ff;   /* 8,24:1 em #1e2832 / 7,26:1 em #263238 */
  --color-minute-on-dark: #ff9aa2; /* 7,40:1 em #1e2832 / 6,51:1 em #263238 */
  --color-colon-on-dark: #ffb703;  /* 8,56:1 em #1e2832 / 7,54:1 em #263238 (Auxiliar não-CCR) */

  /* Tokens Pedagógicos Travados (CCR) */
  --color-hour: #1560bd;
  --color-hour-soft: #e8f1fc;
  --color-hour-ledge: #0d4285;

  --color-minute: #d62839;
  --color-minute-soft: #fff5f6;    /* 4,65:1 com #d62839 (AA); usar --color-minute-ledge para texto pequeno */
  --color-minute-ledge: #9b1826;

  --color-period: #7b2cbf;
  --color-period-soft: #f3eafa;
  --color-period-ledge: #561d87;

  --color-second: #0f766e;
  --color-second-soft: #e6f4f2;
  --color-second-ledge: #0a524c;

  /* Feedback Semântico (Desacoplado de --color-second) */
  --color-success: #2e7d32;
  --color-success-soft: #e9f5ea;
  --color-success-ledge: #1b5e20;

  --color-warning-accent: #ffb703;
  --color-warning-warm: #fb8500;
  --color-warning-ink: #7c2d12;  /* 8,42:1 em #fff9e6 */
}
```

---

## 3. Redundância Geométrica Obrigatória para Daltonismo

Nenhuma informação pedagógica ou estado de interface pode depender exclusivamente de cor (**WCAG 2.2 Critério 1.4.1 — Use of Color**). Todo elemento de Hora, Minuto, Período, Segundo e Sucesso deve combinar **Cor + Silhueta Geométrica + Padrão de Borda + Mini-Badge Iconográfico**:

| Conceito | Cor (`CCR`) | Geometria do Ponteiro | Geometria da Ficha / Lacuna (Slot) | Mini-Badge Obrigatório |
| :--- | :--- | :--- | :--- | :--- |
| **Hora** | `#1560bd` | **Curto e Largo** (`comprimento: 52%` do raio, `largura: 10px`), ponta em **seta triangular arredondada** | Retângulo de cantos médios (`border-radius: 12px`), **borda contínua sólida** (`2.5px solid #1560bd`), fundo `#e8f1fc`, chanfro inferior `#0d4285` | `<HandBadge type="hour" />` — Medalhão **circular** com ícone de ponteiro curto/seta e rótulo `H` |
| **Minuto** | `#d62839` | **Longo e Esguio** (`comprimento: 78%` do raio, `largura: 6px`), com **anel/ilhós circular vazado** próximo à ponta | Retângulo com **entalhe lateral / borda dupla ou tracejada** (`2.5px dashed #d62839` nas lacunas vazias; sólida + friso duplo preenchida), fundo `#fff5f6` | `<HandBadge type="minute" />` — Medalhão em **losango arredondado (diamante)** com ícone de ponteiro longo/anel e rótulo `M` |
| **Período (24h)** | `#7b2cbf` | N/A (representado no anel externo 24h e no medalhão do mostrador) | Formato **pílula completa** (`border-radius: 9999px`), fundo `#f3eafa`, borda pontilhada nas lacunas e sólida com friso interno quando preenchida | `<PeriodMedallion period={...} />` — Ícone celeste distinto (Estrela-Alvorada, Sol Nascente, Sol Pleno, Lua Crescente) |
| **Segundo** | `#0f766e` | **Agulha Extrafina** (`comprimento: 82%` do raio, `largura: 2.5px`) com **contrapeso circular** na extremidade oposta | Badge circular com aro dentado de engrenagem (exclusivo do modo Explorar), fundo `#e6f4f2` | Ícone de engrenagem/cronômetro com marcações de tique-taque |
| **Sucesso** | `#2e7d32` | Halo de brilho suave ao redor do mostrador sem alterar a cor dos ponteiros | Borda `#2e7d32` + fundo `#e9f5ea` + **ícone de check duotone + partículas de estrela** | Nunca comunicado só por cor: exige `<UiIcon name="CheckBadge" />` + reação `mood="celebrate"` do `<TicMascot />` + texto afirmativo |

---

## 4. As 4 Atmosferas do Ciclo de 24 Horas (`[data-ambient]`)

O plano de fundo externo da aplicação (`body` / `.workshop-stage`) transiciona suavemente (`transition: background 600ms cubic-bezier(0.22, 1, 0.36, 1)`) entre 4 atmosferas que ensinam a relação entre a leitura do relógio e o ciclo real do dia.

### 4.1. Regra de Ouro de Contraste nas Atmosferas
- **Dentro dos Cards e Mostrador:** Superfícies continuam `#ffffff` e `#fffdf5`, preservando 100% dos contrastes da Seção 2.
- **Fora dos Cards (Cabeçalho, Barra de Navegação, Chips de Status, Rodapé):** Utilizam os tokens `--ambient-ink`, `--ambient-ink-muted` e `--ambient-pill-bg`, garantindo **contraste mínimo ≥ 4,5:1 (WCAG 2.2 AA)** em qualquer ponto do gradiente de fundo.

### 4.2. Matriz de Tokens das 4 Atmosferas

| Período (`data-ambient`) | Faixa Horária | Gradiente de Fundo (`--ambient-bg`) | Texto Externo (`--ambient-ink`) | Texto Secundário (`--ambient-ink-muted`) | Contraste Mínimo Auditado (`--ambient-ink` vs fundo) | Superfície de Chip/HUD Externo (`--ambient-pill-bg`) |
| :--- | :---: | :--- | :--- | :--- | :---: | :--- |
| **`madrugada`** | `00:00 – 05:59` | `linear-gradient(160deg, #1b1947 0%, #312e81 55%, #4c1d95 100%)` | `#f8fafc` | `#cbd5e1` | **9,42 : 1** (AAA) | `rgba(15, 23, 42, 0.58)` com borda `#818cf8` |
| **`manha`** | `06:00 – 11:59` | `linear-gradient(160deg, #e0f2fe 0%, #fef3c7 60%, #fffbeb 100%)` | `#0f172a` | `#334155` | **13,10 : 1** (AAA) | `rgba(255, 255, 255, 0.86)` com borda `#93c5fd` |
| **`tarde`** | `12:00 – 17:59` | `linear-gradient(160deg, #ffedd5 0%, #fde68a 55%, #fed7aa 100%)` | `#1c1917` | `#44403c` | **11,84 : 1** (AAA) | `rgba(255, 253, 245, 0.88)` com borda `#fb923c` |
| **`noite`** | `18:00 – 23:59` | `linear-gradient(160deg, #0f172a 0%, #1e293b 55%, #1e1b4b 100%)` | `#f8fafc` | `#cbd5e1` | **13,75 : 1** (AAA) | `rgba(15, 23, 42, 0.64)` com borda `#64748b` |

---

## 5. Tipografia Self-Hosted `.woff2` (Orçamento ≤ 45 KB & Compatibilidade `base: './'`)

Para garantir carregamento instantâneo offline (PWA), zero requisições externas ao Google Fonts (privacidade infantil e LGPD/COPPA) e legibilidade máxima para crianças em fase de alfabetização:

### 5.1. Família Tipográfica e Licença
- **Fonte Primária (Display, UI e Leitura por Extenso):** **Fredoka** (ou **Nunito**), variável/pesos `600 SemiBold` e `700 Bold`, licenciada sob **SIL Open Font License 1.1 (`OFL-1.1`)**, totalmente compatível com distribuição em projetos `AGPL-3.0-or-later`.
- **Alinhamento Numérico:** `font-variant-numeric: tabular-nums` obrigatório em todos os visores digitais, contadores e opções numéricas para evitar jitter horizontal ao incrementar minutos/segundos.
- **Orçamento Estrito de Bundle:** A soma dos arquivos `.woff2` self-hosted em `public/fonts/` deve ser **≤ 45 KB** (`46080` bytes).
- **Caminhos Relativos (`base: './'`):** Todos os caminhos de fontes servidas a partir de `public/fonts/` devem utilizar caminho relativo compatível com `base: './'` do Vite (ex.: `url('./fonts/fredoka-ptbr-subset.woff2')` quando referenciado a partir da raiz ou importado via asset pipeline do Vite), **nunca** caminhos absolutos iniciados em `/fonts/...` que quebram quando a aplicação é hospedada em subdiretório.

### 5.2. Subset Completo Obrigatório (`pt-BR` + Símbolos Pedagógicos)
O arquivo `.woff2` subsetado deve conter obrigatoriamente todos os glifos abaixo:
- **Dígitos:** `0 1 2 3 4 5 6 7 8 9`
- **Alfabeto Latino Básico:** `A-Z` e `a-z`
- **Acentuação Completa `pt-BR` (minúsculas e maiúsculas):** `ç ã õ á é í ó ú â ê ô à Ç Ã Õ Á É Í Ó Ú Â Ê Ô À`
- **Indicadores Ordinais:** `º ª`
- **Pontuação Tipográfica e Operadores:** `–` (en-dash `U+2013`), `·` (middle dot `U+00B7`), `“` (`U+201C`), `”` (`U+201D`), `…` (reticências `U+2026`), além de `: . , ; ! ? ( ) - / + ' "` e espaço não-separável (`U+00A0`).

Comando reprodutível de geração do subset via `fonttools` (`pyftsubset`):

```bash
pyftsubset Fredoka-Variable.ttf \
  --flavor=woff2 \
  --output-file=public/fonts/fredoka-ptbr-subset.woff2 \
  --unicodes="U+0020-007E,U+00A0,U+00AA,U+00B7,U+00BA,U+00C0-00C3,U+00C7,U+00C9-00CA,U+00CD,U+00D3-00D5,U+00DA,U+00E0-00E3,U+00E7,U+00E9-00EA,U+00ED,U+00F3-00F5,U+00FA,U+2013,U+201C-201D,U+2026" \
  --layout-features="tnum,kern"
```

### 5.3. Fallback Tipográfico Calibrado com `size-adjust` (Mitigação de CLS)

Como `size-adjust` aplica um fator escalar único por `@font-face`, o descritor de fallback nomeia explicitamente famílias locais reais em `local(...)` (sem nunca usar palavras-chave genéricas como `sans-serif` dentro de `local()`, o que é inválido na especificação CSS Fonts) e calibra as métricas para a fonte local primária, reduzindo significativamente o *Cumulative Layout Shift* (CLS) durante o `font-display: swap`:

```css
@font-face {
  font-family: 'Oficina Rounded';
  src: url('./fonts/fredoka-ptbr-subset.woff2') format('woff2');
  font-weight: 500 700;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Oficina Rounded Fallback';
  src: local('Arial Rounded MT Bold'), local('Trebuchet MS'), local('Segoe UI');
  size-adjust: 103.5%;
  ascent-override: 94%;
  descent-override: 24%;
  line-gap-override: 0%;
}

:root {
  --font-sans: 'Oficina Rounded', 'Oficina Rounded Fallback', ui-rounded, system-ui, -apple-system, sans-serif;
}
```

---

## 6. Especificações dos Componentes SVG Inline e Ícones PWA

Todos os elementos vetoriais de interface são construídos em **SVG inline sem dependências externas**, utilizando `viewBox` padronizado, `stroke-linecap="round"`, `stroke-linejoin="round"` e acessibilidade nativa (`aria-hidden="true"` quando decorativo ou `role="img"` + `<title>` quando semântico).

### 6.1. `<TicMascot mood={'happy'|'think'|'celebrate'|'hint'} ambient={'day'|'night'} size={'sm'|'md'|'lg'|'xl'} />`
O mascote **Tic** é um despertador mecânico de madeira e latão amigável que atua como tutor afetivo da criança.
- **Invariante Anatômica Obrigatória:** As **duas sinetas superiores gêmeas (`twin bells`) em latão dourado (`#ffb703` / `#fb8500`), o martelinho central e a alça curva superior** devem estar **sempre presentes** em todos os estados (`mood` e `ambient`). Essa silhueta garante reconhecimento imediato da personagem mesmo em tamanhos reduzidos (`48×48px`).
- **Mapeamento Explícito de `MascotProps['size']` (Sincronizado com `F0b`):**

| Token `size` (`MascotProps['size']`) | Dimensões (`width × height`) | Onde é Usado na Aplicação (`F0b`) | Equivalência no Legado (`css/style.css`) |
| :--- | :---: | :--- | :--- |
| **`'sm'`** | `48 × 48 px` | Cabeçalhos compactos mobile, badges de dica inline e diálogos auxiliares | Novo tamanho compacto responsivo |
| **`'md'`** | `64 × 64 px` | Balão de ajuda da partida (`Game` — `.helper .mascot` ao lado de `#bubble`) | `.mascot` (`64×64px`) |
| **`'lg'`** | `96 × 96 px` | Cabeçalho principal da tela inicial (`Home` — `.hero .mascot-hero`) | `.mascot-hero` (`96×96px`) |
| **`'xl'`** | `136 × 136 px` (ou `160 × 160 px` em desktop) | Card de celebração de fim de rodada (`Result` — `.result-card .mascot-big`) | `.mascot-big` (`130×130px`) |

  *(Nota de interoperabilidade com `F0b`: caso o contrato TypeScript de `F0b` restrinja `size` a `'sm' | 'md' | 'lg'`, os componentes mapeiam `'sm' = 64px` [Game helper], `'md' = 96px` [Home hero] e `'lg' = 136px` [Result card], aceitando `'xl' = 160px` como variante estendida opcional).*
- **Propriedade `mood`:**
  - `'happy'` (Padrão): Olhos semicirculares brilhantes, sorriso acolhedor aberto, bochechas rosadas suaves (`#ff9aa2`), sinetas em repouso simétrico.
  - `'think'` (Analisando / Aguardando tentativa): Olhar direcionado para o alto/diagonal, sobrancelha arqueada curiosa, boca em pequeno "o" reflexivo, leve inclinação de `4deg` na caixa do relógio.
  - `'celebrate'` (Acerto / Conquista): Olhos em arco feliz (`^ ^`), sorriso largo radiante, sinetas vibrando com linhas acústicas curvas e pequenas estrelas douradas ao redor (animação desativada se `prefers-reduced-motion: reduce`).
  - `'hint'` (Dica Pedagógica): Um olho piscando amigavelmente, expressão encorajadora e uma pequena lâmpada/halo luminoso junto à sineta direita.
- **Propriedade `ambient`:**
  - `'day'` (usado em `manha` e `tarde`): Corpo com aro azul-oficina (`#1560bd`), mostrador facial creme (`#fffdf5`) e brilho solar quente nas sinetas (`#ffb703`).
  - `'night'` (usado em `madrugada` e `noite`): Corpo com reflexo índigo suave, brilho âmbar aconchegante no mostrador facial e um pequeno gorro/estrela noturna acoplado sem ocultar as duas sinetas gêmeas.

### 6.2. `<PeriodMedallion period={'madrugada'|'manha'|'tarde'|'noite'} />`
Medalhão circular (`viewBox="0 0 32 32"`) que acompanha sempre as fichas de período (`--color-period: #7b2cbf`) e o cabeçalho de atmosfera:
- `madrugada`: Céu violeta-escuro com estrela d'alva de 4 pontas e horizonte suave.
- `manha`: Sol dourado (`#ffb703`) erguendo-se acima de uma linha de horizonte clara com raios ascendentes.
- `tarde`: Sol pleno radiante no zênite/poente quente (`#fb8500`) com nuvem acolhedora.
- `noite`: Lua crescente dourada (`#fde047`) acompanhada de duas estrelinhas sobre fundo índigo.

### 6.3. `<HandBadge type={'hour'|'minute'} />`
Mini-badges geométricos (`24×24px`, `viewBox="0 0 24 24"`) renderizados dentro das fichas, lacunas e dicas para garantir leitura imediata por pessoas com daltonismo:
- `type="hour"`: Moldura **circular** azul (`#1560bd` com fundo `#e8f1fc`), contendo o glifo de um ponteiro curto e largo apontando para a direita com ponta em seta arredondada.
- `type="minute"`: Moldura em **losango arredondado (diamante)** vermelho-coral (`#d62839` com fundo `#fff5f6`), contendo o glifo de um ponteiro longo e fino com pequeno anel/ilhós vazado antes da ponta.

### 6.4. `<ColonBadge animated={boolean} />`
Separador central (`:`) entre Horas e Minutos no visor digital e na área de montagem:
- Composto por dois pontos táteis dourados (`--color-colon-on-dark: #ffb703` sobre fundo escuro `#1e2832`, ou `#1e2832` com anel dourado sobre fundo claro).
- Quando `animated={true}` (e `prefers-reduced-motion: no-preference`), pulsa suavemente em opacidade (`1.0` ↔ `0.45`, ciclo de `1s` sincronizado com o segundo).

### 6.5. Família Duotone `UiIcons`
Conjunto coeso de ícones SVG (`viewBox="0 0 24 24"`, traço principal `2.25px`, camada secundária duotone com `opacity="0.22"`):
- **Áudio e Voz:** `BellOn` / `VolumeOn`, `BellOff` / `VolumeOff`, `VoiceOn`, `VoiceOff`, `SpeakWave`.
- **Navegação e Controles:** `BackArrow`, `NextArrow`, `RefreshArrow`, `HomeWorkshop`, `CloseCross`, `ChevronLeft`, `ChevronRight`, `ChevronDown`.
- **Pedagógicos, Progresso e PWA:** `HintBulb`, `CheckBadge`, `OfflineCheck`, `SparkleStar`, `StarFilled`, `StarOutline`, `TrophyCup`, `TeacherBook`, `InstallApp`, `StopwatchNow`, `HourglassTime`.
- **Modos Pedagógicos (Fallbacks Vetoriais):** `DigitalBlocks` (Modo Números), `PuzzleWords` (Modo Palavras), `ClockHands` (Modo Ponteiros), `CompassExplore` (Modo Explorar).

### 6.6. Ícones PWA e Regra de Safe-Zone `maskable-512`
Para instalação offline em tablets escolares, Chromebooks, Android e iOS:
- `icon-192.png` (`192×192px`) e `icon-512.png` (`512×512px`): Ícone padrão com o rosto do mascote Tic e ponteiros azul (`#1560bd`) e vermelho-coral (`#d62839`).
- `maskable-512.png` (`512×512px`):
  - **Safe-Zone Obrigatória de 80%:** Todo elemento essencial (mostrador do Tic, sinetas gêmeas, olhos e ponteiros) deve estar estritamente inscrito no círculo central de **80% do diâmetro (`409,6 × 409,6 px`)**, ou seja, mantendo uma margem de segurança mínima de **`51,2 px` (10%) em cada borda**.
  - Os 20% externos são preenchidos exclusivamente pelo fundo contínuo da oficina (`#1560bd` / `#ffb703`) sem cortes abruptos para suportar máscaras circulares, squircle e lágrima do Android.

---

## 7. Ilustrações dos 4 Cards de Modo (Masters + WebP `384×384`)

Os 4 cards da tela inicial utilizam ilustrações ricas no estilo **3D Tactile Wooden Toy & Matte Paper-Craft**, iluminação suave top-left, fundo uniforme `#FFFDF5` e **zero texto, números, letras ou marcas d'água** (evitando qualquer artefato tipográfico de IA e mantendo independência de idioma na arte raster):

| ID do Modo | Arquivo Master (`design/source/illustrations/`) | Dimensões / Tamanho Master | Arquivo WebP Final (`design/source/illustrations/webp/`) | Dimensões / Tamanho WebP | Descrição Visual e Elementos Pedagógicos |
| :--- | :--- | :---: | :--- | :---: | :--- |
| **`mode-numbers`** | `mode-numbers-master.jpg` | `1024×1024 px` (`491.893` B) | `mode-numbers.webp` | `384×384 px` (`6.990` B / `6,83 KB`, `q=90`) | Moldura de visor digital escuro (`#1E2832`) com dois pontos dourados (`:`) no centro; bloco azul (`#1560BD`) à esquerda e bloco vermelho-coral (`#D62839`) à direita com pontos geométricos táteis encaixando-se no visor sobre fundo `#FFFDF5`. |
| **`mode-words`** | `mode-words-master.jpg` | `1024×1024 px` (`629.179` B) | `mode-words.webp` | `384×384 px` (`10.640` B / `10,39 KB`, `q=82`) | Balão de fala acolhedor em paper-craft em camadas abrigando três peças de quebra-cabeça horizontais arredondadas: azul (`#1560BD`), vermelho-coral (`#D62839`) e pílula roxa (`#7B2CBF`) com ícone solar/lunar gravado sobre fundo `#FFFDF5`. |
| **`mode-hands`** | `mode-hands-master.jpg` | `1024×1024 px` (`526.192` B) | `mode-hands.webp` | `384×384 px` (`10.596` B / `10,35 KB`, `q=82`) | Close-up em ângulo 3/4 de relógio analógico infantil amarelo-sol (`#FFB703`) com mostrador `#FFFDF5`, marcadores em tracinhos arredondados, ponteiro curto/largo azul (`#1560BD`, seta arredondada) e ponteiro longo/esguio vermelho-coral (`#D62839`) com rastros pontilhados curvos de rotação. *(Nota de iteração futura: os 4 marcadores cardeais 12/3/6/9 em `#0F766E` são decorativos na arte raster; em iteração futura podem usar neutro `#1E2832` ou dourado `#FFB703` para reservar `#0F766E` 100% aos segundos).* |
| **`mode-explore`** | `mode-explore-master.jpg` | `1024×1024 px` (`553.574` B) | `mode-explore.webp` | `384×384 px` (`12.706` B / `12,41 KB`, `q=82`) | Lupa tátil verde-água (`#0F766E`) com cabo laranja (`#FB8500`) e ponteiro fininho de segundos sobre um diorama circular dividido entre dia ensolarado e noite estrelada conectado por engrenagens douradas sobre fundo `#FFFDF5`. |

### 7.1. Orçamento de Performance Raster e Consumo via ES Module Import (`base: './'`)
- **Dimensão de entrega:** `384×384 px` (renderizado em container CSS de `160×160 px` a `192×192 px`, garantindo nitidez Retina `2x`).
- **Teto individual:** Cada arquivo `.webp` deve pesar **`≤ 28 KB` (`28.672` bytes)**.
- **Teto agregado:** A soma dos 4 arquivos `.webp` pesa **`40.932` bytes (`39,97 KB`)**, muito abaixo do limite de **`≤ 110 KB` (`112.640` bytes)**.
- **Importação Estática Compatível com Vite (`base: './'`):** Na implementação em `src/`, os arquivos `.webp` copiados para `src/assets/illustrations/` devem ser importados via ES Modules (para que o Vite gere URLs relativas com hash compatíveis com `base: './'`), **nunca** com caminhos absolutos `/illustrations/...`:
  ```tsx
  import modeNumbersImg from '@/assets/illustrations/mode-numbers.webp';
  import modeWordsImg from '@/assets/illustrations/mode-words.webp';
  import modeHandsImg from '@/assets/illustrations/mode-hands.webp';
  import modeExploreImg from '@/assets/illustrations/mode-explore.webp';

  // Exemplo de renderização no ModeCard:
  <img
    src={modeNumbersImg}
    alt=""
    aria-hidden="true"
    width={192}
    height={192}
    decoding="async"
  />
  ```

---

## 8. Matriz Completa 1-para-1: `Emoji / Glifo Legado → Componente / Asset`

Para eliminar 100% da dependência de renderização inconsistente de emojis nativos do sistema operacional (Windows, Android, iOS, Linux) identificada em `index.html` e `js/app.js`, todo emoji ou glifo textual do código legado possui um substituto determinístico obrigatório na nova arquitetura visual:

| # | Emoji / Glifo Legado | Localização no Legado (`index.html` / `js/app.js`) | Função Semântica no Jogo | Componente SVG Inline ou Asset Substituto (`F0b` / `F0c`) | Tokens / Props Associados |
| :-: | :---: | :--- | :--- | :--- | :--- |
| 1 | `🔢` | `js/app.js` (`MODES.numbers.icon`) | Card do modo **Números** na tela inicial | Ilustração WebP `mode-numbers.webp` (`import modeNumbersImg from '@/assets/illustrations/mode-numbers.webp'`) + ícone `<UiIcon name="DigitalBlocks" />` | `--color-hour` (`#1560bd`), `--color-minute` (`#d62839`) |
| 2 | `🔤` | `js/app.js` (`MODES.words.icon`) | Card do modo **Palavras** na tela inicial | Ilustração WebP `mode-words.webp` (`import modeWordsImg from '@/assets/illustrations/mode-words.webp'`) + ícone `<UiIcon name="PuzzleWords" />` | `--color-hour`, `--color-minute`, `--color-period` (`#7b2cbf`) |
| 3 | `🕒` | `js/app.js` (`MODES.hands.icon`) | Card do modo **Ponteiros** na tela inicial | Ilustração WebP `mode-hands.webp` (`import modeHandsImg from '@/assets/illustrations/mode-hands.webp'`) + ícone `<UiIcon name="ClockHands" />` | `--color-warning-accent` (`#ffb703`), `--color-hour`, `--color-minute` |
| 4 | `🔍` | `js/app.js` (`MODES.explore.icon`) | Card do modo **Explorar** na tela inicial | Ilustração WebP `mode-explore.webp` (`import modeExploreImg from '@/assets/illustrations/mode-explore.webp'`) + ícone `<UiIcon name="CompassExplore" />` | `--color-second` (`#0f766e`), `--color-warning-warm` (`#fb8500`) |
| 5 | `🌌` | `js/app.js` (`PERIOD_ICONS['da madrugada']`) | Ícone do período **da madrugada** (`00:00–05:59`) | `<PeriodMedallion period="madrugada" />` | `--color-period` (`#7b2cbf`), `[data-ambient="madrugada"]` |
| 6 | `🌅` | `js/app.js` (`PERIOD_ICONS['da manhã']`) | Ícone do período **da manhã** (`06:00–11:59`) | `<PeriodMedallion period="manha" />` | `--color-period` (`#7b2cbf`), `[data-ambient="manha"]` |
| 7 | `☀️` | `js/app.js` (`PERIOD_ICONS['da tarde']` e toggle `#btn-period`) | Ícone do período **da tarde** (`12:00–17:59`) e indicador diurno no botão de troca `+12h` | `<PeriodMedallion period="tarde" />` | `--color-warning-accent` (`#ffb703`), `[data-ambient="tarde"]` |
| 8 | `🌙` | `js/app.js` (`PERIOD_ICONS['da noite']` e toggle `#btn-period`) | Ícone do período **da noite** (`18:00–23:59`) e indicador noturno no botão de troca `+12h` | `<PeriodMedallion period="noite" />` | `--color-period` (`#7b2cbf`), `[data-ambient="noite"]` |
| 9 | `👩‍🏫` / `👩🏫` | `index.html` (`#btn-teachers` — "Para educadores") | Item do menu abrindo o modal pedagógico/BNCC | `<UiIcon name="TeacherBook" />` | Duotone `--color-hour` (`#1560bd`) + `--color-warning-accent` |
| 10 | `📲` | `index.html` (`#btn-install` — "Instalar") | Botão de instalação do PWA (`beforeinstallprompt`) | `<UiIcon name="InstallApp" />` | Duotone `--color-warning-warm` (`#fb8500`) / `#ffffff` |
| 11 | `✅` | `index.html` (`#offline-badge` — "Funciona sem internet") | Badge informando que o Service Worker está ativo offline | `<UiIcon name="OfflineCheck" />` (ou `<UiIcon name="CheckBadge" />`) | `--color-success` (`#2e7d32`) + `--color-success-soft` (`#e9f5ea`) |
| 12 | `🔔` | `js/app.js` (`#btn-sound` — "Som: ligado") | Estado ativo dos efeitos sonoros Web Audio | `<UiIcon name="BellOn" />` (ou `<UiIcon name="VolumeOn" />`) | `--color-warning-warm` (`#fb8500`) |
| 13 | `🔕` | `js/app.js` (`#btn-sound` — "Som: desligado") | Estado mudo dos efeitos sonoros Web Audio | `<UiIcon name="BellOff" />` (ou `<UiIcon name="VolumeOff" />`) | `--color-ink-muted` (`#475569`) |
| 14 | `🗣️` | `js/app.js` (`#btn-voice` — "Voz: ligada") | Estado ativo da síntese de voz (`speechSynthesis`) | `<UiIcon name="VoiceOn" />` | `--color-hour` (`#1560bd`) |
| 15 | `🤐` | `js/app.js` (`#btn-voice` — "Voz: desligada") | Estado mudo da síntese de voz (`speechSynthesis`) | `<UiIcon name="VoiceOff" />` | `--color-ink-muted` (`#475569`) |
| 16 | `⭐` | `index.html` / `js/app.js` (`#score` — placar da rodada) | Contador de acertos de primeira na barra superior do jogo | `<UiIcon name="SparkleStar" />` | `--color-warning-accent` (`#ffb703`) com contorno `#fb8500` |
| 17 | `★` | `js/app.js` (`.mode-stars` e `.rstar.on` — estrela cheia) | Estrela conquistada no card de modo e na tela de resultado | `<UiIcon name="StarFilled" />` | Preenchimento `#ffb703`, chanfro `#fb8500` |
| 18 | `☆` | `js/app.js` (`.mode-stars` e `.rstar` — estrela vazia) | Estrela ainda não conquistada (1 a 3 estrelas) | `<UiIcon name="StarOutline" />` | Traço `#cbbd9f`, fundo interno `#fff9e6` |
| 19 | `💡` | `index.html` (`#btn-hint` — "Dica") | Botão de solicitação de dica pedagógica | `<UiIcon name="HintBulb" />` + transição do mascote para `<TicMascot mood="hint" />` | `--color-warning-accent` (`#ffb703`) |
| 20 | `🔊` | `index.html` (`#btn-listen` e `#btn-explore-listen` — "Ouvir") | Botão para ouvir a leitura por extenso do horário | `<UiIcon name="SpeakWave" />` | `--color-hour` (`#1560bd`) |
| 21 | `✔` | `index.html` (`#btn-check` — "Pronto! ✔") | Botão de confirmação da posição dos ponteiros no modo Ponteiros | `<UiIcon name="CheckBadge" />` | `--color-success` (`#2e7d32`) / `#ffffff` |
| 22 | `➜` | `index.html` (`#btn-next` — "Próxima ➜") | Botão para avançar à próxima questão após acerto | `<UiIcon name="NextArrow" />` | `--color-success` (`#2e7d32`) / `#ffffff` |
| 23 | `⏱️` | `index.html` (`#btn-now` — "Que horas são agora?") | Botão do modo Explorar que sincroniza com o relógio em tempo real (com segundos) | `<UiIcon name="StopwatchNow" />` | `--color-second` (`#0f766e`) |
| 24 | `⏳` | `index.html` (`.facts` — "1 hora = 60 minutos · 1 minuto = 60 segundos") | Marcador da regra de equivalência de unidades de tempo no modo Explorar | `<UiIcon name="HourglassTime" />` | `--color-second` (`#0f766e`) + `--color-warning-accent` |
| 25 | `🔁` | `index.html` (`#btn-again` — "Jogar de novo") | Botão na tela de resultado para iniciar nova rodada no mesmo modo/nível | `<UiIcon name="RefreshArrow" />` | `--color-success` (`#2e7d32`) / `#ffffff` |
| 26 | `🏠` | `index.html` (`#btn-home` — "Início") | Botão na tela de resultado para retornar à tela inicial | `<UiIcon name="HomeWorkshop" />` | `--color-ink` (`#1e2832`) |
| 27 | `🔴` | `js/app.js` (`errorHint`, `#btn-check`, `#btn-hint` — ponteiro grande) | Referência visual ao ponteiro grande dos **minutos** dentro das frases de dica/erro | `<HandBadge type="minute" />` inline no componente de balão de fala | `--color-minute` (`#d62839`), fundo `--color-minute-soft` (`#fff5f6`), forma losango/diamante |
| 28 | `🔵` | `js/app.js` (`errorHint`, `#btn-check`, `#btn-hint` — ponteiro pequeno) | Referência visual ao ponteiro pequeno das **horas** dentro das frases de dica/erro | `<HandBadge type="hour" />` inline no componente de balão de fala | `--color-hour` (`#1560bd`), fundo `--color-hour-soft` (`#e8f1fc`), forma circular |
| 29 | `←` | `index.html` (`#btn-back` e `#btn-explore-back` — "Voltar ao início") | Botão circular superior esquerdo para voltar à tela inicial | `<UiIcon name="BackArrow" />` | `--color-ink` (`#1e2832`) |
| 30 | `✕` | `index.html` (`#btn-close-teachers` — "Fechar") | Botão de fechamento do `<dialog id="teachers">` (Para educadores e famílias) | `<UiIcon name="CloseCross" />` | `--color-ink` (`#1e2832`) |
| 31 | `‹` | `js/app.js` (`.level-step` — "Nível anterior") | Botão circular esquerdo do seletor de nível na tela inicial | `<UiIcon name="ChevronLeft" />` | `--color-warning-warm` (`#fb8500`) |
| 32 | `›` | `js/app.js` (`.level-step` — "Próximo nível") | Botão circular direito do seletor de nível na tela inicial | `<UiIcon name="ChevronRight" />` | `--color-warning-warm` (`#fb8500`) |
| 33 | `▾` | `js/app.js` (`.level-caret` — abrir dropdown de níveis) | Indicador de expansão do listbox de níveis (`#level-current`) | `<UiIcon name="ChevronDown" />` (com rotação CSS `180deg` quando `aria-expanded="true"`) | `--color-warning-warm` (`#fb8500`) |
