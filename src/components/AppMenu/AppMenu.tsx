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

import { APP_COPY } from '@/content/copy';
import type { AppMenuProps } from '@/contracts';
import { UiIcon, type UiIconName } from '@/ui/icons/UiIcons';

import styles from './AppMenu.module.css';

const supportsPopover =
  typeof HTMLElement !== 'undefined' && typeof HTMLElement.prototype.showPopover === 'function';

export function AppMenu({
  sound,
  voice,
  onToggleSound,
  onToggleVoice,
  onOpenTeachers,
  sourceUrl,
  pwa,
}: AppMenuProps): ReactElement {
  const panelId = `${useId()}-menu-panel`;
  const containerRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);

  const offlineReady =
    'offlineReady' in pwa &&
    Boolean((pwa as { readonly offlineReady?: boolean }).offlineReady);

  const computeFallbackPosition = useCallback(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;
    if (
      globalThis.CSS?.supports('position-area', 'block-end') &&
      panel.matches(':popover-open')
    ) return;

    const triggerRect = trigger.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const margin = 8;
    const left = Math.max(
      margin,
      Math.min(triggerRect.right - panelRect.width, window.innerWidth - panelRect.width - margin),
    );
    const belowTop = triggerRect.bottom + margin;
    const aboveTop = triggerRect.top - panelRect.height - margin;
    const maxTop = window.innerHeight - panelRect.height - margin;
    const top = belowTop > maxTop && aboveTop >= margin ? aboveTop : Math.min(belowTop, maxTop);

    panel.style.setProperty('--menu-top', `${Math.max(margin, top)}px`);
    panel.style.setProperty('--menu-left', `${left}px`);
  }, []);

  const closeMenu = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    try {
      panelRef.current?.hidePopover?.();
    } catch {
      // Ignora
    }
    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  }, []);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    try {
      if (open) panel.showPopover?.();
      else panel.hidePopover?.();
    } catch {
      // O painel também pode ser posicionado fora da camada nativa.
    }
    if (open) computeFallbackPosition();
  }, [open, computeFallbackPosition]);

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && containerRef.current && !containerRef.current.contains(target)) {
        closeMenu(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        closeMenu(true);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', computeFallbackPosition);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', computeFallbackPosition);
    };
  }, [open, closeMenu, computeFallbackPosition]);

  const switches: readonly {
    readonly key: 'sound' | 'voice';
    readonly checked: boolean;
    readonly icon: UiIconName;
    readonly label: string;
    readonly onToggle: () => void;
  }[] = [
    {
      key: 'sound',
      checked: sound,
      icon: sound ? 'BellOn' : 'BellOff',
      label: sound ? APP_COPY.menu.soundOn : APP_COPY.menu.soundOff,
      onToggle: onToggleSound,
    },
    {
      key: 'voice',
      checked: voice,
      icon: voice ? 'VoiceOn' : 'VoiceOff',
      label: voice ? APP_COPY.menu.voiceOn : APP_COPY.menu.voiceOff,
      onToggle: onToggleVoice,
    },
  ];

  return (
    <nav ref={containerRef} className={styles.menu} aria-label="Menu principal" data-app-menu="true">
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-label={open ? 'Fechar menu' : 'Menu'}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((prev) => !prev)}
        data-menu-trigger="true"
      >
        <span className={styles.burger} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </button>

      <div
        ref={panelRef}
        id={panelId}
        className={styles.panel}
        hidden={!open}
        data-open={String(open)}
        popover={supportsPopover ? 'auto' : undefined}
        onToggle={(event) => {
          if (event.newState === 'closed') setOpen(false);
        }}
      >
        {switches.map((sw) => (
          <button
            key={sw.key}
            type="button"
            role="switch"
            aria-checked={sw.checked}
            className={styles.menuItem}
            onClick={sw.onToggle}
            data-menu-item={sw.key}
          >
            <span className={styles.itemIcon} aria-hidden="true">
              <UiIcon name={sw.icon} size={22} />
            </span>
            <span className={styles.itemLabel}>{sw.label}</span>
            <span
              className={styles.switchTrack}
              data-checked={String(sw.checked)}
              aria-hidden="true"
            >
              <span className={styles.switchThumb} />
            </span>
          </button>
        ))}

        <hr className={styles.divider} />

        <button
          type="button"
          className={styles.menuItem}
          onClick={() => {
            closeMenu(true);
            onOpenTeachers();
          }}
          data-menu-item="teachers"
        >
          <span className={styles.itemIcon} aria-hidden="true">
            <UiIcon name="TeacherBook" size={22} />
          </span>
          <span className={styles.itemLabel}>{APP_COPY.menu.teachers}</span>
        </button>

        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.menuItem}
          onClick={() => closeMenu(false)}
          data-menu-item="source"
        >
          <span className={styles.itemIcon} aria-hidden="true">
            <UiIcon name="CompassExplore" size={22} />
          </span>
          <span className={styles.itemLabel}>{APP_COPY.menu.source}</span>
        </a>

        {pwa.canInstall && !pwa.isStandalone ? (
          <button
            type="button"
            className={[styles.menuItem, styles.installItem].filter(Boolean).join(' ')}
            onClick={() => {
              closeMenu(false);
              void pwa.install();
            }}
            data-menu-item="install"
          >
            <span className={styles.itemIcon} aria-hidden="true">
              <UiIcon name="InstallApp" size={22} />
            </span>
            <span className={styles.itemLabel}>{APP_COPY.menu.install}</span>
          </button>
        ) : null}

        {pwa.showIosInstallTip && !pwa.isStandalone && !pwa.canInstall ? (
          <div
            className={[styles.menuItem, styles.iosTipItem].filter(Boolean).join(' ')}
            role="note"
            data-menu-item="ios-install-tip"
          >
            <span className={styles.itemIcon} aria-hidden="true">
              <UiIcon name="InstallApp" size={20} />
            </span>
            <span className={styles.itemLabel}>{APP_COPY.menu.iosInstallTip}</span>
          </div>
        ) : null}

        {offlineReady ? (
          <div
            className={[styles.menuItem, styles.offlineBadge].filter(Boolean).join(' ')}
            role="status"
            data-menu-item="offline-ready"
          >
            <span className={styles.itemIcon} aria-hidden="true">
              <UiIcon name="OfflineCheck" size={20} />
            </span>
            <span className={styles.itemLabel}>{APP_COPY.menu.offlineReady}</span>
          </div>
        ) : null}
      </div>
    </nav>
  );
}

export default AppMenu;
