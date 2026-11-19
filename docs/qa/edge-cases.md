# Catálogo de casos de borda — E2E (F2d) e QA (F4)

Casos que quebram com facilidade em relógios, pointer events, storage e PWA. Cada item sugere asserção mínima para Playwright (F2d) ou checklist manual (F4).

## 1. Transição 11:59 <-> 12:00

| Campo | Detalhe |
|---|---|
| Contexto | Modo Explorar com `linkHands: true`; também nível 4 / ponteiros perto do meio-dia |
| Risco | Hora não avança/recua ao cruzar o 12; período/atmosfera errados; `to12` vs 24 h |
| Passos | 1) Explorar: arrastar minuto de 59 -> 0 e de 0 -> 59. 2) Conferir hora digital e frase. 3) Repetir no modo Ponteiros nível 4 em 11:59 / 12:00 / 00:00 |
| Esperado | Cruzar 59->0 avança 1 hora; 0->59 recua 1 hora. Período e atmosfera coerentes (`periodOf` / `atmosphereOf`). Meio-dia e meia-noite nas frases 24 h |
| Automação | E2E: `withMinute` / drag simulado; assert `h` e texto da frase |

## 2. `pointercancel` durante arraste de ficha

| Campo | Detalhe |
|---|---|
| Contexto | `useTileDrag` / camada de fantasma; legado escuta `pointercancel` como `up` |
| Risco | Fantasma preso; ficha em `dragging`; lacuna `over` residual; drop fantasma |
| Passos | 1) Iniciar arraste. 2) Disparar `pointercancel` (interrupção do SO, scroll, alerta). 3) Tentar nova ficha |
| Esperado | Fantasma removido ou animação de retorno; classes limpas; nenhum `drop` parcial; próxima interação normal |
| Automação | Disparar `pointercancel` no botão da ficha após `pointerdown`+move > 8 px |

## 3. Multitoque no tablet

| Campo | Detalhe |
|---|---|
| Contexto | Duas fichas ou ficha + ponteiro ao mesmo tempo |
| Risco | Dois fantasmas; hit-test errado; `setPointerCapture` conflitando |
| Passos | 1) Touch A inicia arraste. 2) Touch B em outra ficha ou no relógio. 3) Soltar em ordens diferentes |
| Esperado | Um arraste ativo por vez (ou cancelamento seguro do segundo); sem fichas `used` indevidas; sem exceção |
| Automação | Dois ponteiros sintéticos com `pointerId` distintos; assert estado do drag layer |

## 4. Safari privado / `localStorage` indisponível

| Campo | Detalhe |
|---|---|
| Contexto | `PreferencesApi.persistent === false` |
| Risco | Crash ao gravar; usuário acha que estrelas persistiram; reset sem efeito claro |
| Passos | 1) Simular `localStorage.setItem` lançando. 2) Jogar rodada e ganhar estrelas. 3) Abrir educadores. 4) Recarregar |
| Esperado | Jogo funciona em memória; aviso discreto (`APP_COPY.persistence.unavailable`); após reload, estrelas voltam ao padrão; sem uncaught exception |
| Automação | Mock de Storage que throw; assert `persistent === false` e texto do aviso |

## 5. Reset de estrelas com aba concorrente

| Campo | Detalhe |
|---|---|
| Contexto | Escrita por operação (ADR-002 §5); sem Web Locks |
| Risco | Aba A reseta; aba B termina rodada e regrava uma chave; UI da A desatualizada |
| Passos | 1) Duas abas com estrelas. 2) Aba A: "Apagar progresso" (2 etapas). 3) Aba B: terminar rodada depois. 4) Observar evento `storage` na A |
| Esperado | Reset grava `stars: {}` preservando nível/som/voz. Aba B pode gravar só a chave da rodada após o reset (comportamento documentado). Aba A atualiza memória no `storage` sem loop de regravação. Confirmação anuncia "Progresso apagado." |
| Automação | Dois contextos Playwright; ordenar reset -> finish; ler `localStorage` |

## 6. 1ª instalação SW + atualização posterior na mesma aba (`hadControllerRef`)

| Campo | Detalhe |
|---|---|
| Contexto | ADR-003: `controller === null` no mount; `skipWaiting` + `clientsClaim` |
| Risco | Ref congelado no mount: 2º `controllerchange` nunca marca `updateReady`; ou 1º dispara toast falso |
| Passos | 1) Aba sem controller. 2) 1º `controllerchange` (aquisição). 3) Deploy novo + 2º `controllerchange`. 4) Ir à Home |
| Esperado | Após (2): `updateReady === false`. Após (3): `updateReady === true`. Toast só na Home. Nenhum `reload` automático. "Agora não" esconde; "Atualizar agora" chama `reload` uma vez |
| Automação | Testes unitários F2c do hook + E2E com SW mockado |

## 7. iOS Safari — áudio e voz

| Campo | Detalhe |
|---|---|
| Contexto | `AudioContext` suspenso; `speechSynthesis` intermitente; sem `beforeinstallprompt` |
| Risco | Som silencioso até gesto; voz engasga; dica de instalação ausente |
| Passos | 1) Abrir na Safari iOS (não standalone). 2) Verificar tip "Compartilhar > Adicionar à Tela de Início". 3) Ativar Som/Voz e jogar uma ficha (gesto). 4) Ouvir frase; pedir Dica (não deve falar sozinha) |
| Esperado | `showIosInstallTip` true fora de standalone. `SoundApi.unlock()` no gesto. Voz só em elogio/frase/"Ouvir". Dicas só no balão `aria-live` |
| Automação | Limitada em CI; checklist F4 em dispositivo real ou simulador |

## 8. Casos satélite (cobrir se o tempo permitir)

| Caso | Esperado resumido |
|---|---|
| Soltar ficha fora de qualquer lacuna | Fantasma retorna; ficha reabilitada; sem erro contado |
| Ficha de grupo A na lacuna B | `drop.group-mismatch`; sem incremento de `mistakes` |
| StrictMode (dev): efeitos de som/fala | Sem duplicar graças ao cursor `GameEventCursor` |
| Update pronto durante a rodada | Toast só ao voltar à Home |
| Subpath `/GamesEduRelogioMaluco/` offline | Reload offline carrega app; `LICENSE.txt` 200 |
| `displayH` 1 e 12 nos distratores | Vizinhos via `to12(displayH ± 1)` presentes no banco |
| Reduced motion + confete no acerto | Sem partículas animadas |
| Diálogo educadores + rolar página atrás | Sem jump de scroll; Esc fecha |

## Matriz de prioridade sugerida

| Prioridade | Casos | Fase |
|---|---|---|
| P0 | 1, 4, 5, 6 | F2d + F4 |
| P1 | 2, 3, 7 | F2d (2–3) + F4 device (7) |
| P2 | Satélites | Conforme cobertura restante |

## Modelo de relatório de falha

```text
Caso: <número/título>
Ambiente: <browser / OS / standalone?>
Repro: <passos>
Esperado: <...>
Obtido: <...>
Evidência: <log / screenshot / har>
```
