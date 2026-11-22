// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

/**
 * Leitura declarativa (somente dados JSON e templates HTML inertes, sem eval)
 * pré-cacheados no `index.html` de produção.
 */

let cachedJson: Record<string, unknown> | null = null;
const cachedTemplates = new Map<string, string>();

export function readDomJson<T>(key: string, fallback: () => T): T {
  if (typeof document !== 'undefined') {
    if (cachedJson === null) {
      const el = document.getElementById('rm-data');
      if (el?.textContent) {
        try {
          cachedJson = JSON.parse(el.textContent) as Record<string, unknown>;
        } catch {
          cachedJson = {};
        }
      }
    }
    if (cachedJson && key in cachedJson) {
      return cachedJson[key] as T;
    }
  }
  return fallback();
}

export function readDomTemplate(id: string): string | null {
  if (typeof document === 'undefined') return null;
  const hit = cachedTemplates.get(id);
  if (hit !== undefined) return hit;
  const el = document.getElementById(id) as HTMLTemplateElement | null;
  if (!el) return null;
  const html = el.innerHTML;
  cachedTemplates.set(id, html);
  return html;
}
