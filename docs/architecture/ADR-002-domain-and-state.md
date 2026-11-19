# ADR-002 — Domínio e estado

- **Status:** Aceito (G0)
- **Data:** 2026-11-19
- **Decisores:** Coordenador Antigravity, Assessor Opus, Argon, Codex, Grok; aprovado pelo usuário
- **Contratos:** `src/domain/types.ts`, `src/domain/messages.ts`, `src/contracts/index.ts`

## Contexto

No legado, `app.js` mistura sorteio (`Math.random`), regras pedagógicas, DOM e efeitos (som, fala, confete) num estado global mutável. Isso impede testar distratores e dicas, e repetiria efeitos em dobro sob o `StrictMode` do React 19, que monta e executa efeitos duas vezes em desenvolvimento.

## Decisão

### 1. Domínio puro e determinístico

- `src/domain/**` é TypeScript puro: sem React, DOM, `window`, `document`, `Date.now()` ou `Math.random()`.
- A aleatoriedade vem sempre de um `Rng` (`() => number` em `[0, 1)`) criado a partir de uma **seed** (PRNG de 32 bits, ex.: mulberry32). O `GameState` guarda `seed` e `rngState`, então a mesma seed e as mesmas ações produzem sempre a mesma rodada. Testes e relatos de bug ficam reproduzíveis.
- Horas no domínio são sempre 0–23 (`ClockTime.h`). `to12` só entra na exibição e na leitura do analógico.
- `ClockMathApi` (`contracts`) é a interface de `domain/clockMath.ts` (F1a). F1b codifica contra ela ou contra fakes.

### 2. `gameReducer` e fila de eventos idempotente

- `gameReducer(state: GameState, action: GameAction): GameState` é puro. Ações: `start`, `drop-tile`, `tap-tile`, `move-hands`, `check-hands`, `request-help`, `next` e `events/ack`.
- O reducer **não executa efeitos**. Ele os descreve como envelopes `GameEventEnvelope = { sessionId, seq, event }` numa **fila explícita** no estado:
  - `pendingEvents: readonly GameEventEnvelope[]`: efeitos ainda não confirmados, em ordem crescente de `seq`;
  - `lastEventSeq: number`: maior `seq` já emitido. É monotônico na sessão e não volta a 0 num novo `start`, que continua a numeração. Assim um `ack` atrasado da sessão anterior nunca confirma eventos novos.
- **Anexar, nunca substituir.** Cada ação que gera efeitos anexa envelopes com `seq = lastEventSeq + 1, + 2, ...`. Com o *automatic batching* do React 19, várias ações podem ser reduzidas antes de uma única renderização, e uma fila substituída a cada ação perderia os efeitos das primeiras.
- **Só `{ type: 'events/ack', upToSeq }` remove** envelopes, os de `seq <= upToSeq`. O `ack` não emite eventos nem altera `lastEventSeq`, e um `upToSeq > lastEventSeq` é limitado a ele.
- **`start` descarta a fila anterior.** Os efeitos ainda pendentes de uma sessão abandonada (ex.: a fanfarra de uma rodada que a criança trocou por outra) não são executados.
- **Consumidor (`useGameController`, F2).** O mesmo hook é dono do `useReducer` e do cursor de deduplicação `useRef<GameEventCursor | null>` (`{ sessionId, seq }`), e os dois têm o mesmo ciclo de vida. O cursor nunca fica em componentes filhos. Num `useEffect` dependente de `state.pendingEvents`, o hook:
  1. percorre `pendingEvents` em ordem de `seq`;
  2. executa o efeito (`onEvent`) só quando o `sessionId` do envelope difere do cursor ou quando `seq > cursor.seq`, e avança o cursor antes do envelope seguinte;
  3. se a fila não estava vazia, despacha `events/ack` com o maior `seq` da fila.
- **Por que não perde nem duplica:**
  - *Batching:* todos os envelopes das ações agrupadas estão na fila quando o efeito roda.
  - *StrictMode:* na remontagem simulada, o efeito roda de novo sobre o mesmo estado, antes de o `ack` ser aplicado. O `ref` sobrevive à remontagem simulada e o cursor pula o que já foi executado.
  - *Remontagem real:* estado e cursor nascem e morrem juntos. Um controlador novo começa com fila vazia, então não há eventos antigos para repetir.
  - *`ack` atrasado ou duplicado:* `seq` nunca é reutilizado, e confirmar de novo uma faixa já removida não tem efeito.
- `drop.group-mismatch` (ficha na lacuna de outra cor) gera `tile-rejected` com `counted: false` e não conta como erro, igual ao legado.
- Estrelas da rodada: soma de erros `<= 1` dá 3, `<= 5` dá 2, senão 1 (`RoundSummary.stars`). Rodada de 8 perguntas (`ROUND_LENGTH`).

### 3. Correção do distrator de 12 h (aprovada)

No legado, os distratores "hora vizinha" eram `displayH + 1` e `displayH - 1` sem volta. Para `displayH = 12` isso gera `13` e, para `displayH = 1`, gera `0`. Nos níveis de 12 h esses valores não estão no pool, então o distrator pedagógico mais importante (arredondar a hora) sumia justamente no 12 e no 1.

**Decisão:** usar wrap: `to12(displayH ± 1)` nos níveis de 12 h e `(displayH ± 1 + 24) % 24` no nível de 24 h (`ClockMathApi.adjacentHours`). Isso muda a distribuição de fichas em relação ao legado e é intencional. Os testes de F1 cobrem `displayH ∈ {1, 12}`.

### 4. Dicas sem fala automática

- Dicas (`drop.*`, `hands.*`, `help.*`) aparecem no balão, que é uma região `aria-live="polite"`. Isso basta para leitores de tela, e a voz **não lê dicas automaticamente**.
- A voz do aparelho (`SpeechApi`) só fala elogio + frase da hora ao acertar, o título do resultado e o que a criança pede no botão "Ouvir".
- Mensagens são dados (`Message` com segmentos). `toPlainText` gera o texto corrido do `aria-live` e da fala: omite selos sem `spokenAs`, normaliza espaços e pontuação, deixa uma única ocorrência de "dois pontos" e remove emojis e glifos.
- `HintCode` lista todos os diagnósticos. O texto de cada código é montado a partir de `HintContext` por um gerador puro em `domain/` (F1).

### 5. Preferências: escrita por operação, síncrona e best-effort

**Decisão do Coordenador:** `PreferencesApi` continua **síncrona**. Não usamos Web Locks nem outra coordenação assíncrona entre abas, porque não queremos essa complexidade numa preferência infantil simples.

- Chave única do `localStorage`: `relogio-maluco-v1` (`PREFERENCES_STORAGE_KEY`), compatível com o legado `{ level, sound, voice, stars }`.
- Leitura tolerante (`ParsedPreferences`): JSON inválido ou campos fora do tipo caem nos padrões (`source: 'corrupt' | 'repaired'`), e chaves desconhecidas são preservadas em `extra` e regravadas.
- **Cada escrita é uma operação** (`PreferencesWriteOp`) e é feita de forma síncrona, no mesmo handler:
  1. **releitura imediata** de `localStorage[KEY]`, e não da cópia em memória;
  2. aplicação da operação pela função pura `applyPreferencesOp`;
  3. gravação do resultado.
- `record-stars` aplica o **máximo apenas na chave atual** (`key`), sobre a releitura. As demais chaves vêm da releitura e não da memória da aba.
- `reset-stars` é **explícito** (botão do educador): grava `stars: {}` e preserva nível, som e voz. Se outra aba terminar uma rodada depois do reset, ela volta a gravar a sua chave, e isso é o comportamento esperado.
- O evento `storage` de outra aba só atualiza o estado em memória e não regrava nada (não há loop).
- Se o armazenamento estiver indisponível (modo privado, cota), `persistent = false`: o jogo funciona em memória e o diálogo dos educadores avisa que o progresso não será salvo.

**Garantia real (sem promessas de atomicidade).** A escrita por operação é **best-effort**. Ela mitiga o caso comum, que é uma aba aberta há muito tempo, com estado obsoleto, sobrescrever as estrelas que outra aba gravou. Ela **não** oferece atomicidade nem exclusão mútua entre abas. O par releitura + gravação do `localStorage` não é transacional: se duas abas fizerem leitura e gravação no mesmo instante, a última gravação vence e a operação da outra pode se perder (ex.: uma das duas estrelas novas). Aceitamos esse risco porque a janela de corrida é pequena (duas gravações praticamente simultâneas), o dado é de baixo valor e recuperável (basta jogar de novo), e a alternativa assíncrona complicaria toda a API.

#### Adendo descritivo (F2a, 2026-11-19): limite aprovado e releitura ao voltar à aba

Este adendo só descreve o comportamento já aprovado em F1a (`storage/preferencesStore.ts`) e a ligação feita em F2a (`hooks/usePreferences.ts`). Ele não muda contratos, o formato salvo nem a garantia best-effort acima.

- **Operações pendentes.** Se a gravação falhar (cota, modo privado), a operação fica pendente em memória: o snapshot mostra a última versão conhecida do storage mais as operações locais, e `persistent` fica `false`. Na recuperação (próxima operação ou `refresh()`), as pendentes são gravadas sobre uma releitura, reconciliadas com o que outras abas gravaram nesse meio-tempo.
- **Limite aprovado: operações "às cegas".** Uma operação feita com a **leitura** do storage também bloqueada não sabe o que outras abas gravaram antes dela. O formato salvo (do legado) não tem relógio nem versão, então uma mudança externa descoberta depois tem **ordem indeterminada** em relação a essa operação. Nesse caso vale a regra **não destrutiva**: o `set-*` local vence e a rodada local é preservada, mesmo que isso faça sobreviver um recorde anterior a um reset de estrelas que esta aba não observou. Para operações feitas com leitura OK, o que a releitura revela de novo aconteceu depois delas, e a mudança externa vence (inclusive um reset externo, que descarta as estrelas pendentes).
- **Evento `storage` é só um sinal.** O conteúdo (`oldValue`/`newValue`) e a ordem de entrega não são usados, porque o evento pode chegar atrasado. Ele só dispara uma releitura, e o handler nunca grava.
- **Releitura ao voltar à aba.** Eventos `storage` podem se perder enquanto a aba está congelada ou no bfcache. Por isso `usePreferences()` lê o store com `useSyncExternalStore` (snapshot estável, que só muda quando preferências ou `persistent` mudam) e chama `refresh()` em `visibilitychange` (só quando visível), `focus` e `pageshow`. O `refresh()` relê o storage, aplica a regra acima e grava as pendentes. Sem pendências, ele não regrava as preferências: no máximo testa a gravação numa chave de sonda própria, que as outras abas ignoram. Assim a releitura não cria loop entre abas.

## Consequências

- Distratores, dicas, estrelas e preferências têm teste unitário sem DOM.
- O formato salvo continua o mesmo: quem já tem estrelas do legado não perde nada.
- Gravações simultâneas em abas diferentes ainda podem, raramente, perder uma operação (risco aceito; ver seção 5).
- O fluxo de efeitos fica centralizado num só consumidor. Componentes não tocam som nem fala por conta própria durante o jogo.

## Alternativas rejeitadas

- **`Math.random` no reducer:** quebra a pureza e a reprodutibilidade, e o `StrictMode` daria resultados diferentes nas duas execuções.
- **Efeitos dentro de handlers de componentes:** espalham a regra pedagógica e duplicam som e fala sob `StrictMode`.
- **Gravar o objeto inteiro de preferências (cópia em memória) a cada mudança:** uma aba obsoleta apaga as estrelas das outras.
- **Web Locks (`navigator.locks`) ou `BroadcastChannel` com eleição de líder:** dariam exclusão mútua, mas tornariam `PreferencesApi` assíncrona, o que é desproporcional para preferências infantis.
- **Fila única de efeitos substituída a cada ação (`events` da última ação):** perde efeitos com automatic batching e depende da ordem de renderização.
- **Ler dicas em voz alta automaticamente:** atropela leitores de tela e cansa a criança. O `aria-live="polite"` já entrega a dica a quem precisa.
