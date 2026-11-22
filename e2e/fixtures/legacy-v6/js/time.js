// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

// Utilidades de tempo e escrita por extenso (português do Brasil).

const UNITS = [
  'zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
  'dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove',
];
const TENS = { 20: 'vinte', 30: 'trinta', 40: 'quarenta', 50: 'cinquenta' };

export const PERIODS = ['da madrugada', 'da manhã', 'da tarde', 'da noite'];

/** Número por extenso (0–59). `feminine` para horas: "uma", "duas". */
export function numberWord(n, feminine = false) {
  if (n < 20) {
    if (feminine && n === 1) return 'uma';
    if (feminine && n === 2) return 'duas';
    return UNITS[n];
  }
  const t = Math.floor(n / 10) * 10;
  const u = n % 10;
  return u === 0 ? TENS[t] : `${TENS[t]} e ${numberWord(u, feminine)}`;
}

export const pad = (n) => String(n).padStart(2, '0');

/** 0–23 → 1–12 */
export const to12 = (h) => (h % 12 === 0 ? 12 : h % 12);

export function periodOf(h) {
  if (h < 6) return PERIODS[0];
  if (h < 12) return PERIODS[1];
  if (h < 18) return PERIODS[2];
  return PERIODS[3];
}

/**
 * Frase da hora dividida em partes: texto fixo ({text}) e lacunas ({slot, answer}).
 * `withPeriod`: h é 0–23 e a frase usa 12 h + período ("da tarde"), meio-dia e meia-noite.
 */
export function phraseParts(h, m, { withPeriod = false, useHalf = true } = {}) {
  const parts = [];
  let special = null;
  if (withPeriod && h === 12) special = 'meio-dia';
  if (withPeriod && h === 0) special = 'meia-noite';

  if (special) {
    parts.push({ text: 'É' }, { slot: 'hour', answer: special, num: 12 });
  } else {
    const h12 = to12(h);
    const one = h12 === 1;
    parts.push(
      { text: one ? 'É' : 'São' },
      { slot: 'hour', answer: numberWord(h12, true), num: h12 },
      { text: one ? 'hora' : 'horas' },
    );
  }

  if (m > 0) {
    parts.push({ text: 'e' });
    if (m === 30 && useHalf) {
      parts.push({ slot: 'minute', answer: 'meia', num: 30 });
    } else {
      parts.push({ slot: 'minute', answer: numberWord(m), num: m }, { text: m === 1 ? 'minuto' : 'minutos' });
    }
  }

  if (withPeriod && !special) parts.push({ slot: 'period', answer: periodOf(h) });
  return parts;
}

export const phraseText = (parts) => parts.map((p) => p.text ?? p.answer).join(' ') + '.';

/** Frase no formato 24 h: "São quinze horas e dez minutos." */
export function phrase24(h, m) {
  const sing = h <= 1;
  let s = `${sing ? 'É' : 'São'} ${numberWord(h, true)} ${sing ? 'hora' : 'horas'}`;
  if (m > 0) s += ` e ${numberWord(m)} ${m === 1 ? 'minuto' : 'minutos'}`;
  return s + '.';
}
