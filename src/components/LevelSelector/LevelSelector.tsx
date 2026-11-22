// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';

import type { LevelSelectorProps } from '@/contracts';
import { getLevel } from '@/domain/levels';
import { UiIcon } from '@/ui/icons/UiIcons';

import styles from './LevelSelector.module.css';

const supportsAnchoredPopover =
  globalThis.CSS?.supports('position-area', 'block-end') &&
  typeof HTMLElement !== 'undefined' &&
  typeof HTMLElement.prototype.showPopover === 'function';

export function LevelSelector({
  levels,
  current,
  onChange,
}: LevelSelectorProps): ReactElement {
  const baseId = useId();
  const popoverId = `${baseId}-lp`;
  const radioName = `${baseId}-lr`;

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const idx = Math.max(0, levels.findIndex((l) => l.id === current));
  const cur = levels[idx] ?? getLevel(1);
  const prev = levels[idx - 1];
  const next = levels[idx + 1];

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    try {
      popoverRef.current?.hidePopover?.();
    } catch { /* ignore */ }
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  useLayoutEffect(() => {
    const panel = popoverRef.current;
    if (!panel) return;
    if (supportsAnchoredPopover) {
      try {
        if (open) panel.showPopover();
        else panel.hidePopover();
      } catch { /* ignore */ }
    }
    if (open) panel.querySelector<HTMLInputElement>('input:checked')?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onOut = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (t && containerRef.current && !containerRef.current.contains(t)) close(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close(true);
      }
    };
    document.addEventListener('click', onOut);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onOut);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  return (
    <div
      ref={containerRef}
      className={styles.container}
      role="group"
      aria-label="Níveis"
      data-level-selector="true"
      data-open={String(open)}
      onBlur={(e) => {
        if (open && e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) close(false);
      }}
    >
      <div className={styles.row}>
        <button
          type="button"
          className={styles.stepBtn}
          aria-label="Nível anterior"
          disabled={!prev}
          onClick={() => prev && onChange(prev.id)}
        >
          <UiIcon name="ChevronLeft" size={24} />
        </button>

        <button
          ref={triggerRef}
          type="button"
          className={styles.currentBtn}
          aria-expanded={open}
          aria-controls={popoverId}
          onClick={() => setOpen((p) => !p)}
          data-level-current={cur.id}
        >
          <span className={styles.levelNum}>{cur.id}</span>
          <span className={styles.levelText}>
            <span className={styles.levelName}>{cur.name}</span>
            <span className={styles.levelGrade}>{cur.grade}</span>
          </span>
          <span className={styles.caret} data-open={String(open)} aria-hidden="true">
            <UiIcon name="ChevronDown" size={22} />
          </span>
        </button>

        <button
          type="button"
          className={styles.stepBtn}
          aria-label="Próximo nível"
          disabled={!next}
          onClick={() => next && onChange(next.id)}
        >
          <UiIcon name="ChevronRight" size={24} />
        </button>
      </div>

      <div
        ref={popoverRef}
        id={popoverId}
        className={styles.popover}
        hidden={!open}
        data-open={String(open)}
        popover={supportsAnchoredPopover ? 'auto' : undefined}
        onToggle={(e) => {
          if (e.newState === 'closed') setOpen(false);
        }}
      >
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Escolha o nível</legend>
          {levels.map((level) => {
            const active = level.id === cur.id;
            return (
              <label
                key={level.id}
                className={styles.optionLabel}
                data-active={String(active)}
                data-level-option={level.id}
              >
                <input
                  type="radio"
                  className={styles.radioInput}
                  name={radioName}
                  value={level.id}
                  checked={active}
                  onChange={() => onChange(level.id)}
                />
                <span className={styles.levelNum}>{level.id}</span>
                <span className={styles.levelText}>
                  <span className={styles.levelName}>{level.name}</span>
                  <span className={styles.levelGrade}>{level.grade}</span>
                </span>
                {active && (
                  <span className={styles.activeBadge} aria-hidden="true">
                    <UiIcon name="CheckBadge" size={20} />
                  </span>
                )}
              </label>
            );
          })}
        </fieldset>
      </div>
    </div>
  );
}

export default LevelSelector;
