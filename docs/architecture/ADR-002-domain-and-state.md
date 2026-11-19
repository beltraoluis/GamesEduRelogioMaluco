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

### 2. `gameReducer` e eventos idempotentes

- `gameReducer(state: GameState, action: GameAction): GameState` é puro. Ações: `start`, `drop-tile`, `tap-tile`, `move-hands`, `check-hands`, `request-help`, `next`.
- O reducer **não executa efeitos**. Ele os descreve em `state.events: readonly GameEventEnvelope[]`, e cada envelope tem `{ sessionId, seq, event }`:
  - `sessionId` vem de fora do reducer (`crypto.randomUUID()` na UI) na ação `start`;
  - `seq` é estritamente crescente dentro da sessão (`state.seq` é o último emitido);
  - `events` contém só os eventos da última ação e é substituído a cada ação.
- O consumidor (um único `useEffect` em F2) guarda numa `ref` o último `seq` processado por `sessionId` e **ignora repetições**. Assim, a segunda execução do `StrictMode`, re-renders e re-montagens não tocam som, falam ou soltam confete duas vezes.
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

### 5. Preferências: escrita concorrente por operação

- Chave única do `localStorage`: `relogio-maluco-v1` (`PREFERENCES_STORAGE_KEY`), compatível com o legado `{ level, sound, voice, stars }`.
- Leitura tolerante (`ParsedPreferences`): JSON inválido ou campos fora do tipo caem nos padrões (`source: 'corrupt' | 'repaired'`), e chaves desconhecidas são preservadas em `extra` e regravadas.
- **Cada escrita é uma operação** (`PreferencesWriteOp`) aplicada sobre a leitura **mais recente** do armazenamento, nunca sobre a cópia em memória:
  1. ler `localStorage[KEY]`;
  2. aplicar a operação (função pura `applyPreferencesOp`);
  3. gravar o resultado.
- `record-stars` mescla pelo **máximo**: nunca rebaixa uma estrela. Duas abas que terminam rodadas diferentes preservam as duas estrelas.
- `reset-stars` grava `stars: {}` e preserva nível, som e voz. O evento `storage` de outra aba atualiza o estado em memória e não é reescrito (não há loop).
- Se o armazenamento estiver indisponível (modo privado, cota), `persistent = false`: o jogo funciona em memória e o diálogo dos educadores avisa que o progresso não será salvo.

## Consequências

- Distratores, dicas, estrelas e preferências têm teste unitário sem DOM.
- O formato salvo continua o mesmo: quem já tem estrelas do legado não perde nada.
- O fluxo de efeitos fica centralizado num só consumidor. Componentes não tocam som nem fala por conta própria durante o jogo.

## Alternativas rejeitadas

- **`Math.random` no reducer:** quebra a pureza e a reprodutibilidade, e o `StrictMode` daria resultados diferentes nas duas execuções.
- **Efeitos dentro de handlers de componentes:** espalham a regra pedagógica e duplicam som e fala sob `StrictMode`.
- **Gravar o objeto inteiro de preferências a cada mudança:** a última aba a gravar apaga as estrelas das outras.
- **Ler dicas em voz alta automaticamente:** atropela leitores de tela e cansa a criança. O `aria-live="polite"` já entrega a dica a quem precisa.
