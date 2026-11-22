// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

// Relógio analógico em SVG, com ponteiros arrastáveis (mouse, toque e teclado).
import { pad } from './time.js';

const NS = 'http://www.w3.org/2000/svg';
const C = 110; // centro do viewBox 220x220

function el(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

const angDist = (a, b) => {
  const d = Math.abs(((a - b) % 360 + 360) % 360);
  return d > 180 ? 360 - d : d;
};

export class AnalogClock {
  constructor(container, opts = {}) {
    this.opts = {
      interactive: false,
      minuteStep: 1,
      lockMinute: false,
      linkHands: false,
      showSeconds: false,
      minuteLabels: false,
      onChange: null,
      onGrab: null,
      ...opts,
    };
    this.h = 12;
    this.m = 0;
    this.s = 0;
    this.svg = el('svg', { viewBox: '0 0 220 220', class: 'clock', role: 'img', 'aria-label': 'Relógio analógico' });
    container.replaceChildren(this.svg);
    this._build();
    this._bind();
    this.setOptions({});
  }

  _build() {
    const s = this.svg;
    el('circle', { cx: C, cy: C, r: 108, class: 'clock-rim' }, s);
    el('circle', { cx: C, cy: C, r: 100, class: 'clock-face' }, s);

    const ticks = el('g', { class: 'clock-ticks' }, s);
    for (let i = 0; i < 60; i++) {
      const major = i % 5 === 0;
      const a = (i * 6 * Math.PI) / 180;
      const r1 = major ? 90 : 95;
      el('line', {
        x1: C + r1 * Math.sin(a), y1: C - r1 * Math.cos(a),
        x2: C + 99 * Math.sin(a), y2: C - 99 * Math.cos(a),
        class: major ? 'tick major' : 'tick',
      }, ticks);
    }

    this.minuteLabelsG = el('g', { class: 'minute-labels' }, s);
    for (let i = 0; i < 12; i++) {
      const a = (i * 30 * Math.PI) / 180;
      const t = el('text', { x: C + 82 * Math.sin(a), y: C - 82 * Math.cos(a), class: 'minute-label' }, this.minuteLabelsG);
      t.textContent = pad(i * 5);
    }

    const nums = el('g', { class: 'clock-numbers' }, s);
    for (let i = 1; i <= 12; i++) {
      const a = (i * 30 * Math.PI) / 180;
      const t = el('text', { x: C + 66 * Math.sin(a), y: C - 66 * Math.cos(a), class: 'clock-number' }, nums);
      t.textContent = i;
    }

    this.hourHand = this._hand('hour', 46, 9);
    this.minuteHand = this._hand('minute', 80, 6);
    this.secondHand = this._hand('second', 88, 2);
    el('circle', { cx: C, cy: C, r: 8, class: 'clock-pin' }, s);
    el('circle', { cx: C, cy: C, r: 3, class: 'clock-pin-dot' }, s);
  }

  _hand(name, len, w) {
    const g = el('g', { class: `hand hand-${name}`, 'data-hand': name }, this.svg);
    el('line', { x1: C, y1: C + 12, x2: C, y2: C - len, class: 'hand-hit' }, g);
    el('line', { x1: C, y1: C + 12, x2: C, y2: C - len, 'stroke-width': w, class: 'hand-line' }, g);
    return g;
  }

  _angle(e) {
    const pt = this.svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(this.svg.getScreenCTM().inverse());
    const dx = p.x - C;
    const dy = p.y - C;
    let a = (Math.atan2(dx, -dy) * 180) / Math.PI;
    if (a < 0) a += 360;
    return { a, r: Math.hypot(dx, dy) };
  }

  _bind() {
    this.svg.addEventListener('pointerdown', (e) => {
      if (!this.opts.interactive) return;
      e.preventDefault();
      const { a, r } = this._angle(e);
      let which = e.target.closest?.('[data-hand]')?.dataset.hand;
      if (which === 'second') which = null;
      if (!which) {
        const dm = angDist(a, this.m * 6);
        const dh = angDist(a, (this.h % 12) * 30 + this.m * 0.5);
        which = r < 58 && dh < 45 ? 'hour' : dm <= dh ? 'minute' : 'hour';
      }
      if (which === 'minute' && this.opts.lockMinute) which = 'hour';
      this.dragging = which;
      this.svg.classList.add('dragging');
      this.svg.setPointerCapture?.(e.pointerId);
      this.opts.onGrab?.(which);
      this._dragTo(a);
    });
    this.svg.addEventListener('pointermove', (e) => {
      if (this.dragging) this._dragTo(this._angle(e).a);
    });
    const end = () => {
      if (!this.dragging) return;
      this.dragging = null;
      this.svg.classList.remove('dragging');
    };
    this.svg.addEventListener('pointerup', end);
    this.svg.addEventListener('pointercancel', end);

    // Teclado: ↑/↓ minutos, ←/→ horas
    this.svg.addEventListener('keydown', (e) => {
      if (!this.opts.interactive) return;
      const st = this.opts.minuteStep;
      let used = true;
      if (e.key === 'ArrowUp' && !this.opts.lockMinute) this._setMinute((this.m + st) % 60);
      else if (e.key === 'ArrowDown' && !this.opts.lockMinute) this._setMinute((this.m - st + 60) % 60);
      else if (e.key === 'ArrowRight') this._setHour((this.h + 1) % 24);
      else if (e.key === 'ArrowLeft') this._setHour((this.h + 23) % 24);
      else used = false;
      if (used) e.preventDefault();
    });
  }

  _dragTo(a) {
    if (this.dragging === 'minute') {
      const st = this.opts.minuteStep;
      this._setMinute((Math.round(a / 6 / st) * st) % 60);
    } else {
      let hh = Math.round((a - this.m * 0.5) / 30);
      hh = ((hh % 12) + 12) % 12;
      this._setHour((this.h >= 12 ? 12 : 0) + hh);
    }
  }

  _setMinute(m) {
    if (m === this.m) return;
    if (this.opts.linkHands) {
      if (this.m >= 45 && m < 15) this.h = (this.h + 1) % 24;
      else if (this.m < 15 && m >= 45) this.h = (this.h + 23) % 24;
    }
    this.m = m;
    this._render();
    this.opts.onChange?.(this.h, this.m, 'minute');
  }

  _setHour(h) {
    if (h === this.h) return;
    this.h = h;
    this._render();
    this.opts.onChange?.(this.h, this.m, 'hour');
  }

  _rot(g, key, target) {
    const prev = this[key];
    const d = prev == null ? target : prev + ((((target - prev) % 360) + 540) % 360) - 180;
    this[key] = d;
    g.style.transform = `rotate(${d}deg)`;
  }

  _render() {
    const sec = this.opts.showSeconds ? this.s : 0;
    this._rot(this.minuteHand, '_mDeg', this.m * 6 + sec * 0.1);
    this._rot(this.hourHand, '_hDeg', (this.h % 12) * 30 + this.m * 0.5);
    this.secondHand.style.display = this.opts.showSeconds ? '' : 'none';
    if (this.opts.showSeconds) this._rot(this.secondHand, '_sDeg', this.s * 6);
  }

  set(h, m, s = 0) {
    this.h = h;
    this.m = m;
    this.s = s;
    this._render();
  }

  setOptions(o) {
    Object.assign(this.opts, o);
    this.svg.classList.toggle('interactive', this.opts.interactive);
    this.svg.classList.toggle('show-minutes', this.opts.minuteLabels);
    this.svg.classList.toggle('lock-minute', this.opts.lockMinute);
    if (this.opts.interactive) {
      this.svg.setAttribute('tabindex', '0');
      this.svg.setAttribute('aria-label', 'Relógio analógico. Arraste os ponteiros ou use as setas: para cima e para baixo mudam os minutos, para os lados mudam as horas.');
    } else {
      this.svg.removeAttribute('tabindex');
    }
    this._render();
  }

  highlight(which, ms = 2600) {
    const hands = which === 'both' ? [this.hourHand, this.minuteHand] : [which === 'hour' ? this.hourHand : this.minuteHand];
    hands.forEach((g) => {
      g.classList.remove('pulse');
      void g.getBoundingClientRect();
      g.classList.add('pulse');
      setTimeout(() => g.classList.remove('pulse'), ms);
    });
  }
}
