// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { describe, expect, it } from 'vitest';

import {
  APP_COPY,
  SOURCE_REPO_URL,
  buildSourceUrl,
} from '../copy';
import {
  BNCC_SKILL_CODES,
  BNCC_SKILLS,
  EDUCATORS_CONTENT,
  buildAgplNotice,
} from '../educators';

/**
 * Glifos e emojis proibidos em `src/content/**` (alinhado ao gate F1c).
 * Lista F1d e blocos de setas/dingbats via escapes Unicode (sem glifos crus
 * no fonte do teste, para o `check-no-emoji` passar na arvore combinada).
 */
const FORBIDDEN_GLYPHS =
  /[\u{2605}\u{2606}\u{2714}\u{2715}\u{279C}\u{2039}\u{203A}\u{25BE}\u{2190}]|[\p{Extended_Pictographic}\u{FE0E}\u{FE0F}\u{200D}\u{20E3}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{2460}-\u{24FF}\u{2500}-\u{27BF}\u{2B00}-\u{2BFF}]/gu;

/** Fontes de `src/content/**` (exclui `__tests__`) como texto bruto. */
const CONTENT_SOURCES = import.meta.glob('../*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const REQUIRED_BNCC = [
  'EF01MA16',
  'EF01MA17',
  'EF02MA19',
  'EF03MA22',
  'EF03MA23',
  'EF04MA22',
] as const;

function collectStrings(value: unknown, path = '$'): string[] {
  if (typeof value === 'string') {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectStrings(item, `${path}[${index}]`),
    );
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(
      ([key, child]) => collectStrings(child, `${path}.${key}`),
    );
  }
  return [];
}

describe('BNCC coverage', () => {
  it('expõe exatamente as 6 habilidades BNCC', () => {
    expect(BNCC_SKILL_CODES).toEqual([...REQUIRED_BNCC]);
    expect(BNCC_SKILLS.map((s) => s.code)).toEqual([...REQUIRED_BNCC]);
    expect(EDUCATORS_CONTENT.bnccSkills.map((s) => s.code)).toEqual([
      ...REQUIRED_BNCC,
    ]);
  });

  it('mantém resumo e local de aparição para cada habilidade', () => {
    for (const skill of BNCC_SKILLS) {
      expect(skill.summary.trim().length).toBeGreaterThan(20);
      expect(skill.where.trim().length).toBeGreaterThan(5);
    }
  });
});

describe('buildSourceUrl', () => {
  it('monta tree/{commit} com commit válido', () => {
    expect(buildSourceUrl('abc1234')).toBe(`${SOURCE_REPO_URL}/tree/abc1234`);
    expect(buildSourceUrl('  deadbeef  ')).toBe(
      `${SOURCE_REPO_URL}/tree/deadbeef`,
    );
  });

  it('recusa commit vazio ou unknown (ADR-004: sem link para a branch padrao)', () => {
    expect(() => buildSourceUrl('')).toThrow(/commit exato|ADR-004/i);
    expect(() => buildSourceUrl('   ')).toThrow(/commit exato|ADR-004/i);
    expect(() => buildSourceUrl('unknown')).toThrow(/commit exato|ADR-004/i);
  });
});

describe('AGPL §13 notice', () => {
  it('inclui os elementos obrigatórios do aviso pós-build', () => {
    const notice = buildAgplNotice({ version: '0.1.0', commit: 'abc1234' });
    expect(notice).toContain('AGPL-3.0-or-later');
    expect(notice).toContain('npm ci');
    expect(notice).toContain('npm run build');
    expect(notice).toContain('LICENSE.txt');
    expect(notice).toContain('THIRD_PARTY_LICENSES.txt');
    expect(notice.toLowerCase()).toContain('sem qualquer garantia');
    expect(notice).toContain(`${SOURCE_REPO_URL}/tree/abc1234`);
    expect(notice).toContain('compilados e minificados');
    expect(notice).toContain('TypeScript/React');
    expect(notice).toContain('dist/');
  });

  it('propaga a exigencia de commit exato no aviso AGPL', () => {
    expect(() =>
      buildAgplNotice({ version: '0.1.0', commit: 'unknown' }),
    ).toThrow(/commit exato|ADR-004/i);
  });
});

describe('zero emojis e glifos proibidos', () => {
  it('não usa glifos proibidos nas estruturas exportadas', () => {
    const samples = [
      ...collectStrings(APP_COPY),
      ...collectStrings(EDUCATORS_CONTENT),
      SOURCE_REPO_URL,
      buildSourceUrl('abc'),
      buildAgplNotice({ version: '0.1.0', commit: 'abc' }),
    ];
    for (const text of samples) {
      FORBIDDEN_GLYPHS.lastIndex = 0;
      expect(text, `glifo proibido em: ${text}`).not.toMatch(FORBIDDEN_GLYPHS);
    }
  });

  it('varre todos os arquivos-fonte de src/content/**', () => {
    const entries = Object.entries(CONTENT_SOURCES);
    expect(entries.length).toBeGreaterThan(0);
    for (const [path, raw] of entries) {
      expect(typeof raw).toBe('string');
      FORBIDDEN_GLYPHS.lastIndex = 0;
      expect(raw, `glifo proibido em ${path}`).not.toMatch(FORBIDDEN_GLYPHS);
    }
  });
});

describe('copy estrutural mínima', () => {
  it('identifica modos pelo id mesmo com a montagem no primeiro cartão', () => {
    for (const id of ['assemble', 'numbers', 'words', 'hands', 'explore'] as const) {
      expect(APP_COPY.modes[id].id).toBe(id);
    }
  });
  it('mantém prompts, ações de jogo e confirmação em 2 etapas', () => {
    expect(APP_COPY.home.title).toBe('Relógio Maluco');
    expect(APP_COPY.home.subtitle).toBe('Vamos aprender a ler as horas!');
    expect(APP_COPY.game.prompts.numbers.length).toBeGreaterThan(10);
    expect(APP_COPY.game.prompts.words.length).toBeGreaterThan(10);
    expect(APP_COPY.game.prompts.hands.length).toBeGreaterThan(10);
    expect(APP_COPY.game.tileFirstHint).toContain('Enter ou Espaço');
    expect(APP_COPY.game.hint).toBe('Dica');
    expect(APP_COPY.game.listen).toBe('Ouvir');
    expect(APP_COPY.game.ready).toBe('Pronto!');
    expect(APP_COPY.game.next).toBe('Próxima');
    expect(APP_COPY.updateToast.title).toBe('Nova versão pronta');
    expect(APP_COPY.updateToast.apply).toBe('Atualizar agora');
    expect(APP_COPY.updateToast.dismiss).toBe('Agora não');
    expect(APP_COPY.resetProgress.title).toBe(
      'Apagar progresso deste aparelho',
    );
    expect(APP_COPY.resetProgress.confirmButton).toBe('Sim, apagar');
    expect(APP_COPY.resetProgress.cancelButton).toBe('Cancelar');
    expect(APP_COPY.resetProgress.liveMessage).toBe('Progresso apagado.');
    expect(APP_COPY.persistence.unavailable.length).toBeGreaterThan(20);
    expect(APP_COPY.menu.iosInstallTip).toBe(
      'No iPhone/iPad: Compartilhar > Adicionar à Tela de Início',
    );
  });

  it('mantém 4 níveis, 5 modos e competências com redundância de cor', () => {
    expect(EDUCATORS_CONTENT.levels).toHaveLength(4);
    expect(EDUCATORS_CONTENT.modes).toHaveLength(5);
    expect(EDUCATORS_CONTENT.competencies).toMatch(/azul = horas/i);
    expect(EDUCATORS_CONTENT.competencies).toMatch(/vermelho = minutos/i);
    expect(EDUCATORS_CONTENT.competencies).toMatch(/roxo = período/i);
    expect(EDUCATORS_CONTENT.competencies).toMatch(/filete sólido|retangular/i);
    expect(EDUCATORS_CONTENT.competencies).toMatch(/tracejada|entalhe/i);
    expect(EDUCATORS_CONTENT.competencies).toMatch(/pílula/i);
  });
});
