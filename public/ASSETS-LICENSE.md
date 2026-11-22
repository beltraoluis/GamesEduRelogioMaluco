# Licença, Proveniência e Auditoria Técnica de Ativos Visuais (`ASSETS-LICENSE.md`)

<!--
  SPDX-FileCopyrightText: 2026 Luis Henrique Coutinho Beltrão
  SPDX-License-Identifier: AGPL-3.0-or-later
-->

- **SPDX-FileCopyrightText:** `2026 Luis Henrique Coutinho Beltrão`
- **SPDX-License-Identifier:** `AGPL-3.0-or-later`

---

## 1. Declaração de Proveniência e Licenciamento (`AGPL-3.0-or-later`)

Todas as ilustrações rasterizadas (arquivos masters em alta resolução e derivados otimizados `.webp`) contidas em `design/source/illustrations/` foram geradas especificamente para o projeto educacional **Relógio Maluco** ("Oficina Tátil do Tempo") a partir de direção de arte, composição cromática e prompts originais da equipe do projeto, sem incorporação de marcas registradas, logotipos, personagens de terceiros, textos protegidos ou fotografias sob copyright restritivo.

- **Licença de Distribuição:** `AGPL-3.0-or-later` (GNU Affero General Public License v3.0 or later), em total conformidade com o repositório principal `GamesEduRelogioMaluco`.
- **Nota sobre Direitos Autorais de Saídas Geradas por IA:** Saídas visuais brutas geradas por modelos de inteligência artificial generativa (referenciados na Seção 2: subagente `image-generator` / pipeline Google DeepMind Gemini Image Generation) podem ter proteção autoral limitada ou inexistente dependendo da jurisdição aplicável. A licença `AGPL-3.0-or-later` aplica-se na medida máxima dos direitos autorais e conexos existentes sobre a direção artística, curadoria, seleção, pós-processamento e integração no software, garantindo que nenhuma restrição proprietária adicional seja imposta a terceiros.
- **Direitos de Uso, Modificação e Redistribuição:** É garantida a liberdade irrestrita de usar, estudar, copiar, modificar, otimizar, recodificar e redistribuir tanto os arquivos-fonte masters (`design/source/illustrations/*-master.jpg`) quanto os ativos compilados de produção (`design/source/illustrations/webp/*.webp`) sob os termos da licença `AGPL-3.0-or-later`.

---

## 2. Metadados de Geração e Pipeline de Otimização

- **Ferramenta / Modelo de Geração:** Antigravity `image-generator` subagent (`generate_image` / Google DeepMind Gemini Image Generation pipeline, orquestrado via Gemini 4 Argon).
- **Data de Geração:** `2026-11-19`
- **Pipeline de Conversão e Otimização WebP:** `sharp` (Node.js `v22.23.4`) com redimensionamento `.resize(384, 384, { fit: 'cover' })` e codificação `.webp({ quality: 90, effort: 6 })` para `mode-numbers.webp` (preservando com nitidez máxima o relevo dos pips táteis na madeira) e `.webp({ quality: 82, effort: 6 })` para `mode-words.webp`, `mode-hands.webp` e `mode-explore.webp`.
- **Inspeção Visual de Qualidade:** Todas as 4 imagens masters e os 4 derivados `.webp` foram inspecionados visualmente para confirmar ausência absoluta de texto, algarismos borrados, letras ou marcas d'água (`STRICTLY NO TEXT, NO NUMBERS, NO LETTERS, NO WATERMARKS`) e consistência estética (*3D tactile wooden toy & matte paper-craft*, iluminação top-left, fundo `#FFFDF5`).

---

## 3. Inventário Técnico de Arquivos, Dimensões e Tamanhos Exatos

### 3.1. Arquivos Masters (`design/source/illustrations/`)

| Modo | Caminho do Arquivo | Formato | Dimensões (`px`) | Tamanho Exato (Bytes) | Tamanho (`KB`) |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **`mode-numbers`** | `design/source/illustrations/mode-numbers-master.jpg` | JPEG | `1024×1024` | `491893` bytes | `480,36 KB` |
| **`mode-words`** | `design/source/illustrations/mode-words-master.jpg` | JPEG | `1024×1024` | `629179` bytes | `614,43 KB` |
| **`mode-hands`** | `design/source/illustrations/mode-hands-master.jpg` | JPEG | `1024×1024` | `526192` bytes | `513,86 KB` |
| **`mode-explore`** | `design/source/illustrations/mode-explore-master.jpg` | JPEG | `1024×1024` | `553574` bytes | `540,60 KB` |
| **Total Masters** | — | — | — | **`2200838` bytes** | **`2149,26 KB`** |

### 3.2. Arquivos WebP Finais de Produção (`design/source/illustrations/webp/`)

| Modo | Caminho do Arquivo | Formato | Dimensões (`px`) | Tamanho Exato (Bytes) | Tamanho (`KB`) | Limite Individual (`≤ 28 KB`) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **`mode-numbers`** | `design/source/illustrations/webp/mode-numbers.webp` | WebP (`q=90, effort=6`) | `384×384` | `6990` bytes | `6,83 KB` | Aprovado (`24,4%` do teto) |
| **`mode-words`** | `design/source/illustrations/webp/mode-words.webp` | WebP (`q=82, effort=6`) | `384×384` | `10640` bytes | `10,39 KB` | Aprovado (`37,1%` do teto) |
| **`mode-hands`** | `design/source/illustrations/webp/mode-hands.webp` | WebP (`q=82, effort=6`) | `384×384` | `10596` bytes | `10,35 KB` | Aprovado (`37,0%` do teto) |
| **`mode-explore`** | `design/source/illustrations/webp/mode-explore.webp` | WebP (`q=82, effort=6`) | `384×384` | `12706` bytes | `12,41 KB` | Aprovado (`44,3%` do teto) |
| **Total WebP (4 arquivos)** | — | — | — | **`40932` bytes** | **`39,97 KB`** | **Aprovado (`≤ 110 KB`)** |

---

## 4. Prompts Exatos Utilizados na Geração

### 4.1. `mode-numbers` (`mode-numbers-master.jpg` → `webp/mode-numbers.webp`)
```text
Square 1:1 3D tactile wooden toy and matte paper-craft illustration, centered medallion composition on a clean warm cream background (#FFFDF5), soft top-left studio lighting with gentle contact shadows. A cute rounded dark slate (#1E2832) wooden digital clock frame with two glowing golden-amber (#FFB703) circular colon dots (:) in the center. Two chunky tactile wooden puzzle blocks are clicking into the left and right slots of the frame: on the left, a royal blue (#1560BD) rounded square block engraved with three clean raised circular pip dots (like a domino/die face, no numerals); on the right, a coral-red (#D62839) rounded rectangular block with a notched base engraved with four clean raised circular pip dots. Playful educational Montessori toy aesthetic, smooth bevels, warm wood grain and matte paper textures. STRICTLY NO TEXT, NO NUMBERS, NO DIGITS, NO LETTERS, NO WORDS, NO WATERMARKS.
```

### 4.2. `mode-words` (`mode-words-master.jpg` → `webp/mode-words.webp`)
```text
Square 1:1 3D tactile wooden toy and matte paper-craft illustration, centered medallion composition on a clean warm cream background (#FFFDF5), soft top-left studio lighting with gentle contact shadows. A cozy layered matte paper-craft speech bubble with a warm cream interior and golden-yellow (#FFB703) rim, cradling three horizontal interlocking rounded wooden jigsaw puzzle tiles arranged side by side: first on the left, a royal blue (#1560BD) tile with a carved circular recess; second in the middle, a coral-red (#D62839) tile with a carved diamond motif; third on the right, a vibrant purple (#7B2CBF) pill-shaped tile embossed with a cute golden sun and crescent moon icon. Tactile Montessori educational toy aesthetic, smooth rounded edges, paper-craft layers and painted wood texture. STRICTLY NO TEXT, NO LETTERS, NO WORDS, NO NUMBERS, NO WATERMARKS.
```

### 4.3. `mode-hands` (`mode-hands-master.jpg` → `webp/mode-hands.webp`)
```text
Square 1:1 3D tactile wooden toy and matte paper-craft illustration, centered medallion composition on a clean warm cream background (#FFFDF5), soft top-left studio lighting with gentle contact shadows. A 3/4 angled close-up of a cheerful children's analog wooden clock with a sunny golden-yellow (#FFB703) cylindrical bezel, warm orange (#FB8500) side accents, and a clean cream (#FFFDF5) dial face. Instead of numbers, the dial perimeter has 12 clean rounded wooden pill-shaped tick marks (4 primary turquoise #0F766E markers at top, right, bottom, left, and 8 smaller slate markers). At the center brass pivot: a short, wide royal blue (#1560BD) hour hand with a rounded arrow tip and a long, slender coral-red (#D62839) minute hand with a small circular ring near its tip. Curved dotted motion trails in matching blue and coral-red show the hands rotating smoothly. STRICTLY NO TEXT, NO NUMBERS, NO DIGITS, NO LETTERS, NO WATERMARKS.
```

### 4.4. `mode-explore` (`mode-explore-master.jpg` → `webp/mode-explore.webp`)
```text
Square 1:1 3D tactile wooden toy and matte paper-craft illustration, centered medallion composition on a clean warm cream background (#FFFDF5), soft top-left studio lighting with gentle contact shadows. A circular paper-craft and wooden diorama split diagonally into a sunny sky-blue daytime half with a golden sun (#FFB703) and soft clouds, and a deep indigo starry nighttime half with a glowing crescent moon and tiny stars, connected by interlocking golden brass gears at the center. Hovering at a playful angle over the diorama is a chunky tactile magnifying glass with a teal-green (#0F766E) ring frame, a warm orange (#FB8500) wooden handle, and a delicate teal-green (#0F766E) sweeping seconds needle with a circular counterweight inside the lens. Montessori educational toy aesthetic, rich matte paper layers and smooth painted wood. STRICTLY NO TEXT, NO NUMBERS, NO LETTERS, NO WORDS, NO WATERMARKS.
```

---

## 5. Mascote Tic, ícones e fonte

O Tic em `src/components/TicMascot/TicMascot.tsx` é a ilustração SVG editável do mascote criada para este projeto, com sinetas, mostrador e expressões desenhados em código. Os ícones de interface em `src/ui/icons/` são desenhos SVG editáveis criados para o projeto. Esses trabalhos, de copyright © 2026 Luis Henrique Coutinho Beltrão, são distribuídos sob AGPL-3.0-or-later, conforme seus cabeçalhos SPDX.

O master editável dos ícones PWA é `public/icons/icon.svg`, desenhado para este projeto a partir da forma diurna e feliz do Tic em `TicMascot.tsx`; os PNGs 192, 512 e Apple 180 são rasterizações desse master. O PNG maskable usa a mesma arte reduzida e centralizada sobre fundo amarelo integral para manter o personagem dentro da zona segura. O master e os derivados são distribuídos sob AGPL-3.0-or-later, copyright © 2026 Luis Henrique Coutinho Beltrão.

A fonte Fredoka é distribuída sob SIL Open Font License 1.1; consulte `src/assets/fonts/OFL.txt` ou `THIRD_PARTY_LICENSES.txt` na distribuição para o texto integral e os respectivos créditos.
