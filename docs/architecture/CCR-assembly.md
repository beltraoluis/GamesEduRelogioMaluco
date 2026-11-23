# CCR — Monte o relógio

Base: `cc63fc9` (`beltraoluis/updateVisual`), incorporada por fast-forward na branch isolada `beltraoluis/monte-o-relogio` em 2026-11-22, conforme orientação do coordenador.

## Mudança solicitada

Adicionar a atividade `assemble` a `ModeId`, com estrelas `assemble-1` a `assemble-4`. `GameMode`, as quatro dificuldades, as rodadas de oito perguntas e suas regras ficam intactos. A atividade tem uma máquina de estado própria, duas etapas de 12 peças e uma tela de conclusão específica; usa a mesma função `starsFor`, o mesmo store de preferências e a mesma navegação de retorno ao início.

O formato JSON e a chave `relogio-maluco-v1` não mudam. O parser passa a reconhecer as quatro novas chaves de estrelas. Recordes anteriores, preferências e campos futuros continuam preservados; apagar progresso também apaga as estrelas da montagem. Não há migração destrutiva.

## Interação e apresentação

Esta atividade exige escolher uma posição no mostrador. Por isso, seus destinos são botões, permitindo selecionar uma peça e depois um destino com toque ou teclado, conforme o pedido explícito da tarefa. Os destinos dos modos anteriores continuam com seus contratos originais.

Reutiliza `useTileDrag` e `DragLayerProvider`, sem alterar o mecanismo compartilhado. Horas usam azul e filete sólido; minutos usam vermelho e borda tracejada, com friso duplo depois de preenchidos. Além das cores, há títulos de etapa, números e feedback textual. As horas ficam num anel interno estático na etapa dos minutos; o anel externo conserva `00` no topo, `15` à direita, `30` embaixo e `45` à esquerda.

## Impacto e revisão

Mudanças aditivas no catálogo, roteamento, tipos de identificação e validação de estrelas. Nenhuma edição na branch compartilhada `updateVisual`, nenhuma dependência nova e nenhum merge. O pedido de implementação e a autorização de base vêm do coordenador; este registro documenta o impacto para revisão da integração, sem afirmar aprovação independente que não ocorreu.
