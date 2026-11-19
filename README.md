# Relógio Maluco 🕒

Jogo web (PWA) para crianças aprenderem a ler as horas em relógios **analógicos** e **digitais**, arrastando fichas de números e palavras para as lacunas de resposta. Funciona **offline** e pode ser instalado no celular/tablet.

## Como rodar

Não há dependências nem etapa de build: são só HTML, CSS e JavaScript.

```bash
python3 -m http.server 8765
```

Abra http://localhost:8765. O service worker precisa de `http://localhost` ou `https://` (não funciona abrindo o arquivo direto).

Para publicar, envie a pasta inteira para qualquer hospedagem estática com HTTPS (GitHub Pages, Netlify, Vercel etc.).

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

```
index.html            telas e texto para educadores
css/style.css         visual
js/app.js             fluxo do jogo, modos, níveis, dicas
js/clock.js           relógio analógico SVG com ponteiros arrastáveis
js/time.js            números por extenso e frases da hora
js/dnd.js             arrastar e soltar
js/sound.js           efeitos sonoros (Web Audio) e voz
sw.js                 cache offline
manifest.webmanifest  instalação (PWA)
```

> Ao alterar qualquer arquivo, aumente `CACHE` em `sw.js` (ex.: `relogio-maluco-v2`) para os aparelhos receberem a nova versão.

## Licença

Copyright (C) 2026 Luis Henrique Coutinho Beltrão

Este programa é software livre: você pode redistribuí-lo e/ou modificá-lo sob os termos da **GNU Affero General Public License**, publicada pela Free Software Foundation, versão 3 da Licença ou (a seu critério) qualquer versão posterior (`AGPL-3.0-or-later`).

Ele é distribuído na esperança de ser útil, mas **sem qualquer garantia**, nem mesmo a garantia implícita de comerciabilidade ou adequação a um propósito específico. Veja o texto completo em [LICENSE](LICENSE).

Se você hospedar uma versão modificada para outras pessoas usarem pela rede, a AGPL (seção 13) exige que o código-fonte dessa versão seja oferecido a elas. Como o jogo é servido sem compilação, os próprios arquivos publicados já são o código-fonte; o jogo também mostra o aviso e o link da licença na tela **“Para educadores”**.
