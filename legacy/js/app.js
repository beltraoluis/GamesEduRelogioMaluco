// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { AnalogClock } from './clock.js';
import { numberWord, pad, to12, periodOf, phraseParts, phraseText, phrase24, PERIODS } from './time.js';
import { setupTile } from './dnd.js';
import { sfx, speak, setSoundOn, setVoiceOn } from './sound.js';

/* ------------------------------------------------------------------ */
/* Configuração                                                        */
/* ------------------------------------------------------------------ */

const LEVELS = [
  { id: 1, name: 'Horas certas', grade: '1º ano', step: 60, h24: false, bank: 3 },
  { id: 2, name: 'Meias e quartos', grade: '2º ano', step: 15, h24: false, bank: 4 },
  { id: 3, name: 'De 5 em 5', grade: '3º ano', step: 5, h24: false, bank: 4 },
  { id: 4, name: 'Minuto a minuto · 24h', grade: '4º e 5º anos', step: 1, h24: true, bank: 4 },
];

const MODES = {
  numbers: { icon: '🔢', title: 'Números', desc: 'Leia o relógio e arraste os números' },
  words: { icon: '🔤', title: 'Palavras', desc: 'Monte a frase da hora' },
  hands: { icon: '🕒', title: 'Ponteiros', desc: 'Gire os ponteiros do relógio' },
  explore: { icon: '🔍', title: 'Explorar', desc: 'Brinque livremente com o relógio' },
};

const ROUND = 8;
const KEY = 'relogio-maluco-v1';
const GROUP_NAMES = { hour: 'horas', minute: 'minutos', period: 'período do dia' };
const PERIOD_ICONS = { 'da madrugada': '🌌', 'da manhã': '🌅', 'da tarde': '☀️', 'da noite': '🌙' };
const PRAISE = ['Muito bem!', 'Isso mesmo!', 'Arrasou!', 'Que incrível!', 'Mandou bem!', 'Perfeito!'];
const OOPS = ['Quase! Tente de novo.', 'Hmm, olhe com atenção.', 'Não foi dessa vez. Você consegue!'];

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

const $ = (s, r = document) => r.querySelector(s);
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function make(tag, props = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'dataset') Object.assign(e.dataset, v);
    else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    e.append(c.nodeType ? c : document.createTextNode(c));
  }
  return e;
}

/** Escolhe `count` distratores: até count-1 dos "preferidos" (erros comuns) e o resto aleatório. */
function distractors(answer, preferred, pool, count) {
  const out = new Set();
  for (const p of shuffle(preferred)) {
    if (out.size >= Math.max(1, count - 1)) break;
    if (p !== answer && pool.includes(p)) out.add(p);
  }
  for (const p of shuffle(pool)) {
    if (out.size >= count) break;
    if (p !== answer) out.add(p);
  }
  return [...out];
}

/* ------------------------------------------------------------------ */
/* Preferências e progresso (somente neste aparelho)                   */
/* ------------------------------------------------------------------ */

const prefs = { level: 1, sound: true, voice: true, stars: {} };
try { Object.assign(prefs, JSON.parse(localStorage.getItem(KEY)) || {}); } catch { /* sem armazenamento */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* ignora */ } };
setSoundOn(prefs.sound);
setVoiceOn(prefs.voice);

/* ------------------------------------------------------------------ */
/* Mascote (personagem original: o Tic, um despertador)                */
/* ------------------------------------------------------------------ */

const MASCOT_SVG = `
<svg viewBox="0 0 120 120" aria-hidden="true">
  <g class="m-bells">
    <circle cx="28" cy="24" r="14" fill="#ff8fab"/><circle cx="92" cy="24" r="14" fill="#ff8fab"/>
    <rect x="56" y="6" width="8" height="12" rx="3" fill="#6c584c"/>
  </g>
  <line x1="34" y1="104" x2="24" y2="116" stroke="#6c584c" stroke-width="7" stroke-linecap="round"/>
  <line x1="86" y1="104" x2="96" y2="116" stroke="#6c584c" stroke-width="7" stroke-linecap="round"/>
  <circle cx="60" cy="64" r="46" fill="#ffb703"/>
  <circle cx="60" cy="64" r="37" fill="#fffdf5"/>
  <g class="m-eyes" fill="#2b2d42"><ellipse cx="46" cy="56" rx="5" ry="7"/><ellipse cx="74" cy="56" rx="5" ry="7"/></g>
  <circle cx="38" cy="72" r="5" fill="#ffadad" opacity=".8"/><circle cx="82" cy="72" r="5" fill="#ffadad" opacity=".8"/>
  <path class="m-mouth m-happy" d="M46 74 Q60 88 74 74" fill="none" stroke="#2b2d42" stroke-width="4" stroke-linecap="round"/>
  <path class="m-mouth m-think" d="M50 80 Q60 74 70 80" fill="none" stroke="#2b2d42" stroke-width="4" stroke-linecap="round"/>
  <line x1="60" y1="64" x2="60" y2="38" stroke="#e63946" stroke-width="3" stroke-linecap="round" class="m-hand"/>
</svg>`;
document.querySelectorAll('.mascot').forEach((m) => { m.innerHTML = MASCOT_SVG; });
const setMood = (elm, mood) => {
  elm.dataset.mood = mood;
  elm.classList.remove('bounce');
  void elm.offsetWidth;
  elm.classList.add('bounce');
};

/* ------------------------------------------------------------------ */
/* Telas                                                               */
/* ------------------------------------------------------------------ */

let exploreTimer = null;
function show(id) {
  document.querySelectorAll('.screen').forEach((s) => { s.hidden = s.id !== id; });
  if (id !== 'screen-explore') stopLive();
  window.scrollTo(0, 0);
}

/* ---------- Início ---------- */

const levelContent = (L) => [
  make('span', { class: 'level-num' }, String(L.id)),
  make('span', { class: 'level-text' },
    make('span', { class: 'level-name' }, L.name),
    make('span', { class: 'level-grade' }, L.grade)),
];

function setLevelOpen(open) {
  const lv = $('#levels');
  lv.classList.toggle('open', open);
  $('#level-current')?.setAttribute('aria-expanded', String(open));
}

function chooseLevel(id) {
  prefs.level = id;
  save();
  sfx.pick();
  renderHome();
  $('#level-current').focus();
}

function renderHome() {
  const lv = $('#levels');
  const cur = LEVELS[prefs.level - 1];
  const current = make('button', {
    type: 'button',
    id: 'level-current',
    class: 'level level-current',
    'aria-haspopup': 'listbox',
    'aria-expanded': 'false',
    'aria-label': `Nível ${cur.id}: ${cur.name}, ${cur.grade}. Toque para trocar.`,
    onclick: () => { sfx.pick(); setLevelOpen(!lv.classList.contains('open')); },
  }, ...levelContent(cur), make('span', { class: 'level-caret', 'aria-hidden': 'true' }, '▾'));
  const prev = make('button', {
    type: 'button', class: 'level-step', 'aria-label': 'Nível anterior', disabled: cur.id === 1,
    onclick: () => chooseLevel(cur.id - 1),
  }, '‹');
  const next = make('button', {
    type: 'button', class: 'level-step', 'aria-label': 'Próximo nível', disabled: cur.id === LEVELS.length,
    onclick: () => chooseLevel(cur.id + 1),
  }, '›');
  const list = make('div', { class: 'level-list', role: 'listbox', 'aria-label': 'Níveis' },
    LEVELS.map((L) => make('button', {
      type: 'button',
      role: 'option',
      class: `level${L.id === cur.id ? ' active' : ''}`,
      'aria-selected': String(L.id === cur.id),
      onclick: () => chooseLevel(L.id),
    }, ...levelContent(L))));
  lv.replaceChildren(make('div', { class: 'level-row' }, prev, current, next), list);

  const md = $('#modes');
  md.replaceChildren(...Object.entries(MODES).map(([id, M]) => {
    const stars = id === 'explore' ? null : prefs.stars[`${id}-${prefs.level}`] || 0;
    return make('button', {
      type: 'button',
      class: `mode mode-${id}`,
      onclick: () => { sfx.pick(); id === 'explore' ? openExplore() : startGame(id); },
    },
    make('span', { class: 'mode-icon', 'aria-hidden': 'true' }, M.icon),
    make('span', { class: 'mode-title' }, M.title),
    make('span', { class: 'mode-desc' }, M.desc),
    stars !== null && make('span', { class: 'mode-stars', 'aria-label': `${stars} de 3 estrelas` }, '★'.repeat(stars) + '☆'.repeat(3 - stars)));
  }));

  $('#btn-sound').textContent = prefs.sound ? '🔔 Som: ligado' : '🔕 Som: desligado';
  $('#btn-voice').textContent = prefs.voice ? '🗣️ Voz: ligada' : '🤐 Voz: desligada';
}

function setMenuOpen(open) {
  $('#menu').classList.toggle('open', open);
  $('#btn-menu').setAttribute('aria-expanded', String(open));
  $('#btn-menu').setAttribute('aria-label', open ? 'Fechar menu' : 'Menu');
}
$('#btn-menu').addEventListener('click', () => { sfx.pick(); setMenuOpen(!$('#menu').classList.contains('open')); });

document.addEventListener('click', (e) => {
  if (!e.target.closest('#levels')) setLevelOpen(false);
  if (!e.target.closest('#menu')) setMenuOpen(false);
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if ($('#levels').classList.contains('open')) { setLevelOpen(false); $('#level-current').focus(); }
  if ($('#menu').classList.contains('open')) { setMenuOpen(false); $('#btn-menu').focus(); }
});

$('#btn-sound').addEventListener('click', () => { prefs.sound = !prefs.sound; setSoundOn(prefs.sound); save(); sfx.pick(); renderHome(); });
$('#btn-voice').addEventListener('click', () => {
  prefs.voice = !prefs.voice; setVoiceOn(prefs.voice); save(); renderHome();
  if (prefs.voice) speak('Oi! Eu sou o Tic!');
});
const teachers = $('#teachers');
$('#btn-teachers').addEventListener('click', () => { setMenuOpen(false); teachers.showModal(); });
$('#btn-close-teachers').addEventListener('click', () => teachers.close());
teachers.addEventListener('click', (e) => { if (e.target === teachers) teachers.close(); });
$('#btn-reset').addEventListener('click', () => {
  if (confirm('Apagar todas as estrelas salvas neste aparelho?')) { prefs.stars = {}; save(); renderHome(); teachers.close(); }
});

/* ------------------------------------------------------------------ */
/* Jogo                                                                */
/* ------------------------------------------------------------------ */

let game = null;

function randomTime(L, used) {
  let h, m, key, guard = 0;
  do {
    h = L.h24 ? rand(0, 23) : rand(1, 12);
    m = L.step === 60 ? 0 : rand(0, 60 / L.step - 1) * L.step;
    key = `${h}:${m}`;
  } while (used.has(key) && ++guard < 50);
  used.add(key);
  return { h, m };
}

function startGame(mode) {
  game = {
    mode,
    level: LEVELS[prefs.level - 1],
    index: 0,
    results: [],
    used: new Set(),
  };
  show('screen-game');
  nextQuestion();
}

function nextQuestion() {
  const { level } = game;
  const t = randomTime(level, game.used);
  const q = { ...t, mistakes: 0, wrongByGroup: {}, done: false, hinted: false };
  if (game.mode === 'words') q.stim = level.h24 ? 'digital' : pick(['analog', 'digital']);
  else if (game.mode === 'numbers') q.stim = 'analog';
  else q.stim = 'digital';
  game.q = q;
  renderQuestion();
}

function renderProgress() {
  const dots = [];
  for (let i = 0; i < ROUND; i++) {
    const r = game.results[i];
    let cls = 'pdot';
    if (r != null) cls += r === 0 ? ' perfect' : ' ok';
    else if (i === game.index) cls += ' current';
    dots.push(make('span', { class: cls }));
  }
  $('#progress').replaceChildren(...dots);
  $('#progress').setAttribute('aria-label', `Pergunta ${game.index + 1} de ${ROUND}`);
  $('#score').textContent = `⭐ ${game.results.filter((r) => r === 0).length}`;
}

function digitalDisplay(h, m, { slots = false } = {}) {
  if (slots) {
    return make('div', { class: 'digital digital-answer' },
      makeSlot('hour', pad(h), 'Lacuna das horas'),
      make('span', { class: 'colon' }, ':'),
      makeSlot('minute', pad(m), 'Lacuna dos minutos'));
  }
  return make('div', { class: 'digital', role: 'img', 'aria-label': `Relógio digital marcando ${pad(h)}:${pad(m)}` },
    make('span', { class: 'd-hour' }, pad(h)),
    make('span', { class: 'colon' }, ':'),
    make('span', { class: 'd-minute' }, pad(m)));
}

function makeSlot(group, answer, label) {
  const s = make('button', { type: 'button', class: `slot slot-${group}`, dataset: { group, answer }, 'aria-label': label }, '?');
  s.addEventListener('click', () => {
    // Toque na lacuna com uma ficha selecionada pelo teclado
    const sel = document.querySelector('.tile.selected');
    if (sel) { sel.classList.remove('selected'); dropTile(sel, s); }
  });
  return s;
}

function makeTile(group, value, num) {
  const t = make('button', {
    type: 'button',
    class: `tile tile-${group}`,
    dataset: { group, value, num: num ?? '' },
    'aria-label': `Ficha de ${GROUP_NAMES[group]}: ${value}`,
  }, value);
  setupTile(t, { onDrop: dropTile, onTap: tapTile, onPick: () => sfx.pick() });
  return t;
}

function bank(group, tiles) {
  return make('div', { class: `bank bank-${group}` },
    make('span', { class: 'bank-label' }, GROUP_NAMES[group]),
    make('div', { class: 'bank-tiles' }, shuffle(tiles)));
}

function renderQuestion() {
  const { mode, level, q } = game;
  renderProgress();
  const stim = $('#stimulus');
  const ans = $('#answer');
  const banks = $('#banks');
  stim.replaceChildren();
  ans.replaceChildren();
  banks.replaceChildren();
  $('#btn-next').hidden = true;
  $('#btn-check').hidden = mode !== 'hands';
  $('#btn-hint').hidden = false;
  $('#btn-listen').hidden = mode !== 'hands';
  setMood($('#game-mascot'), 'happy');
  game.clock = null;

  const displayH = level.h24 ? q.h : to12(q.h);

  if (mode === 'numbers') {
    $('#prompt').textContent = 'Que horas são? Arraste os números para o relógio digital.';
    const box = make('div', { class: 'clock-box' });
    stim.append(box);
    game.clock = new AnalogClock(box);
    game.clock.set(q.h, q.m);
    if (level.h24) {
      const p = periodOf(q.h);
      stim.append(make('div', { class: 'period-badge' }, `${PERIOD_ICONS[p]} ${p.replace('da ', '')}`));
    }
    ans.append(digitalDisplay(displayH, q.m, { slots: true }));

    // Fichas de horas
    const hourPool = level.h24 ? [...Array(24).keys()] : [...Array(12).keys()].map((i) => i + 1);
    const hPref = [displayH + 1, displayH - 1, q.m > 0 && q.m % 5 === 0 ? q.m / 5 : null];
    if (level.h24) hPref.push(q.h >= 12 ? q.h - 12 : q.h + 12);
    const hOpts = [displayH, ...distractors(displayH, hPref, hourPool, level.bank - 1)];
    // Fichas de minutos
    const mPool = minutePool(level);
    const mPref = [q.m > 0 && q.m % 5 === 0 ? q.m / 5 : null, (60 - q.m) % 60, q.m + level.step, q.m - level.step, 12];
    const mOpts = [q.m, ...distractors(q.m, mPref, mPool, level.bank - 1)];
    banks.append(
      bank('hour', hOpts.map((n) => makeTile('hour', pad(n), n))),
      bank('minute', mOpts.map((n) => makeTile('minute', pad(n), n))),
    );
  }

  if (mode === 'words') {
    $('#prompt').textContent = 'Que horas são? Arraste as palavras para completar a frase.';
    if (q.stim === 'analog') {
      const box = make('div', { class: 'clock-box' });
      stim.append(box);
      game.clock = new AnalogClock(box);
      game.clock.set(q.h, q.m);
    } else {
      stim.append(digitalDisplay(level.h24 ? q.h : to12(q.h), q.m));
    }
    const parts = phraseParts(q.h, q.m, { withPeriod: level.h24, useHalf: true });
    q.parts = parts;
    ans.append(make('p', { class: 'phrase' }, parts.map((p) => (p.slot
      ? makeSlot(p.slot, p.answer, `Lacuna de ${GROUP_NAMES[p.slot]}`)
      : make('span', { class: 'word' }, p.text)))));

    for (const p of parts.filter((x) => x.slot)) {
      let opts;
      if (p.slot === 'hour') {
        const pool = [...Array(12).keys()].map((i) => numberWord(i + 1, true));
        if (level.h24) pool.push('meio-dia', 'meia-noite');
        let pref;
        if (p.answer === 'meio-dia') pref = ['meia-noite', 'doze', 'uma'];
        else if (p.answer === 'meia-noite') pref = ['meio-dia', 'doze', 'onze'];
        else {
          pref = [p.num + 1, p.num - 1, q.m > 0 && q.m % 5 === 0 ? q.m / 5 : 0]
            .filter((n) => n >= 1 && n <= 12).map((n) => numberWord(n, true));
        }
        opts = [p.answer, ...distractors(p.answer, pref, pool, level.bank - 1)];
        banks.append(bank('hour', opts.map((w) => makeTile('hour', w, wordNum(w)))));
      } else if (p.slot === 'minute') {
        if (p.answer === 'meia') {
          opts = ['meia', ...distractors('meia', ['meio', 'quinze', 'quarenta e cinco'], ['meio', 'quinze', 'quarenta e cinco', 'quarenta'], level.bank - 1)];
        } else {
          const pool = minutePool(level).filter((n) => n > 0 && n !== 30).map((n) => numberWord(n));
          const pref = [q.m % 5 === 0 ? q.m / 5 : 0, 60 - q.m, q.m + level.step, q.m - level.step]
            .filter((n) => n > 0 && n < 60 && n !== 30).map((n) => numberWord(n));
          opts = [p.answer, ...distractors(p.answer, pref, pool, level.bank - 1)];
        }
        banks.append(bank('minute', opts.map((w) => makeTile('minute', w, wordNum(w)))));
      } else {
        banks.append(bank('period', PERIODS.map((w) => makeTile('period', w))));
      }
    }
  }

  if (mode === 'hands') {
    $('#prompt').textContent = 'Gire os ponteiros para o relógio mostrar esta hora:';
    stim.append(digitalDisplay(displayH, q.m));
    if (level.id <= 2) stim.append(make('p', { class: 'stim-phrase' }, phraseText(phraseParts(q.h, q.m))));
    const box = make('div', { class: 'clock-box clock-box-big' });
    ans.append(box, make('p', { class: 'legend' },
      make('span', { class: 'dot dot-hour' }), ' pequeno = horas   ',
      make('span', { class: 'dot dot-minute' }), ' grande = minutos'));
    game.clock = new AnalogClock(box, {
      interactive: true,
      minuteStep: level.step,
      lockMinute: level.step === 60,
      minuteLabels: level.id === 3,
      onChange: () => sfx.tick(),
    });
    // Posição inicial diferente da resposta
    let sh = to12(q.h);
    while (sh === to12(q.h)) sh = rand(1, 12);
    game.clock.set(sh, 0);
  }

  say(introMessage());
}

function minutePool(L) {
  if (L.step === 60) return [0, 12, 15, 30, 45];
  if (L.step === 15) return [0, 3, 6, 9, 15, 30, 45];
  if (L.step === 5) return [...Array(12).keys()].map((i) => i * 5);
  return [...Array(60).keys()];
}

function wordNum(w) {
  for (let n = 0; n < 60; n++) if (numberWord(n) === w || numberWord(n, true) === w) return n;
  return '';
}

function introMessage() {
  const { mode, q } = game;
  if (mode === 'hands') return 'Arraste os ponteiros. Depois toque em “Pronto!”.';
  if (q.stim === 'analog') return 'Comece pelo ponteiro pequeno: ele mostra as horas.';
  return 'Os números antes dos dois pontos (:) são as horas.';
}

function say(text) { $('#bubble').textContent = text; }

/* ---------- Encaixe das fichas ---------- */

function tapTile(tile) {
  if (game?.q.done) return;
  const slot = $(`#answer .slot[data-group="${tile.dataset.group}"]:not(.filled)`);
  if (slot) dropTile(tile, slot);
}

function dropTile(tile, slot) {
  const { q } = game;
  if (q.done || slot.classList.contains('filled')) return;
  const group = slot.dataset.group;
  if (tile.dataset.group !== group) {
    wrong(tile, `Essa ficha é de ${GROUP_NAMES[tile.dataset.group]}. Procure a lacuna da mesma cor!`, false);
    return;
  }
  if (tile.dataset.value !== slot.dataset.answer) {
    q.wrongByGroup[group] = (q.wrongByGroup[group] || 0) + 1;
    wrong(tile, errorHint(group, Number(tile.dataset.num), tile.dataset.value));
    return;
  }
  slot.textContent = tile.dataset.value;
  slot.classList.add('filled', 'pop');
  slot.setAttribute('aria-label', `${GROUP_NAMES[group]}: ${tile.dataset.value}`);
  tile.disabled = true;
  tile.classList.add('used');
  sfx.drop();
  if (!$('#answer .slot:not(.filled)')) questionDone();
  else say(pick(['Isso! Agora a próxima.', 'Boa! Falta pouco.', 'Certo! Continue.']));
}

function wrong(tile, msg, count = true) {
  if (count) game.q.mistakes++;
  sfx.wrong();
  tile.classList.remove('shake');
  void tile.offsetWidth;
  tile.classList.add('shake');
  setMood($('#game-mascot'), 'think');
  say(msg);
}

/** Dicas que respondem aos erros mais comuns de leitura de horas. */
function errorHint(group, num, value) {
  const { q, level } = game;
  const h12 = to12(q.h);
  const analog = q.stim === 'analog';
  if (group === 'hour') {
    if (game.mode === 'words' && q.h === 12 && level.h24) return 'Às 12 horas do dia, dizemos “meio-dia”!';
    if (game.mode === 'words' && q.h === 0 && level.h24) return 'Às 0 hora, no meio da noite, dizemos “meia-noite”!';
    if (analog) {
      if (q.m > 0 && q.m % 5 === 0 && num === q.m / 5 && num !== h12) {
        return 'Esse é o número que o ponteiro GRANDE 🔴 aponta. Quem mostra a hora é o ponteiro PEQUENO 🔵!';
      }
      if (q.m >= 30 && num === (h12 % 12) + 1) {
        return 'Quase! O ponteiro pequeno 🔵 ainda NÃO chegou nesse número. Escolha o número que ele já passou.';
      }
      if (level.h24 && game.mode === 'numbers' && num === h12 && q.h >= 12) {
        return 'Olhe o período do dia! Depois do meio-dia, somamos 12: 3 horas da tarde = 15h.';
      }
      if (level.h24 && game.mode === 'numbers' && q.h < 12 && num === q.h + 12) {
        return 'Olhe o período do dia! De manhã e de madrugada não somamos 12.';
      }
      return 'Olhe o ponteiro pequeno 🔵: ele mostra as horas.';
    }
    if (level.h24 && q.h > 12) return 'Depois do meio-dia, tiramos 12: 15h são 3 horas da tarde.';
    return 'As horas são os números ANTES dos dois pontos (:).';
  }
  if (group === 'minute') {
    if (analog && q.m % 5 === 0 && q.m > 0 && num === q.m / 5) {
      return `O ponteiro grande 🔴 aponta para o ${num}, mas cada número vale 5 minutos. Conte de 5 em 5!`;
    }
    if (value === 'meio') return 'Para as horas dizemos “e meia” (meia hora).';
    if (analog) return (q.wrongByGroup.minute || 0) >= 2
      ? 'Conte de 5 em 5 a partir do 12: 5, 10, 15, 20…'
      : 'Olhe o ponteiro grande 🔴: ele mostra os minutos.';
    return 'Os minutos são os números DEPOIS dos dois pontos (:).';
  }
  return 'Madrugada: 0h às 5h · Manhã: 6h às 11h · Tarde: 12h às 17h · Noite: 18h às 23h.';
}

/* ---------- Ponteiros ---------- */

$('#btn-check').addEventListener('click', () => {
  if (!game || game.mode !== 'hands' || game.q.done) return;
  const { q, clock } = game;
  const okH = to12(clock.h) === to12(q.h);
  const okM = clock.m === q.m;
  if (okH && okM) { questionDone(); return; }
  q.mistakes++;
  sfx.wrong();
  setMood($('#game-mascot'), 'think');
  const second = q.mistakes >= 2;
  if (!okM) {
    clock.highlight('minute');
    if (second && q.m > 0) say(`O ponteiro grande 🔴 deve apontar para o ${q.m % 5 === 0 ? q.m / 5 : 'tracinho dos ' + q.m + ' minutos'}.`);
    else if (q.m === 0) say('Hora certa: o ponteiro grande 🔴 fica no 12!');
    else say(`O ponteiro grande 🔴 precisa mostrar ${q.m} minutos.`);
  } else {
    clock.highlight('hour');
    if (second) say(`O ponteiro pequeno 🔵 deve ficar ${q.m > 0 ? 'entre o ' + to12(q.h) + ' e o ' + ((to12(q.h) % 12) + 1) : 'no ' + to12(q.h)}.`);
    else say('Os minutos estão certos! Agora ajuste o ponteiro pequeno 🔵 das horas.');
  }
});

/* ---------- Dica e ouvir ---------- */

$('#btn-hint').addEventListener('click', () => {
  if (!game || game.q.done) return;
  const { q, clock, mode } = game;
  q.hinted = true;
  if (mode === 'hands') {
    clock.highlight('both');
    clock.setOptions({ minuteLabels: true });
    say('Primeiro o ponteiro grande 🔴 (minutos), depois o pequeno 🔵 (horas). Os números vermelhos mostram os minutos.');
    return;
  }
  const slot = $('#answer .slot:not(.filled)');
  if (!slot) return;
  const g = slot.dataset.group;
  slot.classList.remove('glow');
  void slot.offsetWidth;
  slot.classList.add('glow');
  if (g === 'period') { say(errorHint('period')); return; }
  if (clock) {
    clock.highlight(g);
    if (g === 'minute') {
      clock.setOptions({ minuteLabels: true });
      say('O ponteiro grande 🔴 mostra os minutos. Veja os números vermelhinhos: cada número vale 5 minutos!');
    } else {
      say(q.m > 0
        ? 'O ponteiro pequeno 🔵 mostra a hora. Se ele estiver entre dois números, escolha o que ele já passou.'
        : 'O ponteiro pequeno 🔵 mostra a hora. Para qual número ele aponta?');
    }
  } else {
    $(`#stimulus .d-${g}`)?.classList.add('glow');
    say(g === 'hour' ? 'Veja os números antes dos dois pontos (:).' : 'Veja os números depois dos dois pontos (:).');
  }
});

function spokenPhrase() {
  const { q, level, mode } = game;
  if (mode === 'words') return phraseText(q.parts);
  if (level.h24) return `${phrase24(q.h, q.m)} Ou: ${phraseText(phraseParts(q.h, q.m, { withPeriod: true }))}`;
  return phraseText(phraseParts(q.h, q.m));
}

$('#btn-listen').addEventListener('click', () => game && speak(spokenPhrase()));

/* ---------- Fim da pergunta / rodada ---------- */

function questionDone() {
  const { q } = game;
  q.done = true;
  game.results[game.index] = q.mistakes;
  sfx.success();
  confetti(q.mistakes === 0 ? 40 : 18);
  setMood($('#game-mascot'), 'happy');
  const phrase = spokenPhrase();
  say(`${pick(PRAISE)} ${phrase}`);
  speak(`${pick(PRAISE)} ${phrase}`);
  if (game.clock && game.mode !== 'hands') game.clock.setOptions({ minuteLabels: false });
  $('#btn-check').hidden = true;
  $('#btn-hint').hidden = true;
  $('#btn-listen').hidden = false;
  $('#btn-next').hidden = false;
  $('#btn-next').focus({ preventScroll: true });
  renderProgress();
}

$('#btn-next').addEventListener('click', () => {
  sfx.pick();
  game.index++;
  if (game.index >= ROUND) finishRound();
  else nextQuestion();
});

function finishRound() {
  const total = game.results.reduce((a, b) => a + b, 0);
  const stars = total <= 1 ? 3 : total <= 5 ? 2 : 1;
  const key = `${game.mode}-${game.level.id}`;
  const best = prefs.stars[key] || 0;
  if (stars > best) { prefs.stars[key] = stars; save(); }
  show('screen-result');
  const titles = { 3: 'Você é craque das horas!', 2: 'Muito bom!', 1: 'Bom trabalho!' };
  $('#result-title').textContent = titles[stars];
  const st = $('#result-stars');
  st.replaceChildren(...[1, 2, 3].map((i) => make('span', { class: `rstar${i <= stars ? ' on' : ''}`, style: `animation-delay:${i * 0.25}s` }, '★')));
  st.setAttribute('aria-label', `${stars} de 3 estrelas`);
  const perfect = game.results.filter((r) => r === 0).length;
  $('#result-text').textContent = `Você acertou de primeira ${perfect} de ${ROUND} horários.${stars < 3 ? ' Jogue de novo para ganhar mais estrelas!' : ''}`;
  setMood($('#result-mascot'), 'happy');
  sfx.fanfare();
  confetti(80);
  speak(titles[stars]);
}

$('#btn-again').addEventListener('click', () => startGame(game.mode));
$('#btn-home').addEventListener('click', () => { renderHome(); show('screen-home'); });
$('#btn-back').addEventListener('click', () => { speechSynthesis?.cancel?.(); renderHome(); show('screen-home'); });

/* ------------------------------------------------------------------ */
/* Explorar                                                            */
/* ------------------------------------------------------------------ */

let exploreClock = null;

function updateExplore() {
  const { h, m } = exploreClock;
  $('#explore-digital').replaceChildren(digitalDisplay(h, m));
  $('#explore-phrase').textContent = phraseText(phraseParts(h, m, { withPeriod: true }));
  $('#explore-phrase24').textContent = `ou: ${phrase24(h, m)}`;
  const day = h >= 6 && h < 18;
  $('#btn-period').textContent = `${PERIOD_ICONS[periodOf(h)]} ${periodOf(h).replace('da ', '')} · trocar ${day ? '🌙' : '☀️'}`;
  document.body.classList.toggle('night', !day);
}

function openExplore() {
  show('screen-explore');
  if (!exploreClock) {
    exploreClock = new AnalogClock($('#explore-clock'), {
      interactive: true,
      minuteStep: 1,
      linkHands: true,
      minuteLabels: true,
      onGrab: stopLive,
      onChange: () => { sfx.tick(); updateExplore(); },
    });
    exploreClock.set(9, 0);
  }
  updateExplore();
}

function stopLive() {
  if (exploreTimer) {
    clearInterval(exploreTimer);
    exploreTimer = null;
    exploreClock?.setOptions({ showSeconds: false });
    $('#btn-now').classList.remove('active');
  }
  document.body.classList.remove('night');
}

$('#btn-now').addEventListener('click', () => {
  if (exploreTimer) { stopLive(); updateExplore(); return; }
  exploreClock.setOptions({ showSeconds: true });
  $('#btn-now').classList.add('active');
  const tick = () => {
    const d = new Date();
    exploreClock.set(d.getHours(), d.getMinutes(), d.getSeconds());
    updateExplore();
  };
  tick();
  exploreTimer = setInterval(tick, 1000);
  speak(`Agora: ${phraseText(phraseParts(exploreClock.h, exploreClock.m, { withPeriod: true }))}`);
});

$('#btn-period').addEventListener('click', () => {
  stopLive();
  exploreClock.set((exploreClock.h + 12) % 24, exploreClock.m);
  sfx.pick();
  updateExplore();
});

$('#btn-explore-listen').addEventListener('click', () => speak(phraseText(phraseParts(exploreClock.h, exploreClock.m, { withPeriod: true }))));
$('#btn-explore-back').addEventListener('click', () => { renderHome(); show('screen-home'); });

/* ------------------------------------------------------------------ */
/* Confete                                                             */
/* ------------------------------------------------------------------ */

function confetti(n) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = $('#confetti');
  const colors = ['#ffb703', '#fb8500', '#e63946', '#1d6fd8', '#2a9d8f', '#8e44ad', '#ff8fab'];
  for (let i = 0; i < n; i++) {
    const c = make('i', {
      style: `left:${Math.random() * 100}vw;background:${pick(colors)};--dx:${rand(-80, 80)}px;--rot:${rand(180, 900)}deg;animation-delay:${Math.random() * 0.3}s;animation-duration:${1.2 + Math.random()}s`,
    });
    box.append(c);
    setTimeout(() => c.remove(), 2600);
  }
}

/* ------------------------------------------------------------------ */
/* Offline (service worker) e instalação                               */
/* ------------------------------------------------------------------ */

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready).then(() => {
      $('#offline-badge').hidden = false;
    }).catch((err) => console.warn('Service worker não registrado:', err));
  });
}

let installEvent = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installEvent = e;
  $('#btn-install').hidden = false;
});
$('#btn-install').addEventListener('click', async () => {
  if (!installEvent) return;
  installEvent.prompt();
  await installEvent.userChoice;
  installEvent = null;
  $('#btn-install').hidden = true;
});

renderHome();
