# Matriz de paridade BNCC — legado × React

Documento de QA independente (F1d) para orientar F1–F5. Compara o legado (`legacy/`) com a migração React (`src/`) nas habilidades BNCC, níveis, modos, mensagens/dicas, distratores e correções de defeito.

## 1. Habilidades BNCC (6)

| Código | Resumo (paráfrase) | Legado | React | Paridade |
|---|---|---|---|---|
| `EF01MA16` | Relatar sequências do dia com horários | Nível 1 (horas certas) — diálogo educadores + `LEVELS[0]` | Mesmo mapeamento em `EDUCATORS_CONTENT` / `Level.bncc` | Mantida |
| `EF01MA17` | Reconhecer períodos do dia | Explorar + Nível 4 (palavras com período) | Idem; períodos tipados `Period` | Mantida |
| `EF02MA19` | Medir/registrar com relógio digital | Nível 2 – modo Números | Idem (`NumbersQuestion` + digital slots) | Mantida |
| `EF03MA22` | Ler/registrar analógico e digital | Nível 3 – todos os modos | Idem | Mantida |
| `EF03MA23` | Relacionar hora/minuto/segundo | Níveis 2–3, Ponteiros, Explorar (segundos) | Idem; `showSeconds` no explorar | Mantida |
| `EF04MA22` | Horas/minutos/segundos no cotidiano (24 h) | Nível 4 minuto a minuto | Idem (`h24: true`) | Mantida |

Fonte canônica dos códigos: `src/domain/types.ts` (`BnccSkill`) e `src/content/educators.ts` (`BNCC_SKILLS`).

## 2. Progressão dos 4 níveis

| Nível | Nome | Passo | 24 h | Legado (`LEVELS`) | React (`Level`) | Paridade |
|---:|---|---:|:---:|---|---|---|
| 1 | Horas certas | 60 | não | `step: 60`, `bank: 3` | `step: 60`, `bankSize` | Mantida |
| 2 | Meias e quartos | 15 | não | `step: 15`, `bank: 4` | Idem | Mantida |
| 3 | De 5 em 5 | 5 | não | `step: 5`, `bank: 4` | Idem | Mantida |
| 4 | Minuto a minuto · 24h | 1 | sim | `step: 1`, `h24: true` | Idem | Mantida |

## 3. Modos (4)

| Modo | Estímulo / ação | Legado | React | Paridade |
|---|---|---|---|---|
| Números | Analógico → fichas no digital | `startGame('numbers')` | `GameMode: 'numbers'` | Mantida |
| Palavras | Completar frase por extenso | `startGame('words')` | `GameMode: 'words'` | Mantida |
| Ponteiros | Digital → girar analógico + Pronto! | `startGame('hands')` | `GameMode: 'hands'` | Mantida |
| Explorar | Livre, agora com segundos | `openExplore()` | `ModeId: 'explore'` (sem estrelas) | Mantida |

Prompts pt-BR (sem emoji): `APP_COPY.game.prompts` em `src/content/copy.ts`.

## 4. Mensagens e dicas (27 pedagógicas + mismatch)

Catálogo React: `HintCode` em `src/domain/types.ts`. As **27** mensagens pedagógicas de leitura/ajuda excluem `drop.group-mismatch` (ficha de outra cor; não conta erro). O mismatch permanece implementado com paridade de comportamento.

| # | Código React | Função | Legado (origem) | Paridade |
|---:|---|---|---|---|
| — | `drop.group-mismatch` | Ficha na lacuna de outra cor | `wrong(..., false)` | Mantida (não conta estrela) |
| 1 | `drop.hour.noon` | Meio-dia em palavras 24 h | `errorHint` hora + `q.h === 12` | Mantida |
| 2 | `drop.hour.midnight` | Meia-noite | `q.h === 0` | Mantida |
| 3 | `drop.hour.minute-hand-number` | Leu número do ponteiro grande como hora | analog + `num === q.m/5` | Mantida |
| 4 | `drop.hour.rounded-up` | Arredondou hora para cima | analog + `m >= 30` | Mantida |
| 5 | `drop.hour.add-12-afternoon` | Falta somar 12 à tarde | numbers 24 h | Mantida |
| 6 | `drop.hour.no-add-12-morning` | Somou 12 de manhã | numbers 24 h | Mantida |
| 7 | `drop.hour.look-hour-hand` | Genérico: olhe o ponteiro pequeno | fallback analog hora | Mantida |
| 8 | `drop.hour.subtract-12` | Tirar 12 depois do meio-dia (palavras) | digital 24 h | Mantida |
| 9 | `drop.hour.before-colon` | Horas antes dos dois pontos | digital genérico | Mantida |
| 10 | `drop.minute.count-by-5` | Número × 5 minutos | analog minuto | Mantida |
| 11 | `drop.minute.half-not-meio` | "meio" vs "e meia" | `value === 'meio'` | Mantida |
| 12 | `drop.minute.count-from-12` | Conte de 5 em 5 a partir do 12 | `wrongByGroup.minute >= 2` | Mantida |
| 13 | `drop.minute.look-minute-hand` | Olhe o ponteiro grande | analog minuto | Mantida |
| 14 | `drop.minute.after-colon` | Minutos depois dos dois pontos | digital minuto | Mantida |
| 15 | `drop.period.ranges` | Faixas madrugada/manhã/tarde/noite | fallback período | Mantida |
| 16 | `hands.minute.on-12` | Hora certa: grande no 12 | `#btn-check` + `m === 0` | Mantida |
| 17 | `hands.minute.amount` | Grande precisa mostrar N minutos | `#btn-check` !okM | Mantida |
| 18 | `hands.minute.point-to` | Apontar para número/tracinho | 2ª tentativa minuto | Mantida |
| 19 | `hands.hour.adjust` | Ajuste o ponteiro pequeno | `#btn-check` okM !okH | Mantida |
| 20 | `hands.hour.position` | Entre N e N+1 / no N | 2ª tentativa hora | Mantida |
| 21 | `help.hands` | Dica modo ponteiros | `#btn-hint` hands | Mantida |
| 22 | `help.analog.minute` | Dica minuto no analógico | `#btn-hint` + clock | Mantida |
| 23 | `help.analog.hour` | Dica hora (aponta) | `#btn-hint` m === 0 | Mantida |
| 24 | `help.analog.hour-between` | Dica hora entre números | `#btn-hint` m > 0 | Mantida |
| 25 | `help.digital.hour` | Antes dos dois pontos | estímulo digital | Mantida |
| 26 | `help.digital.minute` | Depois dos dois pontos | estímulo digital | Mantida |
| 27 | `help.period` | Faixas do período | lacuna período | Mantida |

Códigos de balão extras (`intro`, `praise`, `progress`, `done`) cobrem intro por modo, elogios, progresso parcial e fim de pergunta; textos sem emoji via segmentos/`HandBadge` (ADR-002 §4, visual-system §8).

**Mudança intencional de entrega:** dicas **não** são faladas automaticamente; só `aria-live="polite"` + botão "Ouvir" / elogio+frase ao acertar.

## 5. Distratores

| Aspecto | Legado | React | Nota |
|---|---|---|---|
| Preferidos de hora | `displayH+1`, `displayH-1`, `m/5`, ±12 no 24 h | `ClockMathApi.adjacentHours` + pools | Ver correção abaixo |
| Preferidos de minuto | Erros comuns do nível | Mesma intenção pedagógica | Mantida |
| Banco | `level.bank` fichas | `Level.bankSize` | Mantida |
| Embaralhamento | `Math.random` | `Rng` com seed | Reprodutível (melhoria) |

### Correção aprovada: wrap 12 h (`to12(displayH ± 1)`)

No legado, `displayH + 1` / `displayH - 1` **sem wrap** gerava `13` (quando `displayH = 12`) e `0` (quando `displayH = 1`). Esses valores saem do pool 1–12, e o distrator de arredondar a hora sumia justamente nos casos críticos.

**React (ADR-002 §3):** `adjacentHours(displayH, h24)` usa:

- 12 h: `to12(displayH ± 1)`;
- 24 h: `(displayH ± 1 + 24) % 24`.

Isso **muda a distribuição de fichas** em relação ao legado e é **mudança pedagógica intencional** aprovada. Testes F1 cobrem `displayH ∈ {1, 12}`.

## 6. Dez correções de defeitos do legado

| # | Defeito no legado | Correção React | Referência |
|---:|---|---|---|
| 1 | Distrator vizinho sem wrap em 12/1 | `to12(displayH ± 1)` / wrap 24 h | ADR-002 §3 |
| 2 | Lacunas como `<button>` (slot-first; Tab dobrado) | Tile-first: ficha age; `<Slot>` sem foco | ADR-004 §4 |
| 3 | Emojis/glifos crus inconsistentes entre SO | `HandBadge` / `UiIcon` / WebP; copy sem emoji | visual-system §8, ADR-004 |
| 4 | Dicas faladas automaticamente (atropelo a11y) | Só `aria-live` + "Ouvir"/elogio | ADR-002 §4 |
| 5 | `confirm()` nativo para apagar progresso | Diálogo em 2 etapas + `aria-live` | `APP_COPY.resetProgress` |
| 6 | Preferências: gravação da cópia em memória (aba obsoleta apaga estrelas) | Escrita por operação com releitura | ADR-002 §5 |
| 7 | Detecção de update PWA frágil / reload automático | `hadControllerRef` + toast só na Home + reload explícito | ADR-003 |
| 8 | Modal com scroll-lock em `:root` (salto / iOS) | `<dialog>` nativo sem lock no root | ADR-004 §4 |
| 9 | Cor como único sinal pedagógico | Redundância geométrica (bloco / tracejado / pílula) | ADR-004 §3 |
| 10 | AGPL §13: arquivos publicados = fonte (válido só sem build) | Corresponding Source `tree/{commit}` + `LICENSE.txt` + `THIRD_PARTY_LICENSES.txt` + build `npm ci && npm run build` | ADR-004 §1 |

## 7. Checklist rápido de revisão

- [ ] Diálogo educadores lista as 6 habilidades na ordem canônica.
- [ ] Competências mencionam cores **e** formas de redundância.
- [ ] AGPL §13 pós-build com commit exato e aviso sem garantia.
- [ ] Nenhuma string de `src/content/**` com `★☆✔✕➜‹›▾←` ou emoji Unicode.
- [ ] Distratores 12 h usam wrap; documentado como mudança intencional.
- [ ] Confirmação de apagar progresso em 2 etapas (sem `confirm()`).
