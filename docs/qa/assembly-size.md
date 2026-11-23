# Monte o relógio — medição e integração de orçamento

Data: 2026-11-22. Branch de entrega: `beltraoluis/monte-o-relogio`.

**Estado final: os dois orçamentos passam com React/DOM 19.3.1.**
Solução medida em build limpo: `df5608123d938835256f3426ba441c21a105610c`,
**91589 B de JS gzip / 523531 B de precache**. Margens: **571 B / 757 B**.
As medições intermediárias reprovadas e o experimento React 18 abaixo são histórico;
React 18 continua separado e não foi adotado.
Nenhum teto, exclusão do verificador, funcionalidade, licença ou recurso offline foi alterado.
Não houve push, publicação, PR ou merge.

## Medições limpas

Node `v22.23.4`, npm `10.9.9`. Cada linha usa um `git archive` do commit,
`npm ci --include=dev`, `NODE_ENV=production`, `GITHUB_SHA` igual ao SHA completo,
`npm run build` e `npm run check:size`. O relatório usa os bytes do verificador oficial,
não o tamanho aproximado mostrado pelo Vite. O precache oficial conta todo o `dist`
exceto sourcemaps; o JS inicial exclui os arquivos do service worker/Workbox.

| Snapshot | JS gzip (B) | Precache (B) | Gate |
|---|---:|---:|---|
| Base `cc63fc93ad9735207f06b30b9148f91d1105c26b` | 108423 | 574726 | falha |
| Modo original `4380d8bdef39f7823d903ae9dff70762280fda11` | 110895 | 584260 | falha |
| Reuso a92, `0f072c0818082b6d353b91fa68ecd3774e56caec` | 103092 | 525959 | falha |
| Otimização externa, sem modo, `414cdd889712f36d18f4c3b4d05ebce077198ce4` | 92079 | 521892 | passa |
| Integração React 19, `6b1ce842683f3140345d8b55bc0f7fa3bc8a34f9` | 93817 | 531750 | falha |
| Solução React 19, `df5608123d938835256f3426ba441c21a105610c` | 91589 | 523531 | passa |
| Experimento React 18, `5f777870bca639b8b3353dd24f41359cbed106f3` | 71159 | 452870 | passa tamanho; falha teste/typecheck |
| Tetos mantidos | 92160 | 524288 | — |

Delta original do modo: **+2472 B gzip / +9534 B precache**. A base já reprovava
antes do modo. A integração intermediária reduziu **17078 B gzip / 52510 B precache** frente
a `4380d8b`, mas ainda excedia os tetos em **1657 B / 7462 B**.
Contra o snapshot externo sem o modo, o incremento intermediário era +1738 B / +9858 B
(inclui a integração e a centralização dos textos da montagem).

Reprodução no checkout da entrega:

```sh
node scripts/measure-build.mjs cc63fc9 4380d8b 0f072c0 414cdd8 6b1ce84 df56081
npm ci --include=dev
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run check:no-emoji
npm run check:contrast
npm run check:entry
```

O script cria diretórios temporários independentes e grava `results.json` e
`measurement.log`; falhas de tamanho são registradas como `sizeGate: 1`, sem
alterar os critérios para fazer as bases passarem. Falhas de instalação/build
interrompem a medição.

## Causas e maiores contribuições

O build original já carregava React de produção, não um runtime de desenvolvimento.
A análise do sourcemap de `4380d8b` atribuiu aproximadamente 202967 B de código
minificado ao `react-dom-client.production.js` (62765 B comprimido isoladamente),
7816/2929 B ao React e 3485/1485 B ao Scheduler. Os tamanhos gzip individuais
não são aditivos: o gate comprime o chunk inteiro.

Outras contribuições originais, raw/gzip isolado: UiIcons 10414/1943 B;
GameScreen 6526/2396 B; hints 6599/2282 B; useGameController 5752/2106 B;
workbox-window 5578/2158 B; gameReducer 5576/1971 B; educators 5066/2371 B;
TeachersDialog 5049/1699 B; AssemblyScreen 4120/1674 B. A fonte original tem
29732 B e as imagens originais somavam 72106 B. Assim, o orçamento não era um
problema exclusivo da nova atividade.

Reutilizei os deltas líquidos `b179a93..a92c478` e `a92c478..414cdd8`, obtidos por
fetch local de `/tmp/relogio-release-LUHtW6`. Nenhum arquivo não commitado do outro
worker foi copiado. O resultado mantém o runtime oficial React 19.3.1, sprite
SVG externo no precache, imagens comprimidas, registro nativo de SW, dados
canônicos e templates estáticos no HTML, classes curtas geradas antes do hash,
e o hook compartilhado de popover. O SW continua Workbox com a mesma migração.

Corrigi a associação dos modos por ID (índices mudavam ao inserir assemble),
incorporei assemble nos dados/cards e reutilizei a ilustração existente de números.
Centralizei textos da montagem e o formatador compartilhado; retirei callbacks
intermediários redundantes na GameScreen. Os textos continuam disponíveis offline.

Experimentos descartados na entrega: Terser com três passes piorou o candidato
integrado de 94119 para 94680 B gzip; JSX clássico ficou em 94135 B. O padrão Oxc
foi preservado. Nenhum runtime foi editado e nenhuma dependência foi disfarçada
como arquivo de outro tipo para sair do gate.

## Validação do candidato intermediário React 19 (`6b1ce84`)

- Typecheck e lint passam.
- 356 testes unitários/de integração passam, incluindo o replay com Activity.
- E2E: 55 passam, 3 ignorados pelas condições de ambiente da suíte; Chromium e
  WebKit executados. Os ignorados são condições do harness/iOS, não a montagem.
- A montagem completa roda após controle pelo SW, desligamento da rede e reload:
  arrasto touch real por CDP, cancelamento, erro/retry, toque peça/destino, duas
  etapas, disposição a 320 px, resultado, repetição e estrelas após recarregar.
- A suíte cobre mouse/toque, fora do alvo, alvo ocupado, segundo dedo,
  supressão do clique sintético e conclusão única apenas após a última peça.
- Jornada offline das outras telas e sprite passa também no WebKit; migração
  v6, rollback v7, atualização sem reload automático, subpath e licenças passam.
- No-emoji, 60 verificações de contraste e chunk único passam.
- **Tamanho falhava** nesse snapshot, conforme a tabela; foi resolvido em `df56081`.

## Solução final e verificação do grafo

Confirmei com o coordenador paralelo que a referência de release mais recente é
`6f4f8da2db523b040e01123530c61fd143ec1c4d`, em `beltraoluis/updateVisual` e na branch
`f5-integrated-verification` do checkout temporário. Desde `414cdd8` não há nova
otimização nas fontes distribuídas; mede 92077 B / 521892 B sem a montagem. Não
copiei alterações pendentes nem fiz push na branch compartilhada.

A investigação mostrou que `require("react")` mantinha o namespace inteiro vivo,
mesmo quando o aplicativo usava poucos exports. O plugin de build
`build/reactStaticImports.ts` transforma **somente duas declarações de dependências**
dos arquivos oficiais de produção em imports estáticos, na mesma ordem, e resolve
`react` diretamente para o arquivo de produção que seu index.js selecionaria.
O tree shaking CommonJS do Rolldown pode então eliminar exports não referenciados.
Não há patch de funções internas, flags, erros, símbolos, scheduler ou lógica React;
os entry points React DOM com `checkDCE` continuam presentes. Nenhum arquivo em
`node_modules` é modificado. A resolução especial só roda no build de produção.

O plugin verifica a versão exata **19.3.1** e os SHA-256 dos três arquivos revisados;
uma distribuição diferente interrompe o build e exige nova revisão. Esse é o custo
de manutenção deliberado da otimização: uma atualização do React deve revisar as
declarações e repetir a prova de runtime, sem atualizar hashes às cegas.

Sourcemaps são preservados tanto nessa transformação quanto no compilador de
imports CSS. `magic-string` e `@jridgewell/sourcemap-codec` são dependências de
desenvolvimento; não entram no chunk nem no precache.

Contribuições mapeadas antes/depois da última otimização (bytes de código minificado;
gzip individual é diagnóstico e não se soma ao gate):

| Módulo | Antes raw / gzip isolado | Depois raw / gzip isolado |
|---|---:|---:|
| React core | 7807 / 2928 | 1831 / 721 |
| React DOM API | 3553 / 1237 | 973 / 576 |
| React DOM client | 202894 / 62701 | 202681 / 62719 |
| Scheduler | 3465 / 1484 | 3468 / 1486 |

As pequenas diferenças nos módulos que não encolheram vêm dos identificadores
escolhidos pelo minificador. A remoção efetiva foi de exports não usados dos dois
primeiros módulos. A última mudança retirou **2228 B gzip / 8219 B precache**;
frente ao modo original, a solução retirou **19306 B / 60729 B**.

Maiores arquivos finais, medidos no build limpo: JS 292262 B; CSS 48113 B;
LICENSE.txt 34523 B; fonte 29732 B; index.html 28348 B; sprite 18793 B;
Workbox 15112 B. Fonte, conteúdo, imagens, licenças e política de cache permanecem
inteiros. Nenhum arquivo mudou de extensão para escapar dos gates.

Reproduzir a atribuição (separada da medição oficial sem sourcemaps):

```sh
npm run build -- --sourcemap
node scripts/analyze-bundle.mjs dist > /tmp/assembly-analysis.json
```

Validação final: typecheck e lint passam; **356 testes passam**; **57 E2E passam**
em Chromium/WebKit, com os mesmos 3 skips condicionais anteriores. A suíte mantém
a montagem completa offline, erro/retry, arrasto touch por CDP, clique/toque,
legibilidade a 320 px, repetição e persistência. Os gates de tamanho, chunk único,
no-emoji e as 60 verificações de contraste passam.

A prova adicional `e2e/react-runtime.spec.ts` usa um entry de teste compilado pelo
mesmo config de produção, fora do build distribuído. Ela comprova `Activity` ocultando
uma fila pendente sem executar seus efeitos; ao reexibir, comprova callback atualizado,
ack da fila e uma única execução, inclusive após outro ciclo ocultar/reexibir. Também
confirma duas chamadas `checkDCE` antes da injeção de DevTools, versão 19.3.1 e ausência
de erros no navegador. O teste original de Activity em StrictMode continua intacto.

O checkout limpo de `df56081`, após `npm ci --include=dev`, também é usado para repetir
typecheck, lint, unitários e E2E, além dos gates oficiais registrados na tabela.

## Experimento separado React 18 — não adotado

Checkout: `/tmp/assembly-react18-uiTzyu`, branch `experiment/assembly-react18`.
Commit: `5f777870bca639b8b3353dd24f41359cbed106f3`.

Reproduzir nesse checkout: `node scripts/measure-build.mjs HEAD`, depois os
mesmos comandos de validação listados acima. React/DOM ficam em 18.3.1; tipos
em 18.3.31/18.3.7. A entrega continua em 19.3.1.

A migração substitui useEffectEvent por ref atualizada em useLayoutEffect antes
do consumidor dos eventos, ajusta a nulabilidade dos tipos de refs e trata o
`toggle` do popover com listener nativo compartilhado. O atributo closedby já é
aplicado pelo hook do diálogo. Não se alteraram o domínio, o consumidor da fila,
a deduplicação ou a forma de pontuar a montagem.

Resultados: 355 testes passam e **um falha**, porque `Activity` não existe no React
18; o typecheck também reprova essa importação no mesmo teste. Mantive o teste
intacto, sem ignorá-lo nem substituí-lo por um caminho que não comprova a mesma
reativação. Lint passa. Os mesmos 55 E2E passam, com 3 ignorados condicionais,
incluindo montagem offline e cache/migração/atualização.

Economia do experimento ante o candidato React 19: 22658 B gzip e 78880 B de
precache. Isso não resolve por si só a decisão de arquitetura: exige CCR do
ADR-001, manutenção do adaptador de callback/eventos e decisão explícita sobre
a cobertura de reativação dependente de Activity. Não recomendo marcar a troca
como pronta enquanto esse teste e o ADR estiverem pendentes.

## Evidências locais

- Comparação base/modo/a92: `/tmp/assembly-measure-comparison.log`.
- React 19 limpo: `/tmp/assembly-414-clean.log`.
- Snapshot externo limpo: `/tmp/assembly-414-source-clean.log`.
- Testes/linters/E2E React 19: `/tmp/assembly-414-tests.log`,
  `/tmp/assembly-414-lint.log`, `/tmp/assembly-414-e2e.log`, `/tmp/assembly-414-gates.log`.
- React 18 limpo: `/tmp/assembly-react18-clean.log`.
- Limitações React 18: `/tmp/assembly-react18-types-final.log`,
  `/tmp/assembly-react18-tests.log`, `/tmp/assembly-react18-e2e.log`.
- Contribuições originais: `/tmp/assembly-contributions.json`.
- Solução limpa: `/tmp/assembly-solution-clean.log`.
- Validação repetida no checkout limpo: `/tmp/assembly-clean-validation.log`.
- Suíte final: `/tmp/assembly-final-tests.log`, `/tmp/assembly-final-e2e.log`.
- Perfil final por arquivo/módulo: `/tmp/assembly-final-analysis.json`.

Como jogar: escolha Monte o relógio na entrada habitual, arraste cada peça ou
toque na peça e no encaixe; complete as horas, avance para os minutos (00 no topo,
05 em 05), veja o resultado e volte ao início ou jogue novamente. As horas ficam
no anel interno ao montar os minutos; as dificuldades e estrelas dos demais modos
permanecem independentes. Mais evidências da implementação em `assembly.md`.
