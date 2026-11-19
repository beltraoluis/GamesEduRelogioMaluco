# Critérios de aceitação — F4 (QA a11y/visual) e F5 (fechamento)

Critérios objetivos e verificáveis. Cada item deve poder ser marcado com evidência (teste automatizado, checklist manual ou captura). Referências: ADR-001 a ADR-004, `src/contracts/index.ts`, `design/specs/visual-system.md`.

## F4 — Acessibilidade, percepção e interação

### F4.1 WCAG 2.2 AA nas 4 atmosferas

| ID | Critério | Como verificar | Passa quando |
|---|---|---|---|
| F4.1.1 | Contraste texto normal ≥ 4,5:1 | Medir tokens pedagógicos sobre card `#ffffff` e mostrador `#fffdf5` em `madrugada`, `manha`, `tarde`, `noite` | Todas as 4 atmosferas ≥ 4,5:1 |
| F4.1.2 | Contraste componentes gráficos ≥ 3:1 | Ponteiros, fichas, lacunas, selos | ≥ 3:1 nas 4 atmosferas |
| F4.1.3 | Visor digital escuro | `#8ec5ff` / `#ff9aa2` sobre `#1e2832` e `#263238` | ≥ 6,51:1 |
| F4.1.4 | `data-atmosphere` no DOM | Inspecionar root/tela em cada período | Valor correto por `atmosphereOf` |
| F4.1.5 | Sem falha axe crítica/séria | Vitest-axe / axe DevTools nas telas Home, Jogo, Explorar, Resultado, Educadores | 0 violações critical/serious |

### F4.2 Redundância de daltonismo (incluindo P&B)

| ID | Critério | Como verificar | Passa quando |
|---|---|---|---|
| F4.2.1 | Horas ≠ só azul | Bloco retangular + filete sólido lateral + `HandBadge` circular `H` | Forma reconhecível em protanopia/deuteranopia/tritanopia e em P&B |
| F4.2.2 | Minutos ≠ só vermelho | Borda tracejada / entalhe + `HandBadge` losango `M` | Idem |
| F4.2.3 | Período ≠ só roxo | Pílula + `PeriodMedallion` | Idem |
| F4.2.4 | Certo/errado ≠ só verde/vermelho | Ícone (`CheckBadge`), texto do balão e humor do mascote | Mensagem compreensível sem cor |
| F4.2.5 | Simulação F3 | Capturas com filtros de daltonismo | Nenhuma lacuna/ficha ambígua só por matiz |

### F4.3 Teclado tile-first e semântica

| ID | Critério | Como verificar | Passa quando |
|---|---|---|---|
| F4.3.1 | Ficha é o alvo de Tab | Tab na região de resposta | Lacunas (`Slot`) não recebem foco; fichas sim |
| F4.3.2 | Enter / Espaço encaixa | Foco na ficha + Enter ou Espaço | Vai à primeira lacuna vazia do mesmo grupo |
| F4.3.3 | Instrução SR | Nome acessível / live region | Contém orientação tile-first (`APP_COPY.game.tileFirstHint`) |
| F4.3.4 | `AnswerRegion` | DOM | `role="group"` + `aria-label` de `ANSWER_REGION_LABELS` |
| F4.3.5 | Slot anuncia estado | SR | Vazia: "Lacuna das …"; preenchida: "horas: 03" (ou equivalente) |
| F4.3.6 | Ponteiros por teclado | Modo hands: setas no SVG | Cima/baixo minutos; esquerda/direita horas |
| F4.3.7 | Diálogo educadores | Abrir/fechar | `<dialog>` nativo, Esc fecha, foco preso, sem `overflow:hidden` em `html`/`body` |

### F4.4 VoiceOver / TalkBack

| ID | Critério | Como verificar | Passa quando |
|---|---|---|---|
| F4.4.1 | Balão | VO/TalkBack | `aria-live="polite"` (nunca `assertive`); texto = `toPlainText` sem emoji |
| F4.4.2 | Progresso / estrelas | Rodada e resultado | Rótulos numéricos claros ("2 de 3 estrelas") |
| F4.4.3 | Menu e PWA | Itens Som, Voz, Educadores, Código-fonte, Instalar, offline | Nomes sem depender de ícone sozinho |
| F4.4.4 | Reset progresso | Fluxo 2 etapas | Anúncio `Progresso apagado.` após confirmar |

### F4.5 `prefers-reduced-motion`

| ID | Critério | Como verificar | Passa quando |
|---|---|---|---|
| F4.5.1 | Confete | Ativar reduced motion | Confete desligado |
| F4.5.2 | Microinterações | Pulinho, shake, glow | Viram mudança de cor/contorno sem movimento |
| F4.5.3 | Ponteiros | Rotação | Mantida (é conteúdo); sem transição longa ornamental |
| F4.5.4 | Estrelas do resultado | Animação | Aparecem sem escala |

## F5 — PWA, AGPL, LGPD e fechamento

### F5.1 PWA offline, migração e update

| ID | Critério | Como verificar | Passa quando |
|---|---|---|---|
| F5.1.1 | Offline após 1º acesso | DevTools offline + reload | App carrega; selo "Funciona sem internet" só com cache `workbox-precache-v2-*` válido |
| F5.1.2 | Migração 2 abas | Duas abas legado → deploy React + `registration.update()` | Zero reload automático; ambas jogáveis após ativação |
| F5.1.3 | Cleanup legado | `caches.keys()` | `relogio-maluco-v*` removidos; Workbox intacto |
| F5.1.4 | Toast update | HomeScreen | "Nova versão pronta" / "Atualizar agora" / "Agora não"; ausente durante rodada |
| F5.1.5 | Reload só explícito | Clique "Atualizar agora" | Único `location.reload()` do app |
| F5.1.6 | `hadControllerRef` | 1ª instalação + 2º `controllerchange` na mesma aba | Primeiro suprime; segundo marca `updateReady` |
| F5.1.7 | Fallback boot | HTML sem JS / cache híbrido | Texto estático em `#root` visível |
| F5.1.8 | Subpath `./` | Servir em `/` e `/GamesEduRelogioMaluco/` | SW, manifest (`start_url`/`scope` `./`) e offline OK |
| F5.1.9 | Rollback v7 | Publicar SW legado `CACHE=relogio-maluco-v7` | Offline volta ao legado; tentativa React posterior limpa v7 |

### F5.2 AGPL §13

| ID | Critério | Como verificar | Passa quando |
|---|---|---|---|
| F5.2.1 | Menu Código-fonte | URL | `tree/{commit}` do build (não branch `main`) |
| F5.2.2 | Diálogo educadores | Texto | Compilado/minificado; Corresponding Source; `npm ci` + `npm run build`; `dist/`; `LICENSE.txt`; `THIRD_PARTY_LICENSES.txt`; sem garantia |
| F5.2.3 | Artefatos precache | Rede offline | `LICENSE.txt` e `THIRD_PARTY_LICENSES.txt` respondem |
| F5.2.4 | SPDX | Lint | Todo `.ts`/`.tsx` em `src/` com cabeçalho AGPL |

### F5.3 LGPD art. 14 (crianças)

| ID | Critério | Como verificar | Passa quando |
|---|---|---|---|
| F5.3.1 | Sem telemetria | Rede / HTML | Sem analytics, trackers ou scripts de terceiros em runtime |
| F5.3.2 | Só progresso local | Storage | Única chave `relogio-maluco-v1` (nível, som, voz, estrelas) |
| F5.3.3 | Explicação + exclusão | Educadores | Texto claro + fluxo "Apagar progresso deste aparelho" |
| F5.3.4 | Armazenamento indisponível | Safari privado | `persistent === false`; aviso discreto; jogo jogável em memória |

### F5.4 Conteúdo e paridade pedagógica

| ID | Critério | Como verificar | Passa quando |
|---|---|---|---|
| F5.4.1 | 6 BNCC | `docs/qa/bncc-parity.md` + testes content | Códigos exatos presentes |
| F5.4.2 | Copy sem emoji | `npm test` content | Zero glifos proibidos |
| F5.4.3 | Distrator wrap 12 h | Testes F1 `adjacentHours` | `displayH` 1 e 12 cobertos |
| F5.4.4 | Gate de build | `npm ci && npm run typecheck && npm run lint && npm test` | Exit 0 |

## Registro de evidência (preencher em F4/F5)

| Gate | Data | Executor | Resultado | Evidência |
|---|---|---|---|---|
| F4 | | | pendente | |
| F5 | | | pendente | |
