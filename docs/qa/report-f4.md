# Relógio Maluco · QA visual e de acessibilidade

Em 22 de novembro de 2026, a prévia integrada servida em `localhost:5174` passou nas provas visuais, de teclado e de acessibilidade automatizada descritas abaixo. O teste encontrou uma violação séria no seletor de nível. A correção de F2b `ff8aa1a` passou no reteste.

A composição de desenvolvimento partiu do checkout local `28a0c927`, com as quatro telas e os hooks PWA reais. As capturas também incluem as alterações locais de contraste dos campos preenchidos, do mascote e do arrasto pelo 12. As verificações de tamanho, distribuição offline e release têm gates próprios.

## Matriz visual no navegador integrado do Orca

Cada linha inclui os dois sentidos do viewport em pixels CSS. Foram capturados quatro estados por orientação, totalizando 40 imagens. O teste comparou a largura rolável do documento com a largura visível após cada redimensionamento.

| Retrato | Paisagem | Estados capturados | Rolagem horizontal |
|---|---|---|---|
| 360 × 800 | 800 × 360 | Home, Explorar 09h, Explorar 21h e 21h em P&B | Ausente |
| 390 × 844 | 844 × 390 | Os quatro estados | Ausente |
| 768 × 1024 | 1024 × 768 | Os quatro estados | Ausente |
| 1024 × 1366 | 1366 × 1024 | Os quatro estados | Ausente |
| 1366 × 1600 | 1600 × 1366 | Os quatro estados | Ausente |

Nas larguras estreitas a Home dispõe os cartões em coluna; a largura de 768 px acomodou três cartões na primeira linha e quatro ficaram lado a lado em 1024 px. Em Explorar o visor vem abaixo do relógio no telefone em retrato e à direita nas larguras maiores. Nas alturas de 360 e 390 px, a rolagem vertical dá acesso ao conteúdo abaixo da dobra.

Algumas capturas da janela do Orca em alturas grandes repetiram uma faixa do topo na parte inferior. Numa verificação separada do mesmo viewport de 1366 × 1600 no Chromium, havia um único `h1`, e o ponto na faixa inferior continha apenas `body` e `html`. As imagens da janela alta devem ser interpretadas com essa limitação.

## Acessibilidade e teclado

| Prova | Método | Resultado |
|---|---|---|
| Home, Educadores, Explorar às 09h e às 21h, Jogo nos três modos e Resultado | Chromium com axe-core no DOM real, viewport de 390 × 844, regras WCAG A/AA a partir das etiquetas WCAG 2.0, 2.1 e 2.2 disponíveis na biblioteca | Zero violações reportadas em cada estado após a correção do seletor |
| Seletor de nível | A primeira execução detectou `label-content-name-mismatch` de impacto sério no botão que exibe o nível atual. A tentativa intermediária `159c019` ainda reproduziu a falha. Em `ff8aa1a` o botão deriva o nome do texto visível e a mesma varredura passou | Corrigido e retestado |
| Resposta por teclado | Um contexto novo do Chromium abriu Números no nível 1. O teste leu a posição dos ponteiros, focou a ficha de horas, pressionou Enter e encaixou a de minutos com Espaço. O fluxo avançou nas oito perguntas e alcançou Resultado | As duas lacunas ficaram preenchidas e o botão de início apareceu na tela de resultado |
| Diálogo dos educadores | Abertura pelo menu, varredura com diálogo aberto, Escape e verificação de `document.activeElement` | Foco retornou ao botão Menu |
| Atmosferas e contraste | 24 passos de hora por teclado em Explorar, leitura de `data-atmosphere` e execução do script de contraste do projeto | Manhã, tarde, noite e madrugada observadas; 60 de 60 combinações de contraste aprovadas |
| Identificação sem depender da cor | 12 capturas dos modos Números, Palavras e Ponteiros, em acromatopsia, protanopia, deuteranopia e tritanopia, via emulação de visão do Chromium; inspeção das capturas no nível 1 | Comprimentos dos ponteiros, filete lateral da lacuna de horas e contorno tracejado da lacuna vazia de minutos permanecem distinguíveis. A escala de cinza também foi aplicada à tela Explorar no Orca |
| Safari móvel | Smoke visual registrado pelo coordenador no simulador de iPhone 14 com iOS 16.4 | A Home renderizou |
| Chrome móvel | Emulador Android Pixel 2, depuração remota de Chrome, entrada de teclado em Explorar | A Home exibiu os quatro modos. Ao avançar das 09h às 12h, o jogo exibiu “É meio-dia”. Texto verificado no DOM via CDP. A captura de tela excedeu o tempo limite |

## Limites e reprodução

As varreduras do DOM e a simulação de deficiências de visão não avaliam a experiência de uma pessoa usando o jogo. A escuta com VoiceOver e TalkBack em dispositivos físicos continua pendente. A rodada de teclado e as simulações visuais dos desafios exibiam o nível 1. A verificação visual dos estados de dia e noite foi feita em Explorar.

Os arquivos de evidência ficaram temporariamente em `/tmp/relogio-f4-20261122/`. As montagens `home-montage.jpg`, `dia-montage.jpg`, `noite-montage.jpg`, `noite-pb-montage.jpg` e `simulacoes.jpg` acompanham as capturas individuais. Os resultados de acessibilidade estão em `axe.json`, `axe-final.log` e `modes.log`; os viewports e dimensões observadas estão em `orca.log`. A captura do simulador iOS está em `/tmp/relogio-ios-16.png`. Esses arquivos de trabalho podem expirar após limpeza do sistema.
