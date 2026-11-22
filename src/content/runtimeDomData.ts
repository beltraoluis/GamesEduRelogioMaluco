// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { staticContent } from './staticContent';

// Module evaluation precedes createRoot. A missing or damaged payload leaves
// the initial HTML loading/recovery message visible.
export const content: typeof staticContent = import.meta.env?.PROD
  ? JSON.parse(document.getElementById('rm-data')!.textContent!)
  : staticContent;

export const UI_COPY = content.copy;

export function readDomTemplate(id: string): string | null {
  if (typeof document === 'undefined') return null;
  const el = document.getElementById(id) as HTMLTemplateElement | null;
  if (!el) return null;
  return el.innerHTML;
}
