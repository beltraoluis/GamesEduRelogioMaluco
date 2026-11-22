# Monte o relógio — implementação e verificação

Base de integração: `cc63fc9` de `beltraoluis/updateVisual`. Trabalho na branch isolada `beltraoluis/monte-o-relogio`.

## Como jogar

1. Na tela inicial, escolha qualquer uma das quatro dificuldades e o cartão **Monte o relógio**.
2. Arraste as peças de horas para o mostrador, começando pelo **12 no topo**. Como alternativa, toque na peça e depois no encaixe; Tab, Enter e Espaço também permitem jogar.
3. Depois das 12 horas, escolha **Montar os minutos**. As horas permanecem no anel interno. Monte **00, 05, …, 55** no externo: **00 no topo**, **15 à direita**, **30 embaixo**, **45 à esquerda**.
4. Uma posição incorreta produz feedback gentil e mantém a peça disponível. Uma peça faltante impede avançar. A última peça dos minutos salva as estrelas; **Ver resultado** mostra a conclusão. É possível jogar novamente ou voltar ao início.

A montagem introdutória é a mesma em todas as dificuldades. As estrelas ficam associadas à dificuldade escolhida, como nos outros cartões; não há bloqueio de seleção manual.

## Evidências

- `npm run typecheck`, `npm run lint` e `git diff --check`: aprovados.
- `npm test`: **355 testes aprovados em 54 arquivos**, incluindo domínio, componente em StrictMode, persistência e entrada pelo App.
- `npm run test:coverage`: aprovado (354 testes antes da adição do teste de integração App); linhas globais **97,11%**, branches **91,24%**.
- Casos novos: posições cardeais, erro e correção, destino ocupado, peça duplicada ou inválida, peça faltante, transição de etapas, conclusão única, recorde salvo, repetição e saída. Os testes de gesto cobrem mouse e touch, cancelamento, soltar fora, segundo dedo e supressão do clique sintético.
- Navegador Orca: entrada pelo cartão, arrasto de `12` para posição errada, nova tentativa correta no topo, seleção de peça/destino até completar as duas etapas, resultado com três estrelas e armazenamento `assemble-1: 3`; sem erros no console inspecionado.
- Tela de **320 px**: sem rolagem horizontal; `12/00` separados e legíveis. A captura final está em `assembly-mobile.png`.
- Playwright/Chromium: teste `e2e/assembly.spec.ts` usa toque pelo motor de entrada (CDP) para arrastar e cancelar e `tap()` para concluir as duas etapas, corrigir erro, repetir, sair e verificar estrelas após recarregar. Também mede alvos de pelo menos 44 px e separação vertical de `12/00`.
- `check:no-emoji`, as **60 verificações de contraste**, `build` e `check:entry`: aprovados. A atividade entra no precache gerado pelo build sem novos arquivos externos.

## Limites e pendência da base

O comando de toque do navegador embutido Orca enviou coordenadas incorretas (inclusive x negativo). A verificação de toque foi realizada pelo Playwright do projeto. Isso não constitui teste em aparelho físico.

`check:size` reprova dois limites **já excedidos em `cc63fc9`**, confirmado reconstruindo uma cópia limpa da base com as mesmas dependências:

| Medida | Base | Com atividade (primeiro build) | Limite |
| --- | ---: | ---: | ---: |
| JS inicial gzip | 108.423 B | 110.896 B | 92.160 B |
| Precache | 574.726 B | 583.876 B | 524.288 B |

Não foram aumentados limites nem alterada a configuração compartilhada para esconder a falha. A entrega da funcionalidade não equivale a CI totalmente verde: o orçamento da base precisa ser resolvido antes de um PR ficar pronto para merge. Nenhum PR ou merge foi realizado nesta tarefa.
