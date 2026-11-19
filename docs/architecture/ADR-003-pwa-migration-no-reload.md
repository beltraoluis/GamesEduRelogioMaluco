# ADR-003 — PWA: migração "A sem reload"

- **Status:** Aceito (G0)
- **Data:** 2026-11-19
- **Decisores:** Coordenador Antigravity, Assessor Opus, Argon, Codex, Grok; aprovado pelo usuário
- **Contratos:** `PwaApi`, `ServiceWorkerUpdateApi`, `UpdateToastProps`

## Contexto

O legado registra `sw.js` manual com cache `relogio-maluco-v6` e estratégia stale-while-revalidate. Aparelhos em sala de aula ficam offline por dias. A troca para o service worker do Workbox (`vite-plugin-pwa`) precisa:

1. substituir o SW antigo **no mesmo escopo e com o mesmo nome de arquivo**, para que o navegador o atualize;
2. limpar os caches `relogio-maluco-v*` antigos;
3. **não recarregar a página** no meio de uma rodada;
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
- **Sem reload automático.** O SW novo assume com `skipWaiting` + `clientsClaim`, mas a página aberta continua com o bundle já carregado, que é consistente porque não há chunks dinâmicos. A próxima navegação ou abertura já usa a versão nova.
- **Toast de atualização só na `HomeScreen`** (`ServiceWorkerUpdateApi.updateReady`). "Atualizar" (`applyUpdate`) recarrega por ação explícita do usuário. "Agora não" (`dismissToast`) esconde o toast até a próxima abertura. O toast nunca aparece durante a rodada, no resultado ou no explorar.

### Proibição de chunks dinâmicos

- **Proibido `import()` dinâmico** em `src/`, garantido por regra de lint e por checagem no CI de que o `dist/` tem um único chunk JS de entrada.
- Motivo: um SW novo com `skipWaiting` pode apagar o precache antigo enquanto a página antiga ainda pediria um chunk com hash antigo, gerando 404 offline.

### Fallback estático de boot

- `index.html` traz dentro de `#root` um fallback estático (texto e mascote em SVG inline, sem JS) com "Carregando o Relógio Maluco...". O React substitui esse conteúdo no `createRoot().render()`.
- Se o JS falhar (navegador antigo, bundle corrompido), a criança e o educador veem uma mensagem e não uma tela branca. O fallback inclui o link do código-fonte (AGPL, ADR-004).

### `offlineReady` validado de verdade

- `PwaApi.offlineReady` só fica `true` depois de confirmar que existe um cache `workbox-precache-v2-*` com a entrada do `index.html` (via `caches.keys()` + `cache.match`). O callback `onOfflineReady` sozinho não basta.
- O selo "Funciona sem internet" depende desse valor.

### Base e caminhos

- `base: './'` para servir de qualquer subcaminho (GitHub Pages, pasta em servidor da escola).
- **Plano B:** variável `BASE_PATH` no build (`base: process.env.BASE_PATH ?? './'`) para hospedagens em que caminhos relativos quebrem o escopo do SW ou do manifest.
- O `manifest.webmanifest` mantém `start_url` e `scope` relativos e coerentes com `base`.

### Instalação

- `PwaApi.canInstall` usa `beforeinstallprompt` (Chromium) e `install()` devolve `'accepted' | 'dismissed' | 'unavailable'`.
- **iOS Safari** não tem `beforeinstallprompt`. Com `showIosInstallTip` (iOS + Safari + fora de standalone), o menu mostra a dica "Toque em Compartilhar e depois em Adicionar à Tela de Início".
- `isStandalone` usa `display-mode: standalone` ou `navigator.standalone`.

### Política de rollback (`v7`)

Se a versão React tiver defeito grave em produção:

1. publicar um `sw.js` de rollback baseado no SW legado com `CACHE = 'relogio-maluco-v7'`, com `skipWaiting` + `clients.claim`, que apaga os caches `workbox-precache-v2-*` e volta a servir os arquivos de `legacy/`;
2. como o nome do arquivo é o mesmo (`sw.js`), os aparelhos trocam de SW na próxima verificação;
3. `v7` fica reservado para esse rollback. Uma nova tentativa da versão React depois dele limpa `relogio-maluco-v7` pelo `sw-legacy-cleanup.js`.

## Consequências

- Uma rodada nunca é interrompida por atualização.
- O app inteiro fica num chunk só, o que pesa no orçamento de bundle (ADR-001) mas dá offline robusto.
- Os dois service workers (legado e Workbox) convivem só durante a transição. O cleanup é idempotente.

## Alternativas rejeitadas

- **`registerType: 'autoUpdate'` com reload:** recarrega no meio da rodada e a criança perde o progresso.
- **Nome de SW diferente (`service-worker.js`):** o SW legado continuaria ativo no escopo e servindo o cache velho.
- **Code-splitting por tela:** risco de 404 offline descrito acima, e o ganho é irrelevante para quatro telas.
- **Confiar só em `onOfflineReady`:** em alguns navegadores dispara antes de o precache estar íntegro.
