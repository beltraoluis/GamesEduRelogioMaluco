# ADR-003 — PWA: migração "A sem reload"

- **Status:** Aceito (G0)
- **Data:** 2026-11-19
- **Decisores:** Coordenador Antigravity, Assessor Opus, Argon, Codex, Grok; aprovado pelo usuário
- **Contratos:** `PwaApi`, `ServiceWorkerUpdateApi`, `UpdateToastProps`
- **Evidência:** spike F0a (`cf59f65`, `docs/spikes/f0a-spike-report.md`)

## Contexto

O legado registra `sw.js` manual com cache `relogio-maluco-v6` e estratégia stale-while-revalidate. Aparelhos em sala de aula ficam offline por dias. A troca para o service worker do Workbox (`vite-plugin-pwa`) precisa:

1. substituir o SW antigo **no mesmo escopo e com o mesmo nome de arquivo**, para que o navegador o atualize;
2. limpar os caches `relogio-maluco-v*` antigos;
3. **nunca recarregar a página automaticamente**, nem no meio de uma rodada nem fora dela;
4. nunca deixar o app quebrado offline por causa de chunks que faltam.

## Decisão: estratégia "A sem reload"

### Configuração do `vite-plugin-pwa@2.0.0`

```ts
VitePWA({
  registerType: 'prompt',
  injectRegister: false,          // registro manual via virtual:pwa-register
  filename: 'sw.js',              // mesmo nome do SW legado
  workbox: {
    skipWaiting: true,            // o SW novo assume sem esperar abas fecharem
    clientsClaim: true,           // e controla as abas abertas
    importScripts: ['sw-legacy-cleanup.js'],
  },
})
```

- **`sw-legacy-cleanup.js`** (em `public/`): no `activate`, apaga os caches cujo nome casa com `/^relogio-maluco-v\d+$/` e não toca em `workbox-precache-v2-*`.
- **O SW novo assume sem reload.** Com `skipWaiting` + `clientsClaim`, ele passa a controlar as abas abertas, mas cada página continua com o bundle já carregado, que é consistente porque não há chunks dinâmicos. A próxima abertura natural já usa a versão nova.
- **F0a validou:** o `dist/sw.js` contém `skipWaiting()`, `clientsClaim()` e `importScripts("sw-legacy-cleanup.js")`. Com duas abas do legado (v6), a troca para `dist/` + `registration.update()` gerou **zero navegações automáticas**, o cache v6 foi removido e as duas abas continuaram jogáveis (ficha encaixada, ficha desabilitada).

### Sinalização de atualização (`useServiceWorkerUpdate`)

Com `skipWaiting: true` o SW novo **nunca fica em `waiting`**, então o `onNeedRefresh` do `registerType: 'prompt'` não serve de sinal. A detecção é por **troca de controlador**:

1. **No mount** do hook, registrar `hadController = navigator.serviceWorker.controller !== null`.
2. Ouvir `navigator.serviceWorker` → `controllerchange`. Quando ele disparar e `hadController === true`, marcar `updateReady = true` no estado do hook.
3. Como reforço, quando `registration.active` mudar depois do mount (via `updatefound` → `statechange` para `activated`) e havia controlador prévio, marcar `updateReady = true` também.
4. Com `hadController === false` (primeira instalação), o `controllerchange` causado pelo `clientsClaim` **não** é atualização. Ele só alimenta `offlineReady` (ver abaixo) e não mostra toast.

**Reload exclusivamente explícito:**

- O toast (`UpdateToast`) aparece **só na `HomeScreen`**, nunca durante a rodada, no resultado ou no explorar. Se `updateReady` virar `true` em outra tela, o toast espera a volta à `HomeScreen`.
- O botão **"Atualizar agora"** chama `applyUpdate()`, que executa `window.location.reload()`. É o único caminho de reload no código, e só por clique na `HomeScreen`.
- **"Agora não"** (`dismissToast`) esconde o toast. A versão nova passa a valer na próxima abertura natural do app.
- **Nunca há reload automático**: nenhum `reload()` em `controllerchange`, `onNeedRefresh`, `onOfflineReady` ou timers.

### Proibição de chunks dinâmicos

- **Proibido `import()` dinâmico** em `src/`, garantido por regra de lint e por checagem no CI de que o `dist/` tem um único chunk JS de entrada.
- Motivo: um SW novo com `skipWaiting` pode apagar o precache antigo enquanto a página antiga ainda pediria um chunk com hash antigo, gerando 404 offline.

### Fallback estático de boot no `#root`

- **Entregue em F0a (mínimo):** `index.html` traz dentro de `#root` um fallback **somente texto** ("Carregando o Relógio Maluco..."), sem JS, imagem ou recurso externo. O React o substitui no `createRoot().render()`. F0a verificou que o texto aparece visível offline no cenário híbrido (HTML novo servido do cache legado v6, simulado no Cache Storage).
- **Fica para F2c (enriquecimento opcional):** decidir entre manter o fallback mínimo ou acrescentar (a) o mascote Tic em SVG **inline** e (b) o link "Código-fonte" (`tree/{commit}`, AGPL, ADR-004). Restrições para qualquer enriquecimento: nada de JS nem de recursos externos ou não precacheados, e até 4 KB a mais no `index.html`. Se F2c não decidir, vale o fallback mínimo de F0a, porque o link do código-fonte continua garantido pelo menu e pelo diálogo dos educadores.

### `offlineReady` validado de verdade

- `PwaApi.offlineReady` só fica `true` depois de confirmar que existe um cache `workbox-precache-v2-*` com a entrada do `index.html` (via `caches.keys()` + `cache.match`). O callback `onOfflineReady` sozinho não basta.
- O selo "Funciona sem internet" depende desse valor.

### Base e caminhos

- `base: './'` para servir de qualquer subcaminho (GitHub Pages, pasta em servidor da escola).
- **F0a validou:** `/` e `/GamesEduRelogioMaluco/` com SW, escopo e cache no subpath certo; `LICENSE.txt` respondendo `200 text/plain`; reload offline no subpath carregando o app. O `manifest.webmanifest` gerado tem `"start_url":"./"` e `"scope":"./"`.
- **Plano B (não foi necessário em F0a):** variável `BASE_PATH` no build (`base: process.env.BASE_PATH ?? './'`) para hospedagens em que caminhos relativos quebrem o escopo do SW ou do manifest.

### Instalação

- `PwaApi.canInstall` usa `beforeinstallprompt` (Chromium), e `install()` devolve `'accepted' | 'dismissed' | 'unavailable'`.
- **iOS Safari** não tem `beforeinstallprompt`. Com `showIosInstallTip` (iOS + Safari + fora de standalone), o menu mostra a dica "Toque em Compartilhar e depois em Adicionar à Tela de Início".
- `isStandalone` usa `display-mode: standalone` ou `navigator.standalone`.

### Política de rollback (`v7`)

Se a versão React tiver defeito grave em produção:

1. publicar um `sw.js` de rollback baseado no SW legado, com `CACHE = 'relogio-maluco-v7'` e `skipWaiting` + `clients.claim`, que volta a servir os arquivos de `legacy/`. O `activate` legado já apaga todo cache diferente de `CACHE`, inclusive `workbox-precache-v2-*`;
2. como o nome do arquivo é o mesmo (`sw.js`), os aparelhos trocam de SW na próxima verificação;
3. `v7` fica reservado para esse rollback. Uma nova tentativa da versão React depois dele limpa `relogio-maluco-v7` pelo `sw-legacy-cleanup.js`.

**F0a validou (rollback limitado):** depois do SW v7, `caches.keys()` mostrou só `relogio-maluco-v7`, e o reload offline abriu o jogo legado com o modo Números jogável.

## Consequências

- Nenhuma rodada é interrompida por atualização, e a criança nunca vê a página recarregar sozinha.
- Uma aba pode rodar o bundle antigo sob o SW novo até ser reaberta. Isso é seguro porque não há chunks dinâmicos.
- O app inteiro fica num chunk só, o que pesa no orçamento de bundle (ADR-001) mas dá offline robusto.
- Os dois service workers (legado e Workbox) convivem só durante a transição, e o cleanup é idempotente.

## Alternativas rejeitadas

- **`registerType: 'autoUpdate'` com reload:** recarrega no meio da rodada e a criança perde o progresso.
- **Toast baseado em `onNeedRefresh`:** com `skipWaiting: true`, ele nunca dispara.
- **Nome de SW diferente (`service-worker.js`):** o SW legado continuaria ativo no escopo e servindo o cache velho.
- **Code-splitting por tela:** risco de 404 offline descrito acima, e o ganho é irrelevante para quatro telas.
- **Confiar só em `onOfflineReady`:** em alguns navegadores dispara antes de o precache estar íntegro.
