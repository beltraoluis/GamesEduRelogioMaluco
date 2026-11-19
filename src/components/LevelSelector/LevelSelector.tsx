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
  const popoverId = `${baseId}-level-popover`;
  const radioGroupName = `${baseId}-level-radio`;

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);

  const currentIndex = levels.findIndex((l) => l.id === current);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  const currentLevel = levels[safeIndex] ?? getLevel(1);

  const prevLevel = safeIndex > 0 ? levels[safeIndex - 1] : undefined;
  const nextLevel = safeIndex < levels.length - 1 ? levels[safeIndex + 1] : undefined;

  const closePopover = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    try {
      popoverRef.current?.hidePopover?.();
    } catch {
      // Ignora caso não esteja aberto na top-layer nativa
    }
    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  }, []);

  useLayoutEffect(() => {
    const panel = popoverRef.current;
    if (!panel) return;
    if (supportsAnchoredPopover) {
      try {
        if (open) panel.showPopover();
        else panel.hidePopover();
      } catch {
        // O painel posicionado por CSS também funciona fora da camada nativa.
      }
    }
    if (open) panel.querySelector<HTMLInputElement>('input:checked')?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && containerRef.current && !containerRef.current.contains(target)) {
        closePopover(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        closePopover(true);
      }
    };
    document.addEventListener('click', handleOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, closePopover]);

  return (
    <div
      ref={containerRef}
      className={styles.container}
      role="group"
      aria-label="Níveis"
      data-level-selector="true"
      data-open={String(open)}
      onBlur={(event) => {
        const nextFocus = event.relatedTarget;
        if (open && nextFocus && !event.currentTarget.contains(nextFocus)) {
          closePopover(false);
        }
      }}
    >
      <div className={styles.row}>
        <button
          type="button"
          className={styles.stepBtn}
          aria-label="Nível anterior"
          disabled={prevLevel === undefined}
          onClick={() => {
            if (prevLevel !== undefined) onChange(prevLevel.id);
          }}
        >
          <UiIcon name="ChevronLeft" size={24} />
        </button>

        <button
          ref={triggerRef}
          type="button"
          className={styles.currentBtn}
          aria-expanded={open}
          aria-controls={popoverId}
          aria-label={`Nível ${currentLevel.id}: ${currentLevel.name}, ${currentLevel.grade}. Toque para trocar.`}
          onClick={() => setOpen((prev) => !prev)}
          data-level-current={currentLevel.id}
        >
          <span className={styles.levelNum}>{currentLevel.id}</span>
          <span className={styles.levelText}>
            <span className={styles.levelName}>{currentLevel.name}</span>
            <span className={styles.levelGrade}>{currentLevel.grade}</span>
          </span>
          <span className={styles.caret} data-open={String(open)} aria-hidden="true">
            <UiIcon name="ChevronDown" size={22} />
          </span>
        </button>

        <button
          type="button"
          className={styles.stepBtn}
          aria-label="Próximo nível"
          disabled={nextLevel === undefined}
          onClick={() => {
            if (nextLevel !== undefined) onChange(nextLevel.id);
          }}
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
        onToggle={(event) => {
          if (event.newState === 'closed') setOpen(false);
        }}
      >
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Escolha o nível</legend>
          {levels.map((level) => {
            const isSelected = level.id === currentLevel.id;
            return (
              <label
                key={level.id}
                className={styles.optionLabel}
                data-active={String(isSelected)}
                data-level-option={level.id}
              >
                <input
                  type="radio"
                  className={styles.radioInput}
                  name={radioGroupName}
                  value={level.id}
                  checked={isSelected}
                  onChange={() => onChange(level.id)}
                />
                <span className={styles.levelNum}>{level.id}</span>
                <span className={styles.levelText}>
                  <span className={styles.levelName}>{level.name}</span>
                  <span className={styles.levelGrade}>{level.grade}</span>
                </span>
                {isSelected ? (
                  <span className={styles.activeBadge} aria-hidden="true">
                    <UiIcon name="CheckBadge" size={20} />
                  </span>
                ) : null}
              </label>
            );
          })}
        </fieldset>
      </div>
    </div>
  );
}

export default LevelSelector;
