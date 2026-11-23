// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { act, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PREFERENCES_STORAGE_KEY } from '../../contracts';
import type { GameState, ServiceWorkerUpdateApi } from '../../contracts';
import { spokenPhrase } from '../../domain/question';
import { RESULT_TITLES } from '../../domain/scoring';
import { createPreferencesStore } from '../../storage/preferencesStore';
import type { StorageLike } from '../../storage/preferencesStore';
import type { GameSessionApi } from '../../screens/GameScreen/useGameController';
import { App } from '../App';
import type { AppScreens } from '../screenProps';
import { HISTORY_STATE_KEY } from '../useBackToHome';

const sfx = vi.hoisted(() => ({ play: vi.fn(), unlock: vi.fn() }));
vi.mock('../../hooks/useSound', () => ({
  useSound: (enabled = true) => ({ enabled, play: (n: string) => (enabled ? sfx.play(n) : undefined), unlock: sfx.unlock }),
}));

function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}

let session: GameSessionApi | null = null;
const screens: AppScreens = {
  Home: ({ prefs, onSelectMode, onChangeLevel, update, sourceUrl }) => (
    <div>
      <h1>Início</h1>
      <p>nível {prefs.level}</p>
      <p>{update.updateReady ? 'nova versão' : 'sem atualização'}</p>
      <p>{sourceUrl}</p>
      <button type="button" onClick={() => onChangeLevel(4)}>Nível 4</button>
      <button type="button" onClick={() => onSelectMode('numbers')}>Números</button>
      <button type="button" onClick={() => onSelectMode('hands')}>Ponteiros</button>
      <button type="button" onClick={() => onSelectMode('explore')}>Explorar</button>
      <button type="button" onClick={() => onSelectMode('assemble')}>Monte o relógio</button>
    </div>
  ),
  Game: (props) => {
    session = props.session;
    return (
      <div>
        <h1>Jogo {props.mode}</h1>
        <p>pergunta {(props.session.state?.index ?? -1) + 1}</p>
        <button type="button" onClick={props.onHome}>Voltar</button>
      </div>
    );
  },
  Explore: ({ onHome, speech }) => (
    <div>
      <h1>Explorar</h1>
      <button type="button" onClick={() => speech.speak('São três horas.')}>Ouvir</button>
      <button type="button" onClick={onHome}>Voltar</button>
    </div>
  ),
  Result: ({ summary, newRecord, onPlayAgain, onHome }) => (
    <div>
      <h1>Resultado {summary.stars}</h1>
      <p>{newRecord ? 'recorde' : 'sem recorde'}</p>
      <button type="button" onClick={onPlayAgain}>Jogar de novo</button>
      <button type="button" onClick={onHome}>Início</button>
    </div>
  ),
};

const speech = { cancel: vi.fn(), speak: vi.fn(), getVoices: () => [], addEventListener: vi.fn(), removeEventListener: vi.fn() };
class Utterance {
  text: string;
  lang = '';
  rate = 1;
  pitch = 1;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

beforeEach(() => {
  session = null;
  sfx.play.mockClear();
  speech.cancel.mockClear();
  speech.speak.mockClear();
  vi.stubGlobal('speechSynthesis', speech);
  vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function renderApp(useUpdate?: () => ServiceWorkerUpdateApi) {
  const storage = memoryStorage();
  const store = createPreferencesStore({ storage, eventTarget: null });
  let n = 0;
  const createSession = () => ({ sessionId: `app-${++n}`, seed: 77 + n });
  render(
    <StrictMode>
      <App
        screens={screens}
        preferencesStore={store}
        sourceUrl="https://example.test/tree/abc"
        createSession={createSession}
        {...(useUpdate === undefined ? {} : { useUpdate })}
      />
    </StrictMode>,
  );
  return { storage, store };
}

function current(): GameSessionApi {
  if (session === null) throw new Error('sem sessão');
  return session;
}

it('abre montagem pela seleção habitual e salva sem alterar dificuldade ou estrelas anteriores', () => {
  const { store } = renderApp();
  act(() => { store.setLevel(3); store.recordStars('numbers-3', 2); });
  fireEvent.click(screen.getByText('Monte o relógio'));
  expect(session).toBeNull();
  for (let phase = 0; phase < 2; phase++) {
    for (let p = 0; p < 12; p++) {
      fireEvent.click(document.querySelector(`[data-piece="${p}"]`)!);
      fireEvent.click(document.querySelector(`[data-slot-id="assembly-${p}"]`)!);
    }
    if (phase === 0) fireEvent.click(screen.getByText('Montar os minutos'));
  }
  expect(store.getSnapshot().prefs.stars).toEqual({ 'numbers-3': 2, 'assemble-3': 3 });
  fireEvent.click(screen.getByText('Ver resultado'));
  expect(screen.getByText('Você montou o relógio!')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Início'));
  expect(screen.getByText('nível 3')).toBeInTheDocument();
  store.dispose();
});

function solveCurrent(): void {
  const s = current().state as GameState;
  const q = s.current.question;
  if (q.mode === 'hands') {
    act(() => current().moveHands(q.time));
    act(() => current().checkHands());
    return;
  }
  for (const slot of q.slots) {
    const tile = q.banks.flatMap((b) => b.tiles).find((tl) => tl.group === slot.group && tl.value === slot.answer);
    act(() => current().tapTile(tile?.id ?? ''));
  }
}

function playRound(): void {
  for (let i = 0; i < 8; i++) {
    solveCurrent();
    act(() => current().next());
  }
}

const spokenTexts = (): string[] => speech.speak.mock.calls.map(([u]) => (u as Utterance).text);

describe('App', () => {
  it('preserva a nova partida quando chega a travessia de Voltar e aceita o próximo voltar do sistema', async () => {
    const nextPop = () => new Promise<void>((resolve) => window.addEventListener('popstate', () => resolve(), { once: true }));
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Explorar' }));
    // O navegador decide quando executar a travessia. Solte a chamada nativa
    // depois da seleção seguinte para reproduzir essa ordem deterministicamente.
    const traverse = window.history.back.bind(window.history);
    const back = vi.spyOn(window.history, 'back').mockImplementationOnce(() => {});
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(back).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Ponteiros' }));
    await act(async () => {
      const previousBack = nextPop();
      traverse();
      await previousBack;
    });
    expect(screen.getByRole('heading', { name: 'Jogo hands' })).toBeInTheDocument();
    expect(current().state?.sessionId).toBe('app-1');
    expect(window.history.state).toMatchObject({ [HISTORY_STATE_KEY]: 'away' });

    await act(async () => {
      const systemBack = nextPop();
      window.history.back();
      await systemBack;
    });
    expect(screen.getByRole('heading', { name: 'Início' })).toBeInTheDocument();
    expect(window.history.state).toBeNull();
  });

  it('fala o elogio final completo antes do título quando o acerto e o resultado chegam no mesmo lote', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Ponteiros' }));
    for (let i = 0; i < 7; i++) {
      solveCurrent();
      act(() => current().next());
    }
    const state = current().state as GameState;
    const time = state.current.question.time;
    const phrase = spokenPhrase(state.mode, state.level, time);
    speech.speak.mockClear();
    speech.cancel.mockClear();
    act(() => {
      current().moveHands(time);
      current().checkHands();
      current().next();
    });
    expect(screen.getByRole('heading', { name: 'Resultado 3' })).toBeInTheDocument();
    const spoken = spokenTexts();
    expect(spoken).toHaveLength(1);
    expect(spoken[0]).toBe(`Muito bem! ${phrase} ${RESULT_TITLES[3]}`);
    expect(speech.cancel).toHaveBeenCalledTimes(1);
    expect(speech.cancel).toHaveBeenCalledBefore(speech.speak);
  });

  it('rodada completa sob StrictMode: efeitos uma vez, estrelas gravadas, resultado', () => {
    const { storage } = renderApp();
    expect(screen.getByRole('heading', { name: 'Início' })).toBeInTheDocument();
    expect(screen.getByText('sem atualização')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ponteiros' }));
    expect(screen.getByRole('heading', { name: 'Jogo hands' })).toBeInTheDocument();
    expect(screen.getByText('pergunta 1')).toBeInTheDocument();

    playRound();

    expect(screen.getByRole('heading', { name: 'Resultado 3' })).toBeInTheDocument();
    expect(screen.getByText('recorde')).toBeInTheDocument();
    expect(JSON.parse(storage.data.get(PREFERENCES_STORAGE_KEY) ?? '{}')).toMatchObject({ stars: { 'hands-1': 3 } });
    const played = sfx.play.mock.calls.map(([n]) => n as string);
    expect(played.filter((n) => n === 'fanfare')).toHaveLength(1);
    expect(played.filter((n) => n === 'success')).toHaveLength(8);
    const spoken = spokenTexts();
    expect(spoken).toHaveLength(9);
    expect(spoken[8]).toBe(RESULT_TITLES[3]);
    expect(document.querySelector('[data-confetti-seq="9"]')).not.toBeNull();

    // Segunda rodada com o mesmo resultado: sem novo recorde.
    fireEvent.click(screen.getByRole('button', { name: 'Jogar de novo' }));
    expect(speech.cancel).toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Jogo hands' })).toBeInTheDocument();
    playRound();
    expect(screen.getByText('sem recorde')).toBeInTheDocument();

    speech.cancel.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Início' }));
    expect(screen.getByRole('heading', { name: 'Início' })).toBeInTheDocument();
    expect(speech.cancel).toHaveBeenCalled();
  });

  it('nível 4 anuncia 24 h; voltar do sistema cancela a fala e volta ao início', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Nível 4' }));
    expect(screen.getByText('nível 4')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Números' }));
    solveCurrent();
    expect(spokenTexts()[0]).toContain(' Ou: ');
    act(() => current().listen());
    expect(spokenTexts()[1]).toContain(' Ou: ');

    speech.cancel.mockClear();
    act(() => window.dispatchEvent(new PopStateEvent('popstate', { state: null })));
    expect(screen.getByRole('heading', { name: 'Início' })).toBeInTheDocument();
    expect(speech.cancel).toHaveBeenCalled();
  });

  it('explorar: sair pelo botão cancela a fala', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Explorar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ouvir' }));
    expect(speech.speak).toHaveBeenCalledTimes(1);
    speech.cancel.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByRole('heading', { name: 'Início' })).toBeInTheDocument();
    expect(speech.cancel).toHaveBeenCalled();
  });

  it('jogo: botão voltar cancela a fala no meio da partida', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Números' }));
    solveCurrent();
    speech.cancel.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByRole('heading', { name: 'Início' })).toBeInTheDocument();
    expect(speech.cancel).toHaveBeenCalled();
  });

  it('concluir a rodada e voltar pelo botão no mesmo lote: sem fanfarra, título, estrelas ou resultado', () => {
    const { storage } = renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Ponteiros' }));
    for (let i = 0; i < 7; i++) {
      solveCurrent();
      act(() => current().next());
    }
    solveCurrent();
    const before = { played: sfx.play.mock.calls.length, spoken: speech.speak.mock.calls.length };
    const onHome = screen.getByRole('button', { name: 'Voltar' });
    act(() => {
      current().next();
      onHome.click();
    });
    expect(screen.getByRole('heading', { name: 'Início' })).toBeInTheDocument();
    expect(sfx.play.mock.calls.slice(before.played).map(([n]) => n as string)).toEqual([]);
    expect(speech.speak.mock.calls.slice(before.spoken)).toEqual([]);
    expect(storage.data.get(PREFERENCES_STORAGE_KEY)).toBeUndefined();
  });

  it('concluir a rodada e voltar do sistema no mesmo lote: nenhum efeito tardio nem navegação ao resultado', () => {
    const { storage } = renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Números' }));
    for (let i = 0; i < 7; i++) {
      solveCurrent();
      act(() => current().next());
    }
    solveCurrent();
    const before = { played: sfx.play.mock.calls.length, spoken: speech.speak.mock.calls.length };
    act(() => {
      current().next();
      window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
    });
    expect(screen.getByRole('heading', { name: 'Início' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Resultado/ })).toBeNull();
    expect(sfx.play.mock.calls.slice(before.played).map(([n]) => n as string)).not.toContain('fanfare');
    expect(speech.speak.mock.calls.slice(before.spoken)).toEqual([]);
    expect(storage.data.get(PREFERENCES_STORAGE_KEY)).toBeUndefined();
  });

  it('acertar, sair e começar outra partida: só a sessão nova gera efeitos', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Números' }));
    const onHome = screen.getByRole('button', { name: 'Voltar' });
    const s = current().state as GameState;
    const q = s.current.question;
    if (q.mode === 'hands') throw new Error('esperava números');
    const ids = q.slots.map((slot) => q.banks.flatMap((b) => b.tiles).find((tl) => tl.group === slot.group && tl.value === slot.answer)?.id ?? '');
    sfx.play.mockClear();
    act(() => {
      for (const id of ids) current().tapTile(id);
      onHome.click();
    });
    expect(screen.getByRole('heading', { name: 'Início' })).toBeInTheDocument();
    expect(sfx.play.mock.calls.map(([n]) => n as string)).toEqual([]);
    expect(speech.speak).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Ponteiros' }));
    expect(screen.getByRole('heading', { name: 'Jogo hands' })).toBeInTheDocument();
    expect(screen.getByText('pergunta 1')).toBeInTheDocument();
    expect(current().state?.sessionId).toBe('app-2');
    expect(sfx.play.mock.calls.map(([n]) => n as string)).toEqual(['pick']);
    solveCurrent();
    expect(sfx.play.mock.calls.map(([n]) => n as string).filter((n) => n === 'success')).toHaveLength(1);
    expect(speech.speak).toHaveBeenCalledTimes(1);
  });

  it('atualização do SW: hook montado no App e repassado à Home', () => {
    const update: ServiceWorkerUpdateApi = { updateReady: true, applyUpdate: vi.fn(), dismissToast: vi.fn() };
    const useUpdate = vi.fn(() => update);
    renderApp(useUpdate);
    expect(screen.getByText('nova versão')).toBeInTheDocument();
    const calls = useUpdate.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Números' }));
    expect(useUpdate.mock.calls.length).toBeGreaterThan(calls);
  });
});
