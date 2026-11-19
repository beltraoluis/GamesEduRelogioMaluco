# F2d — Dependências e evidências

Suíte em `e2e/`. Asserções reais; **sem skip/fix para mascarar F3**.
Skips só distinguem browser (Chromium UA-sim vs WebKit).

- Build isolado: `e2e/.runtime-dist` (porta `E2E_PORT`/`4177`, `reuseExistingServer: false`)
- F2c composition: `../f2c-pwa/dist` @ `21c1648` para precache/licenças
- Seed de prefs na migração: `page.evaluate` **após** goto (não `addInitScript`)

## Correções Opus (8ed44ec → este commit)

| Bloqueante | Status |
|---|---|
| `workers: undefined` TS2769 | Corrigido com spread condicional |
| Mutante `localStorage.clear()` verde | **Provado vermelho** com seed evaluate; revertido antes do commit |
| `cache.match` sem `ignoreSearch` | `cacheHasUrl(..., { ignoreSearch: true })` |
| reduced-motion falso verde | Controle positivo + assento determinístico + resultado |
| Porta/build alheios | `.runtime-dist` + porta 4177 + sem reuse |
| P0 edge-cases / Som-Voz / tree commit / rollback | Specs adicionados; ver matriz |

## Matriz

| Spec | Evidência executada | F3? | Notas |
|---|---|---|---|
| `harness.spec.ts` | Verde G1 | Não | |
| `migration-v6.spec.ts` 1/2 abas + v7 | Verde (prefs reais; mutante falhou; jogável pré-reload; rollback) | ModeCard React sim | |
| `offline-licenses.spec.ts` F2c | Verde ignoreSearch + subpath | Selo UI sim | |
| `subpath-pages.spec.ts` HTTP/assets/SW | Verde (assets 200 raiz+subpath) | UI offline F3 | Label F3 só na UI |
| `modes.spec.ts` matriz | Vermelho honesto até F3 | **Sim** | |
| `levels-keyboard.spec.ts` Enter/Espaço/setas | Vermelho até F3 | **Sim** | chave runtime via `Object.keys` |
| `teachers-dialog.spec.ts` foco/Esc/reset | Vermelho até F3 | **Sim** | |
| `speech-cancel.spec.ts` rotas + eventos isolados + resultado | Vermelho até F3 | **Sim** | |
| `reduced-motion.spec.ts` +/− reduce | Vermelho até F3 | **Sim** | |
| `update-toast.spec.ts` + edge #6 | Vermelho até F3 | **Sim** | |
| `edge-cases.spec.ts` P0 #1,#4,#5,#6 | Vermelho até F3 | **Sim** | P1: evidência F1b files |
| `menu-a11y.spec.ts` Som/Voz + tree/{commit} + tip− | Vermelho até F3 | **Sim** | |
| `ios-tip.spec.ts` Chromium sim vs WebKit | Vermelho até F3 | **Sim** | |

## P0 edge-cases.md

| # | Caso | Onde |
|---|---|---|
| 1 | 11:59→12:00 | `edge-cases.spec.ts` [F3]; unitário `clockMath` F1a |
| 4 | storage indisponível | `edge-cases.spec.ts` [F3] |
| 5 | reset 2 abas | `edge-cases.spec.ts` [F3] |
| 6 | hadControllerRef / toast | `edge-cases.spec.ts` + `update-toast.spec.ts` [F3] |
| — | rollback v7 | `migration-v6.spec.ts` (verde) |
| P1 #2/#3 | pointercancel / multitoque | unitários F1b presentes; E2E residual F4 |

## SHA antigo (Opus @ 8ed44ec)

Independiente: **7 verdes / 16 vermelhos**; migração antiga **não** comprovava preservação (initScript tautológico); subpath:50 rotulado F3 mas passava no stub.
