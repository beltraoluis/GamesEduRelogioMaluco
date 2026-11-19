# Spike F0a — 19/11/2026

Ambiente: Node v22.23.4, npm 10.9.9, Playwright 1.65.1 e Google Chrome instalado em `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, em modo headless. O servidor HTTP de teste foi um servidor Node local em 127.0.0.1 que alternava entre `legacy/` e `dist/` mantendo a mesma origem; `/LICENSE` do legado foi servido a partir da raiz. O rollback alterou apenas a resposta de `sw.js`, substituindo v6 por v7. Os testes foram repetidos após o build com Vite 8.3.8.

## Auditoria

**PASSOU (escolha):** [GHSA-p4f5-76q4-ffq7](https://github.com/vitejs/vite/security/advisories/GHSA-p4f5-76q4-ffq7) é crítico e afeta Vite 8.3.0–8.3.6 quando o servidor de desenvolvimento é exposto à rede; 8.3.7 corrige. Fixa-se 8.3.8 como exceção aprovada. O `npm audit` local não listou esse advisory em 8.3.6, portanto não foi suficiente como única fonte. Auditoria após instalação de 8.3.8: 4 moderadas, 0 altas e 0 críticas, envolvendo glob/minimatch via workbox-build/vite-plugin-pwa; `npm audit --omit=dev`: 0 vulnerabilidades. Uma auditoria em cópia temporária com lockfile atualizado para 8.3.8 reportou 2 moderadas (glob e minimatch), demonstrando que o resultado depende da resolução do lockfile.

## Artefatos

**PASSOU:** `dist/sw.js` contém `skipWaiting()`, `clientsClaim()` e `importScripts("sw-legacy-cleanup.js")` com `registerType: 'prompt'`; Plano B não foi necessário. `dist/manifest.webmanifest` contém `"start_url":"./"` e `"scope":"./"`.

**PASSOU:** CSS gerado com Lightning CSS e Rolldown: `@layer app{.gPMrEW_app{...transition:opacity .3s linear(0, .5, 1)}.gPMrEW_app h1{...}@starting-style{.gPMrEW_app{opacity:0}}}`. O nesting foi corretamente expandido e os demais recursos foram preservados; não houve necessidade de fallback PostCSS.

## HTTP e navegador

**PASSOU:** Playwright consultou `/` e `/GamesEduRelogioMaluco/` no servidor local: `index.html`, `sw.js`, `manifest.webmanifest`, ambos os arquivos em `assets/` e `LICENSE.txt` responderam 200. Navegação controlada pelo Workbox até `/LICENSE.txt` respondeu 200, `text/plain`, com conteúdo da licença, não o fallback HTML. As respostas de subpath foram verificadas por HTTP, não por instalação de SW em navegador nesse subpath.

**PASSOU (migração):** duas abas do legado foram abertas e aguardaram controle por SW v6; `caches.keys()` retornou `relogio-maluco-v6`. Após trocar para `dist/` e chamar `registration.update()`, foram observadas zero navegações automáticas nas duas abas durante 2,5 segundos. Depois de recarregar a primeira aba duas vezes, o título React apareceu e o único cache observado foi `workbox-precache-v2-http://127.0.0.1:4187/`; uma nova aba também apresentou o título React. O ensaio não exercitou ações interativas de jogo nas duas abas antigas, portanto essa parte permanece sem comprovação.

**PASSOU (fallback híbrido):** em outra origem local, após instalar v6, o teste gravou o HTML de `dist/` nas entradas `./` e `./index.html` do cache legado, desligou a rede e recarregou. O texto estático de carregamento foi observado visível e o cache permaneceu `relogio-maluco-v6`. Essa situação foi simulada diretamente no Cache Storage, sem alegar uma sequência natural de atualização.

**PASSOU (rollback limitado):** após ativar o SW legado servido com `CACHE` v7 e recarregar, `caches.keys()` retornou apenas `relogio-maluco-v7`; com a rede desativada, a página recarregou e `document.title` retornou `Relógio Maluco`. A jogabilidade offline não foi exercitada.

## Verificações finais

`npm run typecheck`: exit 0; `npm run lint`: exit 0; `npm test`: exit 0, 1 arquivo/1 teste passou; `npm run build`: exit 0, Vite 8.3.8 e PWA 2.0.0, 5 entradas precacheadas. Os testes de navegador acima são ensaios locais pontuais, não uma suíte persistida no repositório.
