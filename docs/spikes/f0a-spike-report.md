# Spike F0a — 19/11/2026

Ambiente: Node v22.23.4, npm 10.9.9, Playwright 1.65.1 e Google Chrome instalado em `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, em modo headless. O servidor HTTP de teste foi um servidor Node local em 127.0.0.1 que alternava entre `legacy/` e `dist/` mantendo a mesma origem; `/LICENSE` do legado foi servido a partir da raiz. O rollback alterou apenas a resposta de `sw.js`, substituindo v6 por v7. Os testes foram repetidos após o build com Vite 8.3.8.

## Auditoria

**PASSOU (escolha):** [GHSA-p4f5-76q4-ffq7](https://github.com/vitejs/vite/security/advisories/GHSA-p4f5-76q4-ffq7) é crítico e afeta Vite 8.3.0–8.3.6 quando o servidor de desenvolvimento é exposto à rede; 8.3.7 corrige. Fixa-se 8.3.8 como exceção aprovada. O `npm audit` local não listou esse advisory em 8.3.6, portanto não foi suficiente como única fonte. Auditoria após instalação de 8.3.8: 4 moderadas, 0 altas e 0 críticas, envolvendo glob/minimatch via workbox-build/vite-plugin-pwa; `npm audit --omit=dev`: 0 vulnerabilidades. Uma auditoria em cópia temporária com lockfile atualizado para 8.3.8 reportou 2 moderadas (glob e minimatch), demonstrando que o resultado depende da resolução do lockfile.

## Artefatos

**PASSOU:** `dist/sw.js` contém `skipWaiting()`, `clientsClaim()` e `importScripts("sw-legacy-cleanup.js")` com `registerType: 'prompt'`; Plano B não foi necessário. `dist/manifest.webmanifest` contém `"start_url":"./"` e `"scope":"./"`.

**PASSOU:** CSS gerado com Lightning CSS e Rolldown: `@layer app{.gPMrEW_app{...transition:opacity .3s linear(0, .5, 1)}.gPMrEW_app h1{...}@starting-style{.gPMrEW_app{opacity:0}}}`. O nesting foi corretamente expandido e os demais recursos foram preservados; não houve necessidade de fallback PostCSS.

## HTTP e navegador

**PASSOU:** Playwright consultou `/` e `/GamesEduRelogioMaluco/` no servidor local: `index.html`, `sw.js`, `manifest.webmanifest`, ambos os arquivos em `assets/` e `LICENSE.txt` responderam 200. Navegação controlada pelo Workbox até `/LICENSE.txt` respondeu 200, `text/plain`, com conteúdo da licença, não o fallback HTML. Em um contexto de navegador isolado, o SW Workbox controlou também o subpath, conforme ensaio adicional abaixo.

**PASSOU (migração):** duas abas do legado foram abertas e aguardaram controle por SW v6; `caches.keys()` retornou `relogio-maluco-v6`. Após trocar para `dist/` e chamar `registration.update()`, foram observadas zero navegações automáticas nas duas abas durante 2,5 segundos. Depois de recarregar a primeira aba duas vezes, o título React apareceu e o único cache observado foi `workbox-precache-v2-http://127.0.0.1:4187/`; uma nova aba também apresentou o título React. No ensaio adicional, após o novo SW ativar e remover o cache v6, abriu-se Números em cada aba e clicou-se na ficha correspondente à resposta; ambas preencheram a lacuna e desabilitaram a ficha, com zero navegações automáticas.

**PASSOU (fallback híbrido):** em outra origem local, após instalar v6, o teste gravou o HTML de `dist/` nas entradas `./` e `./index.html` do cache legado, desligou a rede e recarregou. O texto estático de carregamento foi observado visível e o cache permaneceu `relogio-maluco-v6`. Essa situação foi simulada diretamente no Cache Storage, sem alegar uma sequência natural de atualização.

**PASSOU (rollback limitado):** após ativar o SW legado servido com `CACHE` v7 e recarregar, `caches.keys()` retornou apenas `relogio-maluco-v7`; com a rede desativada, a página recarregou e `document.title` retornou `Relógio Maluco`. No ensaio adicional, depois do reload offline, abriu-se Números e a ficha correta preencheu a lacuna e ficou desabilitada.

## Ensaios adicionais em Chrome headless

**PASSOU (duas abas):** servidor local em `127.0.0.1:4191`, duas abas controladas por v6, troca para `dist/` e `registration.update()`, aguardando a remoção de `relogio-maluco-v6`. Em cada aba, clique real na opção Números e na ficha correta de horas: ambas registraram `slotFilled: true` e `tileDisabled: true` (resposta `03` neste ensaio). Durante a troca e as interações foram contadas `automaticNavigations: 0`; o cache observado foi `workbox-precache-v2-http://127.0.0.1:4191/`.

**PASSOU (rollback offline):** o mesmo servidor passou a fornecer o SW legado com `CACHE` v7, aguardou o cache v7, recarregou, executou `BrowserContext.setOffline(true)` e recarregou novamente. A opção Números abriu offline, a ficha de horas `02` preencheu sua lacuna e ficou desabilitada; `navigator.onLine` era `false` e o único cache era `relogio-maluco-v7`.

**PASSOU (subpath offline):** em contexto novo, abriu-se `/GamesEduRelogioMaluco/` e aguardou-se controle; o controlador era `http://127.0.0.1:4191/GamesEduRelogioMaluco/sw.js`, o escopo e o cache Workbox continham o mesmo subpath. A navegação para `LICENSE.txt` retornou 200, `text/plain` e texto da GNU AGPL; depois, com `setOffline(true)`, recarregou-se o subpath e verificaram-se o título e o texto do aplicativo React, com `navigator.onLine` igual a `false`.

Os valores de ficha são sorteados pelo jogo; o ensaio selecionou pelo valor correto presente no DOM e usou clique de ponteiro do Playwright, conferindo a mudança observável da lacuna e da ficha. O script de ensaio foi temporário e alternou os diretórios servidos na mesma origem; não alterou o legado nem simulou respostas de rede para a etapa offline.

## Verificações finais

`npm run typecheck`: exit 0; `npm run lint`: exit 0; `npm test`: exit 0, 1 arquivo/1 teste passou; `npm run build`: exit 0, Vite 8.3.8 e PWA 2.0.0, 5 entradas precacheadas. Os testes de navegador acima são ensaios locais pontuais, não uma suíte persistida no repositório.
