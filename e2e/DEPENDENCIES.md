# F2d — Execução e evidências

`npm ci` instala as dependências do checkout. `npm run test:e2e` gera o build local em `e2e/.runtime-dist/<porta>/local` a cada execução. O preview reserva `127.0.0.1` com `strictPort` e o Playwright espera a mensagem de prontidão do próprio processo. Use `E2E_PORT` para escolher outra porta (padrão 4177).

As três provas de F2c exigem um SHA completo na variável `E2E_F2C_SHA` e o objeto Git correspondente. O launcher extrai o checkout temporário a partir do repositório local, instala o lockfile com `npm ci --include=dev` e executa o script de build do commit. O resultado fica em `e2e/.runtime-dist/<porta>/f2c`. Essa composição tem o harness de F2d e um segundo build de aplicação, ambos com origem explícita.

```sh
E2E_PORT=44181 E2E_F2C_SHA=0aa620edb7fa4ef1dd2d2e47f5b1b9c2608f4083 \
  npm run test:e2e -- --workers=7
```

## Referência congelada da versão v6

O servidor das provas de migração e rollback usa `e2e/fixtures/legacy-v6/`, uma cópia integral da árvore `legacy/` do commit `063d2eea449d7b3307c409e493fac39fc20df471` (árvore Git `6acff69dc3f3e1427fff53f0a5a732fa40bed251`). O servidor só substitui o nome do cache na resposta de `sw.js` para a prova de rollback v7. A fixture faz parte da suíte de testes e fica fora de `public/` e das entradas de build.

Os snapshots em `src/domain/__tests__/fixtures/` foram calculados com o `js/time.js` dessa árvore. `legacy-numbers.json` registra os numerais, o preenchimento com zero, as horas de 12 h e os períodos. Em `legacy-phrases.json`, cada um dos 1.440 horários referencia cinco saídas da função legada: a chamada padrão e as quatro combinações de `withPeriod` e `useHalf`. Os índices em `phrases` e `pieces` compartilham saídas repetidas. Cada caso registra também a frase de 24 h.

## Execução com as quatro branches compostas

A composição de validação reuniu F2a `8a2c8c4`, F2b `29a4145` e F2c `43ef50e` com os testes desta revisão de F2d, sucessora de `7fc5903`. A entrada temporária montou o App em StrictMode com as quatro telas, registro do SW e hooks reais de atualização e instalação. O launcher também compilou o checkout isolado de F2c com `E2E_F2C_SHA=43ef50ebc350ad8cfaee5f8da65b82cf21a68e96`.

A suíte completa aprovou 48 casos em Chromium e WebKit. Três combinações da matriz são puladas porque cada perfil de iOS tem motor definido. Para o teste de armazenamento indisponível, o navegador simula falha de escrita e abre o aviso no diálogo de educadores. O teste de horário usa as setas para chegar a 11:59, cruza para 12:00 e verifica a hora e o período exibidos. Os cenários de cancelamento de voz usam síntese instrumentada. Safari em aparelho físico segue pendente.

## Matriz histórica antes da composição

Checkout sem worktrees irmãos, com `npm ci` próprio. Node 22.23.4 e Playwright 1.65.1. Os projetos foram Chromium 159.0.8154.6 e WebKit 27.2, ambos executados pelo Playwright em macOS. A dica de iOS usa UA e estado standalone simulados. A validação em Safari de aparelho fica pendente de QA de dispositivo.

| Referência | SHA do harness e composição de aplicação |
|---|---|
| Local | `5284909f79d207d83c760c88c43c453440ce59ab`, build local do mesmo SHA e arquivos do legado desse checkout |
| F2c | Harness Local, app temporário `0aa620edb7fa4ef1dd2d2e47f5b1b9c2608f4083` |
| Mutante | Local com `localStorage.clear()` no bootstrap de React em uma segunda cópia descartável |
| Colisão | `49e69a0e04a98684ae65f58bbe04c05926e34b6f`, preview solicitado na porta 44179 com outro servidor HTTP já escutando |

| Prova | Composição | Projeto ou executor | Resultado observado |
|---|---|---|---|
| `npm run typecheck` e ESLint dos arquivos de código alterados | Local | Node | Passaram |
| `npm run lint` no checkout após a suíte | Local | Node | Falhou por incluir os bundles gerados e por `LEVELS` em `modes.spec.ts` |
| Porta ocupada por servidor que responde HTTP 200 | Colisão | Launcher do projeto Chromium | Recusou a porta antes do build e dos testes |
| `harness.spec.ts` | Local | Chromium | 3 passaram |
| `harness.spec.ts` | Local | WebKit Playwright | 3 passaram |
| Migração v6 em 1 e 2 abas | Local | Chromium | 2 passaram. Cada aba observou um `controllerchange` com outro objeto ativo, mesmo URL do script e zero navegação automática. O legado jogou em memória e as preferências sobreviveram ao reload explícito |
| Rollback v7 e nova tentativa React | Local | Chromium | Passou. V7 substituiu Workbox, o legado jogou offline e o novo controlador React removeu `relogio-maluco-v7`. As três provas locais de migração/rollback passaram 9 vezes ao repetir cada uma três vezes |
| Migração v6 em 1 e 2 abas | Mutante | Chromium | 2 falharam na asserção de preferências ausentes depois do reload. A mutação foi revertida na segunda cópia |
| `offline-licenses.spec.ts`, AGPL online | Local | Chromium | Passou |
| `offline-licenses.spec.ts`, AGPL e terceiros offline na raiz e subpath | F2c | Chromium | 2 passaram com controle automático do SW, precache revisionado e leitura offline |
| `subpath-pages.spec.ts`, HTTP/manifest/artefatos em raiz e subpath | Local | Chromium | Passou |
| `subpath-pages.spec.ts`, controle e precache no subpath | F2c | Chromium | Passou com registro automático do SW |
| `edge-cases.spec.ts`, referência P1 | Local | Chromium | Passou a verificação de existência dos arquivos unitários. O comportamento de pointercancel/multitoque não foi executado nesta prova |
| `edge-cases.spec.ts`, P0 #1, #4, #5 e #6 | Local | Chromium | 4 falharam ao procurar a UI integrada |
| `ios-tip.spec.ts`, perfil iOS simulado, com/sem standalone | Local | Chromium | 2 falharam ao abrir o menu |
| `ios-tip.spec.ts`, perfil iOS não standalone simulado | Local | WebKit Playwright | 1 falhou ao abrir o menu |
| `levels-keyboard.spec.ts`, rótulos, Enter, Espaço e quatro setas | Local | Chromium | 4 falharam ao procurar o seletor de níveis, antes das transições de teclado |
| `menu-a11y.spec.ts`, Som/Voz, fonte e dica negativa | Local | Chromium | 3 falharam ao abrir o menu |
| `migration-v6.spec.ts`, jogo React nas duas abas | Local | Chromium | 1 falhou ao procurar o ModeCard |
| `modes.spec.ts`, modos e níveis | Local | Chromium | 7 falharam ao procurar o seletor de níveis |
| `offline-licenses.spec.ts`, selo na UI | Local | Chromium | 1 falhou ao procurar o selo |
| `reduced-motion.spec.ts`, com/sem reduce | Local | Chromium | 2 falharam ao procurar o seletor de níveis, antes dos acertos e da checagem de partículas |
| `speech-cancel.spec.ts`, cancelamento de voz | Local | Chromium | 4 falharam antes de chegar às asserções de voz |
| `subpath-pages.spec.ts`, partida offline no subpath | Local | Chromium | 1 falhou ao procurar o seletor de níveis após reload servido pelo SW com rede desligada. O acerto offline exige F3 |
| `teachers-dialog.spec.ts`, foco e reset | Local | Chromium | 2 falharam ao abrir o menu |
| `update-toast.spec.ts`, toast na Home | Local | Chromium | 1 falhou ao procurar o seletor de níveis |

Execução completa com os dois builds: **15 passaram, 33 falharam na UI pendente de F3 e 3 foram pulados pela seleção de motor dos cenários de iOS**. A composição F2c cobre infraestrutura PWA e licenças. As asserções de jogabilidade React, teclado e movimento aguardam a primeira execução com UI F3 integrada.

## Controle negativo reproduzível

Em outra cópia do SHA Local, acrescente `localStorage.clear();` ao fim de `src/main.tsx`. Execute `npm run test:e2e -- --project=chromium e2e/migration-v6.spec.ts -g '1 aba:|2 abas:'`. O seed é gravado por `page.evaluate` uma única vez durante o legado. O bootstrap mutante roda após carregar React e as duas provas devem falhar antes da verificação de cache. Restaure o arquivo depois da execução.
