// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { describe, expect, it } from 'vitest';

import { timeKey } from '../clockMath';
import { gameReducer, initGame } from '../gameReducer';
import type { StartAction } from '../gameReducer';
import type { GameAction, GameMode, GameState, LevelId, TileSpec } from '../types';

function startAction(mode: GameMode, levelId: LevelId, seed: number, sessionId = 's1', roundLength?: number): StartAction {
  return roundLength === undefined
    ? { type: 'start', sessionId, mode, levelId, seed }
    : { type: 'start', sessionId, mode, levelId, seed, roundLength };
}

function run(state: GameState, ...actions: GameAction[]): GameState {
  return actions.reduce(gameReducer, state);
}

function tiles(state: GameState): readonly TileSpec[] {
  const q = state.current.question;
  return q.mode === 'hands' ? [] : q.banks.flatMap((b) => b.tiles);
}

/** Próxima lacuna vazia e a ficha certa para ela. */
function nextCorrect(state: GameState): { slotId: string; tileId: string } {
  const q = state.current.question;
  if (q.mode === 'hands') throw new Error('hands');
  const slot = q.slots.find((s) => state.current.filled[s.id] === undefined);
  if (!slot) throw new Error('sem lacuna vazia');
  const tile = tiles(state).find((t) => t.group === slot.group && t.value === slot.answer);
  if (!tile) throw new Error('sem ficha certa');
  return { slotId: slot.id, tileId: tile.id };
}

function wrongTile(state: GameState, slotId: string): TileSpec {
  const q = state.current.question;
  if (q.mode === 'hands') throw new Error('hands');
  const slot = q.slots.find((s) => s.id === slotId);
  const tile = tiles(state).find((t) => t.group === slot?.group && t.value !== slot.answer);
  if (!tile) throw new Error('sem ficha errada');
  return tile;
}

function solve(state: GameState): GameState {
  let s = state;
  const q = s.current.question;
  if (q.mode === 'hands') return run(s, { type: 'move-hands', time: q.time }, { type: 'check-hands' });
  while (!s.current.done) {
    const { tileId, slotId } = nextCorrect(s);
    s = gameReducer(s, { type: 'drop-tile', tileId, slotId });
  }
  return s;
}

const ack = (upToSeq: number): GameAction => ({ type: 'events/ack', upToSeq });

describe('initGame', () => {
  it('estado inicial com evento question-started', () => {
    const s = initGame(startAction('numbers', 2, 1234));
    expect(s.status).toBe('playing');
    expect(s.index).toBe(0);
    expect(s.roundLength).toBe(8);
    expect(s.level.id).toBe(2);
    expect(s.seed).toBe(1234);
    expect(s.results).toEqual([]);
    expect(s.usedTimes).toEqual([timeKey(s.current.question.time)]);
    expect(s.current.hands).toBeNull();
    expect(s.feedback.code).toBe('intro');
    expect(s.feedback.tone).toBe('neutral');
    expect(s.pendingEvents).toEqual([{ sessionId: 's1', seq: 1, event: { type: 'question-started', index: 0 } }]);
    expect(s.lastEventSeq).toBe(1);
    expect(s.summary).toBeUndefined();
  });

  it('determinístico pela seed', () => {
    expect(initGame(startAction('words', 3, 99))).toEqual(initGame(startAction('words', 3, 99)));
    expect(initGame(startAction('words', 3, 99)).current.question).not.toEqual(initGame(startAction('words', 3, 100)).current.question);
  });

  it('roundLength personalizado; inválido cai em 8; nível inválido cai em 1', () => {
    expect(initGame(startAction('numbers', 1, 1, 's', 3)).roundLength).toBe(3);
    expect(initGame(startAction('numbers', 1, 1, 's', 0)).roundLength).toBe(8);
    expect(initGame(startAction('numbers', 1, 1, 's', 2.5)).roundLength).toBe(8);
    const bad = { ...startAction('numbers', 1, 1), levelId: 7 } as unknown as StartAction;
    expect(initGame(bad).level.id).toBe(1);
  });

  it('modo hands começa com os ponteiros na posição inicial', () => {
    const s = initGame(startAction('hands', 3, 5));
    const q = s.current.question;
    expect(q.mode).toBe('hands');
    expect(s.current.hands).toEqual(q.mode === 'hands' ? q.start : null);
  });

  it('lastEventSeq inicial negativo é limitado a 0', () => {
    expect(initGame(startAction('numbers', 1, 1), -5).lastEventSeq).toBe(1);
  });
});

describe('fila de eventos', () => {
  it('ações agrupadas (batching) anexam envelopes com seq consecutivos', () => {
    let s = initGame(startAction('numbers', 3, 42));
    const { tileId, slotId } = nextCorrect(s);
    const wrong = wrongTile(s, slotId);
    s = run(
      s,
      { type: 'drop-tile', tileId: wrong.id, slotId },
      { type: 'request-help' },
      { type: 'drop-tile', tileId, slotId },
    );
    expect(s.pendingEvents.map((e) => e.seq)).toEqual([1, 2, 3, 4]);
    expect(s.pendingEvents.map((e) => e.event.type)).toEqual(['question-started', 'tile-rejected', 'help-shown', 'tile-placed']);
    expect(s.pendingEvents.every((e) => e.sessionId === 's1')).toBe(true);
    expect(s.lastEventSeq).toBe(4);
  });

  it('events/ack remove só seq <= upToSeq e não mexe em lastEventSeq', () => {
    let s = initGame(startAction('numbers', 3, 42));
    s = run(s, { type: 'request-help' }, { type: 'request-help' });
    expect(s.lastEventSeq).toBe(3);
    const acked = gameReducer(s, ack(2));
    expect(acked.pendingEvents.map((e) => e.seq)).toEqual([3]);
    expect(acked.lastEventSeq).toBe(3);
    // Repetido / atrasado: nada a remover -> mesma referência.
    expect(gameReducer(acked, ack(2))).toBe(acked);
    expect(gameReducer(acked, ack(0))).toBe(acked);
    // upToSeq acima de lastEventSeq é limitado.
    const all = gameReducer(acked, ack(999));
    expect(all.pendingEvents).toEqual([]);
    expect(all.lastEventSeq).toBe(3);
    expect(gameReducer(all, ack(999))).toBe(all);
    // Eventos novos continuam a numeração.
    const more = gameReducer(all, { type: 'request-help' });
    expect(more.pendingEvents.map((e) => e.seq)).toEqual([4]);
  });

  it('novo start continua lastEventSeq e descarta a fila da sessão abandonada', () => {
    let s = initGame(startAction('numbers', 3, 42, 'old'));
    s = run(s, { type: 'request-help' }, { type: 'request-help' });
    expect(s.lastEventSeq).toBe(3);
    const fresh = gameReducer(s, startAction('words', 2, 7, 'new'));
    expect(fresh.sessionId).toBe('new');
    expect(fresh.lastEventSeq).toBe(4);
    expect(fresh.pendingEvents).toEqual([{ sessionId: 'new', seq: 4, event: { type: 'question-started', index: 0 } }]);
    // Um ack atrasado da sessão antiga não confirma eventos novos.
    expect(gameReducer(fresh, ack(3))).toBe(fresh);
  });
});

describe('drop-tile e tap-tile', () => {
  it('ficha de outro grupo: não conta como erro', () => {
    const s0 = initGame(startAction('numbers', 3, 42));
    const minuteTile = tiles(s0).find((t) => t.group === 'minute');
    if (!minuteTile) throw new Error('sem ficha');
    const s = gameReducer(s0, { type: 'drop-tile', tileId: minuteTile.id, slotId: 'slot-hour' });
    expect(s.current.mistakes).toBe(0);
    expect(s.current.wrongByGroup).toEqual({ hour: 0, minute: 0, period: 0 });
    expect(s.current.attempts).toHaveLength(1);
    expect(s.current.attempts[0]).toMatchObject({ kind: 'drop', tileGroup: 'minute', slotGroup: 'hour', correct: false });
    expect(s.feedback.code).toBe('drop.group-mismatch');
    expect(s.feedback.tone).toBe('corrective');
    expect(s.pendingEvents.at(-1)?.event).toEqual({
      type: 'tile-rejected',
      tileId: minuteTile.id,
      slotId: 'slot-hour',
      hint: 'drop.group-mismatch',
      counted: false,
    });
  });

  it('ficha errada do grupo certo: conta erro e diagnostica', () => {
    const s0 = initGame(startAction('numbers', 3, 42));
    const wrong = wrongTile(s0, 'slot-minute');
    const s = gameReducer(s0, { type: 'drop-tile', tileId: wrong.id, slotId: 'slot-minute' });
    expect(s.current.mistakes).toBe(1);
    expect(s.current.wrongByGroup.minute).toBe(1);
    expect(s.current.usedTileIds).toEqual([]);
    const ev = s.pendingEvents.at(-1)?.event;
    expect(ev?.type).toBe('tile-rejected');
    expect(ev?.type === 'tile-rejected' && ev.counted).toBe(true);
    expect(ev?.type === 'tile-rejected' && ev.hint).toBe(s.feedback.code);
    expect(s.feedback.context.attempt).toMatchObject({ kind: 'drop', correct: false });
    expect(s.feedback.context.group).toBe('minute');
  });

  it('ficha certa: progresso; última lacuna: conclui a pergunta', () => {
    const s0 = initGame(startAction('numbers', 3, 42));
    const first = nextCorrect(s0);
    const s1 = gameReducer(s0, { type: 'drop-tile', ...first });
    expect(s1.current.filled).toEqual({ [first.slotId]: first.tileId });
    expect(s1.current.usedTileIds).toEqual([first.tileId]);
    expect(s1.feedback.code).toBe('progress');
    expect(s1.pendingEvents.at(-1)?.event).toEqual({ type: 'tile-placed', ...first, questionComplete: false });
    expect(s1.rngState).not.toBe(s0.rngState);

    const second = nextCorrect(s1);
    const s2 = gameReducer(s1, { type: 'drop-tile', ...second });
    expect(s2.current.done).toBe(true);
    expect(s2.results).toEqual([0]);
    expect(s2.feedback.code).toBe('praise');
    expect(s2.feedback.tone).toBe('positive');
    expect(s2.pendingEvents.slice(-2).map((e) => e.event)).toEqual([
      { type: 'tile-placed', ...second, questionComplete: true },
      { type: 'question-completed', index: 0, mistakes: 0, perfect: true },
    ]);
  });

  it('tap-tile vai para a primeira lacuna vazia do mesmo grupo', () => {
    const s0 = initGame(startAction('words', 4, 8));
    const { tileId, slotId } = nextCorrect(s0);
    const tapped = gameReducer(s0, { type: 'tap-tile', tileId });
    expect(tapped).toEqual(gameReducer(s0, { type: 'drop-tile', tileId, slotId }));
    // Outra ficha de horas: a lacuna de horas já está cheia -> sem efeito.
    const other = tiles(tapped).find((t) => t.group === 'hour' && t.id !== tileId);
    if (!other) throw new Error('sem ficha');
    expect(gameReducer(tapped, { type: 'tap-tile', tileId: other.id })).toBe(tapped);
  });

  it('erros acumulam no resultado da pergunta', () => {
    let s = initGame(startAction('numbers', 2, 3));
    const wrong = wrongTile(s, 'slot-hour');
    s = run(s, { type: 'drop-tile', tileId: wrong.id, slotId: 'slot-hour' }, { type: 'drop-tile', tileId: wrong.id, slotId: 'slot-hour' });
    s = solve(s);
    expect(s.results).toEqual([2]);
    expect(s.pendingEvents.at(-1)?.event).toEqual({ type: 'question-completed', index: 0, mistakes: 2, perfect: false });
  });
});

describe('modo ponteiros', () => {
  it('move-hands, check errado e check certo', () => {
    const s0 = initGame(startAction('hands', 3, 21));
    const q = s0.current.question;
    if (q.mode !== 'hands') throw new Error('hands');
    // Check na posição inicial (sempre errada).
    const s1 = gameReducer(s0, { type: 'check-hands' });
    expect(s1.current.mistakes).toBe(1);
    const ev = s1.pendingEvents.at(-1)?.event;
    expect(ev?.type).toBe('hands-rejected');
    expect(s1.feedback.tone).toBe('corrective');
    expect(s1.current.attempts[0]).toMatchObject({ kind: 'hands', correct: false });

    const s2 = gameReducer(s1, { type: 'move-hands', time: { h: q.time.h + 12 > 23 ? q.time.h - 12 : q.time.h + 12, m: q.time.m, s: 3 } });
    expect(s2.current.hands).toEqual({ h: s2.current.hands?.h, m: q.time.m });
    expect(s2.pendingEvents).toBe(s1.pendingEvents);
    const s3 = gameReducer(s2, { type: 'check-hands' });
    expect(s3.current.done).toBe(true);
    expect(s3.results).toEqual([1]);
    expect(s3.current.attempts.at(-1)).toMatchObject({ kind: 'hands', correct: true, hourOk: true, minuteOk: true });
    expect(s3.pendingEvents.at(-1)?.event).toEqual({ type: 'question-completed', index: 0, mistakes: 1, perfect: false });
  });

  it('erro de hora conta em wrongByGroup.hour', () => {
    const s0 = initGame(startAction('hands', 2, 4));
    const q = s0.current.question;
    if (q.mode !== 'hands') throw new Error('hands');
    const s = run(s0, { type: 'move-hands', time: { h: (q.time.h % 12) + 1, m: q.time.m } }, { type: 'check-hands' });
    expect(s.current.wrongByGroup).toEqual({ hour: 1, minute: 0, period: 0 });
    expect(s.pendingEvents.at(-1)?.event).toMatchObject({ type: 'hands-rejected', highlight: 'hour', hint: 'hands.hour.adjust' });
  });

  it('dica nos ponteiros', () => {
    const s0 = initGame(startAction('hands', 1, 4));
    const s1 = gameReducer(s0, { type: 'request-help' });
    expect(s1.current.hinted).toBe(true);
    expect(s1.pendingEvents.at(-1)?.event).toEqual({
      type: 'help-shown',
      hint: 'help.hands',
      highlight: { hands: 'both', minuteLabels: true },
    });
    const s2 = gameReducer(s1, { type: 'request-help' });
    expect(s2.current).toBe(s1.current);
    expect(s2.pendingEvents).toHaveLength(3);
  });
});

describe('request-help nos modos com lacunas', () => {
  it('marca hinted e informa o grupo em foco', () => {
    const s0 = initGame(startAction('numbers', 3, 42));
    const s = gameReducer(s0, { type: 'request-help' });
    expect(s.current.hinted).toBe(true);
    expect(s.feedback.context.group).toBe('hour');
    expect(s.feedback.tone).toBe('neutral');
    expect(s.pendingEvents.at(-1)?.event.type).toBe('help-shown');
  });
});

describe('rodada completa', () => {
  for (const mode of ['numbers', 'words', 'hands'] as const) {
    it(`${mode}: 8 perguntas, horas sem repetição e resumo`, () => {
      let s = initGame(startAction(mode, 3, 2026));
      for (let i = 0; i < 8; i++) {
        expect(s.index).toBe(i);
        s = solve(s);
        expect(s.current.done).toBe(true);
        s = gameReducer(s, { type: 'next' });
      }
      expect(s.status).toBe('finished');
      expect(new Set(s.usedTimes).size).toBe(8);
      expect(s.summary).toEqual({
        mode,
        levelId: 3,
        starsKey: `${mode}-3`,
        results: [0, 0, 0, 0, 0, 0, 0, 0],
        totalMistakes: 0,
        perfect: 8,
        stars: 3,
      });
      expect(s.feedback.code).toBe('done');
      expect(s.pendingEvents.at(-1)?.event).toEqual({ type: 'round-finished', summary: s.summary });
      const types = s.pendingEvents.map((e) => e.event.type);
      expect(types.filter((t) => t === 'question-started')).toHaveLength(8);
      expect(types.filter((t) => t === 'question-completed')).toHaveLength(8);
      const seqs = s.pendingEvents.map((e) => e.seq);
      expect(seqs).toEqual(seqs.map((_, i) => i + 1));
      // Depois do fim, só start/ack têm efeito.
      for (const a of [{ type: 'next' }, { type: 'request-help' }, { type: 'check-hands' }] as GameAction[]) {
        expect(gameReducer(s, a)).toBe(s);
      }
    });
  }

  it('mesma seed + mesmas ações = mesmo estado', () => {
    const play = () => {
      let s = initGame(startAction('words', 2, 555));
      for (let i = 0; i < 8; i++) s = gameReducer(solve(s), { type: 'next' });
      return s;
    };
    expect(play()).toEqual(play());
  });

  it('erros reduzem as estrelas', () => {
    let s = initGame(startAction('numbers', 1, 9, 's', 2));
    const wrong = wrongTile(s, 'slot-hour');
    for (let i = 0; i < 6; i++) s = gameReducer(s, { type: 'drop-tile', tileId: wrong.id, slotId: 'slot-hour' });
    s = gameReducer(solve(s), { type: 'next' });
    s = gameReducer(solve(s), { type: 'next' });
    expect(s.summary?.stars).toBe(1);
    expect(s.summary?.results).toEqual([6, 0]);
  });
});

describe('ações inválidas devolvem a mesma referência', () => {
  const base = initGame(startAction('numbers', 3, 42));
  const done = solve(base);

  it('drop/tap em pergunta concluída', () => {
    const t = tiles(done)[0];
    if (!t) throw new Error('sem ficha');
    expect(gameReducer(done, { type: 'drop-tile', tileId: t.id, slotId: 'slot-hour' })).toBe(done);
    expect(gameReducer(done, { type: 'tap-tile', tileId: t.id })).toBe(done);
    expect(gameReducer(done, { type: 'request-help' })).toBe(done);
  });

  it('drop em lacuna cheia ou com ficha já usada', () => {
    const first = nextCorrect(base);
    const s = gameReducer(base, { type: 'drop-tile', ...first });
    const other = tiles(s).find((t) => t.group === 'hour' && t.id !== first.tileId);
    if (!other) throw new Error('sem ficha');
    expect(gameReducer(s, { type: 'drop-tile', tileId: other.id, slotId: first.slotId })).toBe(s);
    expect(gameReducer(s, { type: 'drop-tile', tileId: first.tileId, slotId: 'slot-minute' })).toBe(s);
    expect(gameReducer(s, { type: 'tap-tile', tileId: first.tileId })).toBe(s);
  });

  it('ficha ou lacuna inexistente', () => {
    expect(gameReducer(base, { type: 'drop-tile', tileId: 'nope', slotId: 'slot-hour' })).toBe(base);
    expect(gameReducer(base, { type: 'drop-tile', tileId: 'hour-0', slotId: 'nope' })).toBe(base);
    expect(gameReducer(base, { type: 'tap-tile', tileId: 'nope' })).toBe(base);
  });

  it('next com pergunta em aberto', () => {
    expect(gameReducer(base, { type: 'next' })).toBe(base);
  });

  it('check-hands e move-hands fora do modo ponteiros', () => {
    expect(gameReducer(base, { type: 'check-hands' })).toBe(base);
    expect(gameReducer(base, { type: 'move-hands', time: { h: 1, m: 0 } })).toBe(base);
  });

  it('modo ponteiros: fichas, posição igual, hora inválida e pergunta concluída', () => {
    const h = initGame(startAction('hands', 2, 1));
    expect(gameReducer(h, { type: 'drop-tile', tileId: 'hour-0', slotId: 'slot-hour' })).toBe(h);
    expect(gameReducer(h, { type: 'tap-tile', tileId: 'hour-0' })).toBe(h);
    const pos = h.current.hands;
    if (!pos) throw new Error('sem ponteiros');
    expect(gameReducer(h, { type: 'move-hands', time: { h: pos.h, m: pos.m } })).toBe(h);
    for (const time of [{ h: 24, m: 0 }, { h: -1, m: 0 }, { h: 1, m: 60 }, { h: 1, m: -1 }, { h: 1.5, m: 0 }, { h: 1, m: 0.5 }]) {
      expect(gameReducer(h, { type: 'move-hands', time })).toBe(h);
    }
    const solved = solve(h);
    expect(gameReducer(solved, { type: 'check-hands' })).toBe(solved);
    expect(gameReducer(solved, { type: 'move-hands', time: { h: 1, m: 0 } })).toBe(solved);
    const noHands: GameState = { ...h, current: { ...h.current, hands: null } };
    expect(gameReducer(noHands, { type: 'check-hands' })).toBe(noHands);
  });

  it('dica sem lacuna vazia (estado inconsistente) e ação desconhecida', () => {
    const q = base.current.question;
    if (q.mode === 'hands') throw new Error('modo');
    const allFilled: GameState = {
      ...base,
      current: { ...base.current, filled: Object.fromEntries(q.slots.map((s) => [s.id, 'x'])) },
    };
    expect(gameReducer(allFilled, { type: 'request-help' })).toBe(allFilled);
    expect(gameReducer(base, { type: 'unknown' } as unknown as GameAction)).toBe(base);
  });
});
