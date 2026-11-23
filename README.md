# Relógio Maluco 🕒

Jogo web (PWA) para crianças aprenderem a ler as horas em relógios **analógicos** e **digitais**, arrastando fichas de números e palavras para as lacunas de resposta. Funciona **offline** e pode ser instalado no celular/tablet.

## Como rodar

O jogo usa React 19, TypeScript e Vite. Use Node.js 22.22.2 ou superior da série 22, ou 24.15.0 ou superior da série 24. Em um checkout Git do projeto, instale as dependências e inicie o servidor.

```bash
npm ci
npm run dev
```

Abra o endereço exibido pelo Vite. Para testar a instalação e o funcionamento offline, gere a versão de produção e inicie a prévia local.

```bash
npm ci && npm run build
npm run preview
```

Abra a prévia com internet uma vez, aguarde o indicador de disponibilidade offline no menu, desligue a rede e recarregue a página. Uma atualização recebida durante a partida fica disponível na tela inicial pelo botão **Atualizar agora**.

## Publicação

O GitHub Actions publica o jogo automaticamente no GitHub Pages quando uma alteração chega ao branch `main`. O deploy só começa depois que todas as verificações da CI passam; pull requests apenas executam as verificações.

Para habilitar a publicação no repositório:

1. Abra **Settings → Pages**.
2. Em **Build and deployment → Source**, selecione **GitHub Actions**.
3. Faça merge ou push no branch `main` e acompanhe **Actions → CI** até o job `deploy` terminar.

Como o repositório se chama `GamesEduRelogioMaluco`, o endereço publicado será <https://beltraoluis.github.io/GamesEduRelogioMaluco/>. O Vite já gera caminhos relativos, necessários para hospedar o mesmo build na pasta do projeto. Não selecione `gh-pages` nem configure uma pasta de publicação manualmente: o workflow envia `dist/` como artefato do Pages.

Para executar localmente uma compilação de produção, use `npm ci && npm run build`; ela exige um checkout Git com o commit da versão. Sirva o conteúdo de `dist/` por HTTPS. Para a prévia local, o navegador também permite o service worker em `localhost`.

Gere a distribuição a partir de um checkout limpo do commit que será disponibilizado como código-fonte. O build lê o SHA do Git ou de `GITHUB_SHA` e exige que esse commit exista no checkout.

## Modos

| Modo | O que a criança faz |
|---|---|
| **Números** | Lê o relógio analógico e arrasta as horas e os minutos para o relógio digital |
| **Palavras** | Completa a frase por extenso (“São três horas e quinze minutos”, “e meia”, “meio-dia”, “da tarde”) |
| **Ponteiros** | Lê o relógio digital e gira os ponteiros do analógico |
| **Explorar** | Brinca livremente; mostra a hora atual com o ponteiro dos segundos |

## Níveis × BNCC (Grandezas e Medidas)

| Nível | Conteúdo | Habilidades |
|---|---|---|
| 1 · Horas certas | ponteiro grande no 12 | EF01MA16 |
| 2 · Meias e quartos | 15, 30, 45 min, “e meia” | EF02MA19, EF03MA23 |
| 3 · De 5 em 5 | contagem de 5 em 5 | EF03MA22, EF03MA23 |
| 4 · Minuto a minuto · 24h | 15h = 3 h da tarde, meio-dia, meia-noite, períodos do dia | EF04MA22, EF01MA17 |

O texto completo para educadores está no botão **“Para educadores”** dentro do jogo.

## Recursos pedagógicos

- Cores fixas: **azul = horas**, **vermelho = minutos**, **roxo = período do dia** (ponteiros, fichas e lacunas).
- Distratores pensados nos erros comuns (ex.: ler o número para onde o ponteiro grande aponta como minuto; arredondar a hora para cima).
- Dicas específicas para cada erro, leitura em voz alta (voz do aparelho), estrelas por rodada.
- Arrastar com mouse, dedo ou caneta (Pointer Events); tocar na ficha também a encaixa; dá para jogar só com o teclado.
- O progresso fica no `localStorage` do aparelho; nenhum dado é enviado.

## Estrutura

| Caminho | Conteúdo |
|---|---|
| `src/app/`, `src/screens/` | Navegação, telas e controle da partida |
| `src/domain/`, `src/storage/` | Regras das horas, desafios, níveis e preferências |
| `src/components/`, `src/hooks/`, `src/audio/` | Relógios, fichas, arrasto, teclado, efeitos sonoros e voz |
| `src/content/` | Textos do jogo e material para educadores |
| `src/styles/`, `src/assets/`, `design/` | Estilos, fonte, ilustrações e seus arquivos de origem |
| `public/`, `vite.config.ts` | Ícones de instalação, licenças e geração do service worker e do manifesto |
| `e2e/`, `docs/qa/` | Testes de navegador e critérios de aceite |

## Licença

Copyright (C) 2026 Luis Henrique Coutinho Beltrão

Este programa é software livre: você pode redistribuí-lo e/ou modificá-lo sob os termos da **GNU Affero General Public License**, publicada pela Free Software Foundation, versão 3 da Licença ou (a seu critério) qualquer versão posterior (`AGPL-3.0-or-later`).

Ele é distribuído na esperança de ser útil, mas **sem qualquer garantia**, nem mesmo a garantia implícita de comerciabilidade ou adequação a um propósito específico. Veja o texto completo em [LICENSE](LICENSE).

O site serve arquivos compilados e minificados. No menu **Código-fonte** e no diálogo **Para educadores**, o jogo oferece o código correspondente à versão em execução pelo endereço `https://github.com/beltraoluis/GamesEduRelogioMaluco/tree/<SHA-do-build>`. O repositório inclui as fontes, os arquivos de design e as instruções de build acima.

Se você modificar o jogo e o oferecer pela rede, mantenha essa oferta acessível aos usuários conforme a seção 13 da AGPL. Ao publicar um fork, ajuste `SOURCE_REPO_URL` em `src/content/copy.ts` para apontar ao seu repositório e disponibilize nele o commit exato da sua distribuição. O build inclui `LICENSE.txt`, `THIRD_PARTY_LICENSES.txt` e `ASSETS-LICENSE.md` para consulta, inclusive offline.
