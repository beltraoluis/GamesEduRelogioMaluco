# F2d — Dependências de execução da suíte E2E

Suíte independente em `e2e/`. Asserções reais contra fluxos de produção (copy
`APP_COPY`, contratos `ANSWER_REGION_LABELS` / `PREFERENCES_STORAGE_KEY`,
semântica tile-first). **Sem `test.skip` / `test.fix` para mascarar
pendências de F2/F3.**

## Harness na base G1 (`1c8594a`)

| Verificação | Comando | Esperado na G1 |
|---|---|---|
| Descoberta | `npx playwright test --list` | Lista todos os specs abaixo |
| Preview + stub | `npx playwright test e2e/harness.spec.ts` | Verde (App stub + `LICENSE.txt`) |
| Fluxos de produção | `npm run test:e2e` | Falham até a composição F3 (asserções reais) |

Anotação Playwright em cada prova F3: `requires-f3-composition` (também no
título como `[F3]`).

## Matriz de provas

| Spec | Cobre | Corre na G1? | Precisa composição F3? | Outras deps |
|---|---|---|---|---|
| `harness.spec.ts` | Descoberta, preview, título, `LICENSE.txt` | **Sim (verde)** | Não | — |
| `modes.spec.ts` | 4 modos (Números, Palavras, Ponteiros, Explorar) | Descoberta sim; execução falha | **Sim** | F2a + F2b |
| `levels-keyboard.spec.ts` | Níveis via `radio`, teclado tile-first | Idem | **Sim** | F2a + F2b |
| `teachers-dialog.spec.ts` | `<dialog>` + confirmação 2 etapas + reset | Idem | **Sim** | F2b |
| `speech-cancel.spec.ts` | `speechSynthesis.cancel` em saídas (jogo/explorar/resultado) | Idem | **Sim** | F2a (rotas) + F2b |
| `reduced-motion.spec.ts` | Sem confete/`data-confetti-particle` com `prefers-reduced-motion` | Idem | **Sim** | F2a + F2b |
| `offline-licenses.spec.ts` | Offline + licenças | **Parcial G1:** `LICENSE.txt` HTTP 200 no preview | **Sim** para precache offline + selo `offlineReady` + `THIRD_PARTY_LICENSES.txt` | **F2c** deve precachear `LICENSE.txt`/`THIRD_PARTY_LICENSES.txt` (hoje `LICENSE.txt` está em `dist/` mas fora do precache Workbox na G1) |
| `migration-v6.spec.ts` | Legado v6 → React, 1 e 2 abas, prefs preservadas | Parcial: chave `relogio-maluco-v1` + cleanup de cache | **Sim** para jogabilidade pós-migração | F2c (SW) |
| `subpath-pages.spec.ts` | Mesmo `dist/` em `/` e `/GamesEduRelogioMaluco/` | Parcial: assets 200 na G1 | **Sim** para UI completa offline | F2c |
| `ios-tip.spec.ts` | Dica iOS no menu (`showIosInstallTip`) | Descoberta sim; execução falha | **Sim** | F2b + F2c (`usePwa`) |

## Contrato de seletores (estável para F2/F3)

Os specs usam nomes acessíveis de `APP_COPY` / contratos — não `data-testid`
proprietários. F2b/F3 devem preservar:

- Cards de modo: botão/link cujo nome acessível contém `APP_COPY.modes.*.title`
- Níveis: `input[type=radio]` (ou `role="radio"`) com nome de `APP_COPY.levels.*.name`
- Menu: interruptor Som/Voz (`role="switch"`), item "Para educadores", "Código-fonte", dica iOS
- Jogo: `AnswerRegion` com `ANSWER_REGION_LABELS[mode]`; fichas focáveis; `Slot` sem Tab
- Educadores: `<dialog>` nativo; reset em 2 etapas com `APP_COPY.resetProgress.*`
- Confete: ausente sob reduced motion (`[data-confetti-particle]` não aparece)
- Persistência: única chave `relogio-maluco-v1`

## O que falta após F2d

1. Composição F3 (F2a+F2b+F2c) para tornar verdes as provas `[F3]`.
2. F2c: `THIRD_PARTY_LICENSES.txt` precacheado + hooks PWA/registro SW na UI.
3. F4: VoiceOver/TalkBack e smoke em aparelho (fora do escopo F2d).
