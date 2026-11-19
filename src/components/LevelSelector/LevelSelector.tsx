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

import type { Level, LevelId, LevelSelectorProps } from '@/contracts';
import { UiIcon } from '@/ui/icons/UiIcons';

import styles from './LevelSelector.module.css';

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
  const currentLevel: Level =
    levels[safeIndex] ??
    levels[0] ?? {
      id: 1,
      name: 'Horas certas',
      grade: '1º ano',
      step: 60,
      h24: false,
      bankSize: 3,
      bncc: ['EF01MA16'],
    };

  const prevLevel = safeIndex > 0 ? levels[safeIndex - 1] : undefined;
  const nextLevel = safeIndex < levels.length - 1 ? levels[safeIndex + 1] : undefined;

  const closePopover = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    const panel = popoverRef.current;
    if (panel && typeof panel.hidePopover === 'function') {
      try {
        panel.hidePopover();
      } catch {
        // Ignora caso não esteja aberto na top-layer nativa
      }
    }
    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  }, []);

  useLayoutEffect(() => {
    const panel = popoverRef.current;
    if (!panel) return;
    if (open) {
      if (typeof panel.showPopover === 'function') {
        try {
          panel.showPopover();
        } catch {
          // Fallback em ambientes sem Popover API completa (JSDOM)
        }
      }
    } else if (typeof panel.hidePopover === 'function') {
      try {
        panel.hidePopover();
      } catch {
        // Ignora
      }
    }
  }, [open]);

  useEffect(() => {
    const panel = popoverRef.current;
    if (!panel) return;
    const handleToggle = (event: Event) => {
      const toggleEvent = event as Event & { readonly newState?: string };
      if (toggleEvent.newState === 'closed') {
        setOpen(false);
      } else if (toggleEvent.newState === 'open') {
        setOpen(true);
      }
    };
    panel.addEventListener('toggle', handleToggle);
    return () => panel.removeEventListener('toggle', handleToggle);
  }, []);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
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

    document.addEventListener('click', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, closePopover]);

  const handleSelect = (id: LevelId) => {
    onChange(id);
    closePopover(true);
  };

  return (
    <div
      ref={containerRef}
      className={styles.container}
      role="group"
      aria-label="Níveis"
      data-level-selector="true"
      data-open={String(open)}
    >
      <div className={styles.row}>
        <button
          type="button"
          className={styles.stepBtn}
          aria-label="Nível anterior"
          disabled={prevLevel === undefined}
          onClick={() => {
            if (prevLevel !== undefined) {
              onChange(prevLevel.id);
            }
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
            if (nextLevel !== undefined) {
              onChange(nextLevel.id);
            }
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
        style={{ display: open ? 'block' : 'none' }}
        data-open={String(open)}
        {...({ popover: 'auto' } as Record<string, unknown>)}
      >
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Escolha o nível</legend>
          {levels.map((level) => {
            const isSelected = level.id === current;
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
                  onChange={() => handleSelect(level.id)}
                  onClick={() => {
                    if (isSelected) {
                      closePopover(true);
                    }
                  }}
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
