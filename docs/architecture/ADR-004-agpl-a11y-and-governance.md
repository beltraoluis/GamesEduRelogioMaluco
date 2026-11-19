# ADR-004 — AGPL, privacidade, acessibilidade e governança

- **Status:** Aceito (G0)
- **Data:** 2026-11-19
- **Decisores:** Coordenador Antigravity, Assessor Opus, Argon, Codex, Grok; aprovado pelo usuário
- **Sincronização:** F0c `a6cdd25` (`design/specs/visual-system.md`)
- **Contratos:** `PEDAGOGICAL_COLORS`, `AnswerRegionProps`, `SlotProps`, `TeachersDialogProps`, `AppMenuProps`

## Contexto

O legado é servido sem build, então os arquivos publicados já eram o código-fonte (AGPL §13). Com o bundle do Vite isso deixa de valer. O público são crianças (LGPD art. 14) e o jogo usa cores para ensinar, o que exige cuidado com daltonismo. Vários agentes trabalham em paralelo, por isso as regras de mudança dos contratos precisam ser explícitas.

## Decisão

### 1. AGPL-3.0-or-later §13 depois do build

O código minificado não é a "forma preferida para modificação". Por isso, todo build publicado oferece o fonte correspondente:

- **Link `tree/{commit}`**: URL do repositório no commit exato do build, injetada no build (ex.: `import.meta.env.VITE_SOURCE_URL`), e não um link para a branch.
- Artefatos copiados para o `dist/` na etapa pós-build:
  - `LICENSE.txt`: texto integral da AGPL-3.0;
  - `THIRD_PARTY_LICENSES.txt`: licenças das dependências empacotadas (gerado automaticamente);
  - `ASSETS-LICENSE.md`: licença dos assets (mascote Tic, ícones, fonte), com referência aos **masters** editáveis (SVG fonte) no repositório.
- Item **"Código-fonte"** no menu (`AppMenuProps.sourceUrl`), além do aviso e do link no diálogo dos educadores (`TeachersDialogProps.sourceUrl`) e no fallback estático de boot (ADR-003).
- **Cabeçalho SPDX** obrigatório em todo arquivo de código-fonte:

  ```ts
  // SPDX-License-Identifier: AGPL-3.0-or-later
  // Copyright (C) 2026 Luis Henrique Coutinho Beltrão
  ```

  verificado por lint e CI.

### 2. LGPD, art. 14 (dados de crianças)

- Nenhum dado pessoal é coletado, enviado ou compartilhado: sem analytics, sem rastreadores, sem fontes ou scripts de terceiros em runtime.
- O único dado salvo é o progresso local (`relogio-maluco-v1`: nível, som, voz, estrelas), que fica só no aparelho.
- O diálogo dos educadores explica isso em linguagem simples e oferece "Apagar estrelas" (`resetStars`).

### 3. Cores e daltonismo

Referência única deste projeto: **WCAG 2.2 nível AA** (≥ 4,5:1 para texto normal, ≥ 3:1 para texto grande e componentes gráficos, critério 1.4.1 *Use of Color*). Onde o F0c cita "WCAG 2.1 AA", leia-se 2.2 AA. Os limiares de contraste são os mesmos nas duas versões.

- **Cores pedagógicas fixas** em `PEDAGOGICAL_COLORS` (horas `#1560bd`, minutos `#d62839`, período `#7b2cbf`, segundos `#0f766e`, sucesso `#2e7d32`), sempre sobre superfícies claras invariantes: card `#ffffff` e mostrador `#fffdf5`, que não mudam com a atmosfera. Medição do F0b: entre **4,88:1 e 7,11:1**.
- **Superfície escura do visor digital** (F0c): fundo `#1e2832` e moldura `#263238`. Dígitos usam `hourOnDark` `#8ec5ff` e `minuteOnDark` `#ff9aa2`, com contraste **≥ 6,51:1 nas duas superfícies**. Medição do F0b: `#8ec5ff` dá 8,24:1 / 7,26:1 e `#ff9aa2` dá 7,40:1 / 6,51:1 (sobre `#1e2832` / `#263238`).
  - Nota: a tabela 2.2 do `visual-system.md` (F0c) mostra valores deslocados uma coluna (ex.: lista 7,26:1 para `#8ec5ff` em `#1e2832`, que é o valor em `#263238`). Como o mínimo continua ≥ 6,51:1, a conclusão AA não muda. A correção da tabela fica para o F0c.
- **Nota F0c, `--color-colon-on-dark` (`#ffb703`):** é o dourado dos dois-pontos (`ColonBadge`) no visor escuro (8,56:1 / 7,54:1). **Não faz parte dos tokens travados sob CCR** (`PEDAGOGICAL_COLORS`): é token de tema do F0c e pode ser ajustado sem CCR, desde que mantenha ≥ 4,5:1 no visor. O mesmo vale para `-soft`, `-ledge` e `--ambient-*`.
- **Redundância geométrica obrigatória**, alinhada à especificação definitiva do F0c (`design/specs/visual-system.md` §3). Cor nunca é o único sinal:

  | Grupo | Ficha / lacuna | Ponteiro | Selo |
  |---|---|---|---|
  | **Horas** | **bloco retangular com filete sólido lateral** (borda contínua sólida, cantos médios) | curto e largo, ponta em seta arredondada | `HandBadge` circular, rótulo `H` |
  | **Minutos** | **borda tracejada / entalhe lateral** (tracejada vazia; sólida com friso duplo quando preenchida) | longo e esguio, com ilhós vazado perto da ponta | `HandBadge` em losango, rótulo `M` |
  | **Período** | **formato pílula** (`border-radius: 9999px`) **+ medalhão ilustrado** (`PeriodMedallion`) | (não se aplica) | ícone celeste por período |
  | Segundos (explorar) | (não se aplica) | agulha extrafina com contrapeso circular | (não se aplica) |

  - certo e errado são indicados também por ícone (`CheckBadge`), texto e humor do mascote, não só por verde e vermelho;
  - essas geometrias ficam sob CCR junto com as cores (seção 5).
- Testes visuais rodam com simulação de protanopia, deuteranopia e tritanopia em F3.

### 4. Interação e semântica

- **Tile-first:** quem age é a ficha (`<button>`), por arrasto, toque, Enter ou Espaço. A ficha vai para a primeira lacuna vazia do seu grupo. A lacuna (`<Slot>`) não é botão nem recebe foco. Ela anuncia "Lacuna das horas, vazia" e depois "horas: 03".
- **Região de resposta** com `role="group"` e `aria-label` descritivo por modo (`ANSWER_REGION_LABELS`).
- Balão do mascote com `aria-live="polite"` (nunca `assertive`) e texto de `toPlainText`.
- **`<dialog>` nativo** (`showModal()`) para os educadores: foco preso e Esc pelo navegador. **Sem scroll-lock no `:root`**, ou seja, nada de `overflow: hidden` em `html`/`body`, porque isso causa salto de layout e, no iOS, perde a posição de rolagem. O `::backdrop` e `overscroll-behavior: contain` no diálogo resolvem.
- **`prefers-reduced-motion`, caso a caso**, e não um "desliga tudo":
  - confete: desligado;
  - pulinho do mascote, tremida da ficha errada e brilho da dica: trocados por mudança de cor e contorno sem movimento;
  - rotação dos ponteiros: mantida sem transição longa, porque ela é a informação;
  - estrelas do resultado: aparecem sem escala.

### 5. Governança

- **Coordenador:** Antigravity. Distribui tarefas, integra branches e decide gates (G0, G1...).
- **Assessor:** Opus. Revisa arquitetura e contratos, e propõe e redige ADRs e CCRs.
- **Salvaguarda de família distinta (estrita):** o revisor de uma entrega precisa ser de **família de modelo diferente** da do autor (ex.: entrega Opus revisada por Codex, Grok ou Argon). Nenhuma entrega é aprovada só por modelos da mesma família.
- **CCR (Contract Change Request)** é obrigatório para alterar:
  - `src/contracts/index.ts`, `src/domain/types.ts`, `src/domain/messages.ts` (assinaturas e tipos);
  - **tokens pedagógicos** (`PEDAGOGICAL_COLORS` e os tokens CSS que os espelham), formas da redundância geométrica e o formato salvo em `relogio-maluco-v1`;
  - qualquer ADR aceito.

  O CCR descreve a mudança, o motivo e o impacto nas fases em andamento. Precisa do aval do Coordenador e da revisão de família distinta, e o usuário aprova quando a mudança altera o comportamento pedagógico ou visual.
- Escopo de arquivos por tarefa é exclusivo: um worker só edita os arquivos do seu escopo.

## Consequências

- Cada deploy fica rastreável ao commit e cumpre a AGPL sem depender de o código estar legível no `dist/`.
- O jogo continua utilizável por crianças daltônicas e por leitores de tela.
- Contratos estáveis permitem F1–F3 em paralelo. O custo é o rito de CCR para qualquer ajuste.

## Alternativas rejeitadas

- **Link para a branch `main`** em vez de `tree/{commit}`: não corresponde ao código em execução.
- **Lacunas como botões (slot-first):** dobra as paradas de Tab e confunde a ordem da interação.
- **Modal customizado com scroll-lock:** reimplementa o foco do `<dialog>` e quebra a rolagem no iOS.
- **Desligar toda animação com movimento reduzido:** remove também a rotação dos ponteiros, que é o conteúdo ensinado.
