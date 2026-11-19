# Sistema Visual Definitivo — "Oficina Tátil do Tempo" (`Relógio Maluco`)

> **Status:** Especificação Visual Definitiva (F0c) — Acordos da Rodada 2 + Revisões Cruzadas (Codex, Grok & Argon)  
> **Direção de Arte:** *Oficina Tátil do Tempo* (Brinquedo de madeira Montessori & Paper-Craft fosco em camadas)  
> **Acessibilidade & Conformidade:** WCAG 2.1 AA estrito (`≥ 4,5:1` texto normal / `≥ 3,0:1` componentes gráficos), redundância geométrica obrigatória para daltonismo e conformidade `AGPL-3.0-or-later`.

---

## 1. Visão Geral e Princípios da Direção Visual

A **"Oficina Tátil do Tempo"** transforma o aprendizado de leitura de horas (analógica, digital e por extenso em português) em uma experiência concreta, acolhedora e livre de sobrecarga cognitiva para crianças em fase de alfabetização matemática (6 a 10 anos):

1. **Invariância Cromo-Pedagógica (CCR — Color-Concept Binding):** Cada grandeza temporal possui uma assinatura cromática, geométrica e tátil **única e imutável** em todas as telas, modos de jogo, dicas e feedbacks:
   - **Hora (`--color-hour`):** Azul Cobalto Real (`#1560bd`) + forma **curta/larga com seta arredondada / ícone circular**.
   - **Minuto (`--color-minute`):** Vermelho-Coral Vibrante (`#d62839`) + forma **longa/esguia com ilhós vazado / ícone losango-anel**.
   - **Período do Dia (`--color-period`):** Roxo Ametista (`#7b2cbf`) + formato **pílula (`9999px`) com medalhão celeste `<PeriodMedallion />`**.
   - **Segundo (`--color-second`):** Verde-Água Profundo (`#0f766e`) + ponteiro **agulha fina com contrapeso circular**.
   - **Sucesso (`--color-success`):** Verde Floresta (`#2e7d32`) — **estritamente desacoplado de `--color-second`** para evitar ambiguidade semântica entre "segundos" e "resposta correta".
2. **Isolamento de Superfície Pedagógica:** O fundo da aplicação reage ao ciclo de 24 horas (4 atmosferas: `madrugada`, `manha`, `tarde`, `noite`), mas **os cards de atividade (`#ffffff`) e o mostrador do relógio (`#fffdf5`) permanecem sempre claros**. Isso garante que os contrastes WCAG AA validados dos tokens pedagógicos nunca degradem quando a criança explora horários noturnos.
3. **Fisicalidade Tátil (3D Toy & Matte Paper-Craft):** Botões, fichas encaixáveis e controles possuem chanfro inferior físico (`-ledge` de `3px` a `4px`), bordas arredondadas generosas (`16px` a `24px`) e resposta imediata de pressão (`translateY(2px)` no `:active`).

---

## 2. Tokens Pedagógicos WCAG AA (Travados sob CCR)

Todos os tokens abaixo foram auditados contra as superfícies claras primárias (`#ffffff` para cards/fichas e `#fffdf5` para o mostrador do relógio) e superfícies escuras (`#1e2832` / `#263238` para o visor digital), cumprindo **WCAG 2.1 AA (≥ 4,5:1 para texto normal)**.

### 2.1. Tabela Mestre de Tokens Pedagógicos e Semânticos

| Token CSS | Hex | Papel Semântico / Pedagógico | Contraste em `#ffffff` | Contraste em `#fffdf5` | Token `-soft` (Fundo Ficha/Badge) | Token `-ledge` (Borda/Sombra 3D) |
| :--- | :--- | :--- | :---: | :---: | :--- | :--- |
| `--color-hour` | `#1560bd` | **Horas** (ponteiro curto, dígitos HH, ficha de hora) | **6,10 : 1** (AA) | **5,99 : 1** (AA) | `--color-hour-soft: #e8f1fc` | `--color-hour-ledge: #0d4285` |
| `--color-minute` | `#d62839` | **Minutos** (ponteiro longo, dígitos MM, ficha de minuto) | **4,97 : 1** (AA) | **4,88 : 1** (AA) | `--color-minute-soft: #fdebed` | `--color-minute-ledge: #9b1826` |
| `--color-period` | `#7b2cbf` | **Período 24h** (da manhã, da tarde, da noite, da madrugada) | **7,11 : 1** (AA) | **6,98 : 1** (AA) | `--color-period-soft: #f3eafa` | `--color-period-ledge: #561d87` |
| `--color-second` | `#0f766e` | **Segundos / Modo Explorar** (ponteiro fino, engrenagens de tempo contínuo) | **5,47 : 1** (AA) | **5,37 : 1** (AA) | `--color-second-soft: #e6f4f2` | `--color-second-ledge: #0a524c` |
| `--color-success` | `#2e7d32` | **Acerto / Confirmação** (desacoplado de `--color-second`; nunca isolado só por cor) | **5,13 : 1** (AA) | **5,03 : 1** (AA) | `--color-success-soft: #e9f5ea` | `--color-success-ledge: #1b5e20` |

### 2.2. Tokens para Superfície Escura (Visor Digital `#1e2832` / `#263238`)

Dentro do visor digital escuro (`--color-visor-bg: #1e2832`, moldura `--color-visor-bezel: #263238`), os tokens primários de hora e minuto são substituídos por suas variantes luminosas de alto contraste:

| Token CSS | Hex | Uso no Visor Digital Escuro | Contraste em `#1e2832` | Contraste em `#263238` |
| :--- | :--- | :--- | :---: | :---: |
| `--color-hour-on-dark` | `#8ec5ff` | Dígitos de **Hora (HH)** e badge `H` dentro do visor digital escuro | **7,26 : 1** (AAA) | **6,31 : 1** (AA) |
| `--color-minute-on-dark` | `#ff9aa2` | Dígitos de **Minuto (MM)** e badge `M` dentro do visor digital escuro | **6,51 : 1** (AA) | **5,66 : 1** (AA) |
| `--color-colon-on-dark` | `#ffb703` | Dois-pontos central (`<ColonBadge />`) no visor digital escuro | **7,58 : 1** (AAA) | **6,59 : 1** (AA) |

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
  --color-hour-on-dark: #8ec5ff;
  --color-minute-on-dark: #ff9aa2;
  --color-colon-on-dark: #ffb703;

  /* Tokens Pedagógicos Travados (CCR) */
  --color-hour: #1560bd;
  --color-hour-soft: #e8f1fc;
  --color-hour-ledge: #0d4285;

  --color-minute: #d62839;
  --color-minute-soft: #fdebed;
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

Nenhuma informação pedagógica ou estado de interface pode depender exclusivamente de cor (WCAG 1.4.1 — *Use of Color*). Todo elemento de Hora, Minuto, Período, Segundo e Sucesso deve combinar **Cor + Silhueta Geométrica + Padrão de Borda + Mini-Badge Iconográfico**:

| Conceito | Cor (`CCR`) | Geometria do Ponteiro | Geometria da Ficha / Lacuna (Slot) | Mini-Badge Obrigatório |
| :--- | :--- | :--- | :--- | :--- |
| **Hora** | `#1560bd` | **Curto e Largo** (`comprimento: 52%` do raio, `largura: 10px`), ponta em **seta triangular arredondada** | Retângulo de cantos médios (`border-radius: 12px`), **borda contínua sólida** (`2.5px solid #1560bd`), chanfro inferior `#0d4285` | `<HandBadge type="hour" />` — Medalhão **circular** com ícone de ponteiro curto/seta e rótulo `H` |
| **Minuto** | `#d62839` | **Longo e Esguio** (`comprimento: 78%` do raio, `largura: 6px`), com **anel/ilhós circular vazado** próximo à ponta | Retângulo com **entalhe lateral / borda dupla ou tracejada** (`2.5px dashed #d62839` nas lacunas vazias; sólida + friso duplo preenchida) | `<HandBadge type="minute" />` — Medalhão em **losango arredondado (diamante)** com ícone de ponteiro longo/anel e rótulo `M` |
| **Período (24h)** | `#7b2cbf` | N/A (representado no anel externo 24h e no medalhão do mostrador) | Formato **pílula completa** (`border-radius: 9999px`), borda pontilhada nas lacunas e sólida com friso interno quando preenchida | `<PeriodMedallion period={...} />` — Ícone celeste distinto (Estrela-Alvorada, Sol Pleno, Sol Poente, Lua Crescente) |
| **Segundo** | `#0f766e` | **Agulha Extrafina** (`comprimento: 82%` do raio, `largura: 2.5px`) com **contrapeso circular** na extremidade oposta | Badge circular com aro dentado de engrenagem (exclusivo do modo Explorar) | Ícone de engrenagem/lupa com marcações de tique-taque |
| **Sucesso** | `#2e7d32` | Halo de brilho suave ao redor do mostrador sem alterar a cor dos ponteiros | Borda `#2e7d32` + fundo `#e9f5ea` + **ícone de check duotone + partículas de estrela** | Nunca comunicado só por cor: exige `<UiIcon name="CheckBadge" />` + reação `mood="celebrate"` do `<TicMascot />` + texto afirmativo |

---

## 4. As 4 Atmosferas do Ciclo de 24 Horas (`[data-ambient]`)

O plano de fundo externo da aplicação (`body` / `.workshop-stage`) transiciona suavemente (`transition: background 600ms cubic-bezier(0.22, 1, 0.36, 1)`) entre 4 atmosferas que ensinam a relação entre a leitura do relógio e o ciclo real do dia.

### 4.1. Regra de Ouro de Contraste nas Atmosferas
- **Dentro dos Cards e Mostrador:** Superfícies continuam `#ffffff` e `#fffdf5`, preservando 100% dos contrastes da Seção 2.
- **Fora dos Cards (Cabeçalho, Barra de Navegação, Chips de Status, Rodapé):** Utilizam os tokens `--ambient-ink`, `--ambient-ink-muted` e `--ambient-surface-pill`, garantindo **contraste mínimo ≥ 4,5:1** em qualquer ponto do gradiente de fundo.

### 4.2. Matriz de Tokens das 4 Atmosferas

| Período (`data-ambient`) | Faixa Horária | Gradiente de Fundo (`--ambient-bg`) | Texto Externo (`--ambient-ink`) | Texto Secundário (`--ambient-ink-muted`) | Contraste Mínimo Auditado (`--ambient-ink` vs fundo) | Superfície de Chip/HUD Externo (`--ambient-pill-bg`) |
| :--- | :---: | :--- | :--- | :--- | :---: | :--- |
| **`madrugada`** | `00:00 – 05:59` | `linear-gradient(160deg, #1b1947 0%, #312e81 55%, #4c1d95 100%)` | `#f8fafc` | `#cbd5e1` | **9,42 : 1** (AAA) | `rgba(15, 23, 42, 0.58)` com borda `#818cf8` |
| **`manha`** | `06:00 – 11:59` | `linear-gradient(160deg, #e0f2fe 0%, #fef3c7 60%, #fffbeb 100%)` | `#0f172a` | `#334155` | **13,10 : 1** (AAA) | `rgba(255, 255, 255, 0.86)` com borda `#93c5fd` |
| **`tarde`** | `12:00 – 17:59` | `linear-gradient(160deg, #ffedd5 0%, #fde68a 55%, #fed7aa 100%)` | `#1c1917` | `#44403c` | **11,84 : 1** (AAA) | `rgba(255, 253, 245, 0.88)` com borda `#fb923c` |
| **`noite`** | `18:00 – 23:59` | `linear-gradient(160deg, #0f172a 0%, #1e293b 55%, #1e1b4b 100%)` | `#f8fafc` | `#cbd5e1` | **13,75 : 1** (AAA) | `rgba(15, 23, 42, 0.64)` com borda `#64748b` |

---

## 5. Tipografia Self-Hosted `.woff2` (Orçamento ≤ 45 KB)

Para garantir carregamento instantâneo offline (PWA), zero requisições externas ao Google Fonts (privacidade infantil e LGPD/COPPA) e legibilidade máxima para crianças em fase de alfabetização:

### 5.1. Família Tipográfica e Licença
- **Fonte Primária (Display, UI e Leitura por Extenso):** **Fredoka** (ou **Nunito**), variável/pesos `600 SemiBold` e `700 Bold`, licenciada sob **SIL Open Font License 1.1 (`OFL-1.1`)**, totalmente compatível com distribuição em projetos `AGPL-3.0-or-later`.
- **Alinhamento Numérico:** `font-variant-numeric: tabular-nums` obrigatório em todos os visores digitais, contadores e opções numéricas para evitar jitter horizontal ao incrementar minutos/segundos.
- **Orçamento Estrito de Bundle:** A soma dos arquivos `.woff2` self-hosted em `public/fonts/` deve ser **≤ 45 KB** (`46080` bytes).

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

### 5.3. Fallback Tipográfico Calibrado com `size-adjust` (Zero CLS)

```css
@font-face {
  font-family: 'Oficina Rounded';
  src: url('/fonts/fredoka-ptbr-subset.woff2') format('woff2');
  font-weight: 500 700;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Oficina Rounded Fallback';
  src: local('Arial Rounded MT Bold'), local('Trebuchet MS'), local('Segoe UI'), local('sans-serif');
  size-adjust: 103.5%;
  ascent-override: 94%;
  descent-override: 24%;
  line-gap-override: 0%;
}

:root {
  --font-sans: 'Oficina Rounded', 'Oficina Rounded Fallback', system-ui, -apple-system, sans-serif;
}
```

---

## 6. Especificações dos Componentes SVG Inline e Ícones PWA

Todos os elementos vetoriais de interface são construídos em **SVG inline sem dependências externas**, utilizando `viewBox` padronizado, `stroke-linecap="round"`, `stroke-linejoin="round"` e acessibilidade nativa (`aria-hidden="true"` quando decorativo ou `role="img"` + `<title>` quando semântico).

### 6.1. `<TicMascot mood={'happy'|'think'|'celebrate'|'hint'} ambient={'day'|'night'} />`
O mascote **Tic** é um despertador mecânico de madeira e latão amigável que atua como tutor afetivo da criança.
- **Invariante Anatômica Obrigatória:** As **duas sinetas superiores gêmeas (`twin bells`) em latão dourado (`#ffb703` / `#fb8500`), o martelinho central e a alça curva superior** devem estar **sempre presentes** em todos os estados (`mood` e `ambient`). Essa silhueta garante reconhecimento imediato da personagem mesmo em tamanhos reduzidos (`48×48px`).
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
- `type="minute"`: Moldura em **losango arredondado (diamante)** vermelho-coral (`#d62839` com fundo `#fdebed`), contendo o glifo de um ponteiro longo e fino com pequeno anel/ilhós vazado antes da ponta.

### 6.4. `<ColonBadge animated={boolean} />`
Separador central (`:`) entre Horas e Minutos no visor digital e na área de montagem:
- Composto por dois pontos táteis dourados (`#ffb703` sobre fundo escuro `#1e2832`, ou `#1e2832` com anel dourado sobre fundo claro).
- Quando `animated={true}` (e `prefers-reduced-motion: no-preference`), pulsa suavemente em opacidade (`1.0` ↔ `0.45`, ciclo de `1s` sincronizado com o segundo).

### 6.5. Família Duotone `UiIcons`
Conjunto coeso de ícones SVG (`viewBox="0 0 24 24"`, traço principal `2.25px`, camada secundária duotone com `opacity="0.22"`):
- Navegação e Ações: `BackArrow`, `RefreshArrow`, `VolumeOn`, `VolumeOff`, `HintBulb`, `CheckBadge`, `SparkleStar`, `TrophyCup`.
- Modos Pedagógicos: `DigitalBlocks` (Modo Números), `PuzzleWords` (Modo Palavras), `ClockHands` (Modo Ponteiros), `CompassExplore` (Modo Explorar).

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
| **`mode-numbers`** | `mode-numbers-master.jpg` | `1024×1024 px` (`491.893` B) | `mode-numbers.webp` | `384×384 px` (`4.416` B / `4,31 KB`) | Moldura de visor digital escuro (`#1E2832`) com dois pontos dourados (`:`) no centro; bloco azul (`#1560BD`) à esquerda e bloco vermelho-coral (`#D62839`) à direita com pontos geométricos táteis encaixando-se no visor sobre fundo `#FFFDF5`. |
| **`mode-words`** | `mode-words-master.jpg` | `1024×1024 px` (`629.179` B) | `mode-words.webp` | `384×384 px` (`10.640` B / `10,39 KB`) | Balão de fala acolhedor em paper-craft em camadas abrigando três peças de quebra-cabeça horizontais arredondadas: azul (`#1560BD`), vermelho-coral (`#D62839`) e pílula roxa (`#7B2CBF`) com ícone solar/lunar gravado sobre fundo `#FFFDF5`. |
| **`mode-hands`** | `mode-hands-master.jpg` | `1024×1024 px` (`526.192` B) | `mode-hands.webp` | `384×384 px` (`10.596` B / `10,35 KB`) | Close-up em ângulo 3/4 de relógio analógico infantil amarelo-sol (`#FFB703`) com mostrador `#FFFDF5`, marcadores em tracinhos arredondados, ponteiro curto/largo azul (`#1560BD`, seta arredondada) e ponteiro longo/esguio vermelho-coral (`#D62839`) com rastros pontilhados curvos de rotação. |
| **`mode-explore`** | `mode-explore-master.jpg` | `1024×1024 px` (`553.574` B) | `mode-explore.webp` | `384×384 px` (`12.706` B / `12,41 KB`) | Lupa tátil verde-água (`#0F766E`) com cabo laranja (`#FB8500`) e ponteiro fininho de segundos sobre um diorama circular dividido entre dia ensolarado e noite estrelada conectado por engrenagens douradas sobre fundo `#FFFDF5`. |

### 7.1. Orçamento de Performance Raster
- **Dimensão de entrega:** `384×384 px` (renderizado em container CSS de `160×160 px` a `192×192 px`, garantindo nitidez Retina `2x`).
- **Teto individual:** Cada arquivo `.webp` deve pesar **`≤ 28 KB` (`28.672` bytes)**.
- **Teto agregado:** A soma dos 4 arquivos `.webp` deve pesar **`≤ 110 KB` (`112.640` bytes)**.
- **Marcação HTML recomendada nos cards:**
  ```html
  <img
    src="/illustrations/mode-numbers.webp"
    alt=""
    aria-hidden="true"
    width="192"
    height="192"
    decoding="async"
  />
  ```
