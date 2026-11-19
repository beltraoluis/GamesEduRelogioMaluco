// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
} from 'react';

import { APP_COPY } from '@/content/copy';
import type { AppMenuProps } from '@/contracts';
import { UiIcon } from '@/ui/icons/UiIcons';

import styles from './AppMenu.module.css';

interface FallbackCoords {
  readonly top: number;
  readonly left: number;
}

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
  const [coords, setCoords] = useState<FallbackCoords | null>(null);

  const offlineReady =
    'offlineReady' in pwa &&
    Boolean((pwa as { readonly offlineReady?: boolean }).offlineReady);

  const computeFallbackPosition = useCallback(() => {
    if (typeof window === 'undefined') return;
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger) return;

    const triggerRect = trigger.getBoundingClientRect();
    const panelRect = panel?.getBoundingClientRect();
    const panelWidth = panelRect && panelRect.width > 0 ? panelRect.width : 280;
    const panelHeight = panelRect && panelRect.height > 0 ? panelRect.height : 240;
    const margin = 8;
    const viewportW = window.innerWidth || 360;
    const viewportH = window.innerHeight || 640;

    let left = triggerRect.right - panelWidth;
    if (left + panelWidth > viewportW - margin) {
      left = viewportW - panelWidth - margin;
    }
    if (left < margin) {
      left = margin;
    }

    let top = triggerRect.bottom + margin;
    if (top + panelHeight > viewportH - margin && triggerRect.top - panelHeight - margin >= margin) {
      top = triggerRect.top - panelHeight - margin;
    }

    setCoords({ top: Math.round(top), left: Math.round(left) });
  }, []);

  const closeMenu = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    const panel = panelRef.current;
    if (panel && typeof panel.hidePopover === 'function') {
      try {
        panel.hidePopover();
      } catch {
        // Ignora
      }
    }
    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  }, []);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    if (open) {
      if (typeof panel.showPopover === 'function') {
        try {
          panel.showPopover();
        } catch {
          // Fallback JSDOM
        }
      }
      computeFallbackPosition();
    } else if (typeof panel.hidePopover === 'function') {
      try {
        panel.hidePopover();
      } catch {
        // Ignora
      }
    }
  }, [open, computeFallbackPosition]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const handleToggle = (event: Event) => {
      const toggleEvent = event as Event & { readonly newState?: string };
      if (toggleEvent.newState === 'closed') {
        setOpen(false);
      } else if (toggleEvent.newState === 'open') {
        setOpen(true);
        computeFallbackPosition();
      }
    };
    panel.addEventListener('toggle', handleToggle);
    return () => panel.removeEventListener('toggle', handleToggle);
  }, [computeFallbackPosition]);

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

    const handleResize = () => computeFallbackPosition();

    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [open, closeMenu, computeFallbackPosition]);

  const panelStyle: CSSProperties & Record<string, string> =
    coords === null
      ? {
          display: open ? 'flex' : 'none',
        }
      : {
          display: open ? 'flex' : 'none',
          '--menu-top': `${coords.top}px`,
          '--menu-left': `${coords.left}px`,
          '--menu-right': 'auto',
        };

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
        style={panelStyle}
        {...({ popover: 'auto' } as Record<string, unknown>)}
      >
        <button
          type="button"
          role="switch"
          aria-checked={sound}
          className={styles.menuItem}
          onClick={onToggleSound}
          data-menu-item="sound"
        >
          <span className={styles.itemIcon} aria-hidden="true">
            <UiIcon name={sound ? 'BellOn' : 'BellOff'} size={22} />
          </span>
          <span className={styles.itemLabel}>
            {sound ? APP_COPY.menu.soundOn : APP_COPY.menu.soundOff}
          </span>
          <span className={styles.switchTrack} data-checked={String(sound)} aria-hidden="true">
            <span className={styles.switchThumb} />
          </span>
        </button>

        <button
          type="button"
          role="switch"
          aria-checked={voice}
          className={styles.menuItem}
          onClick={onToggleVoice}
          data-menu-item="voice"
        >
          <span className={styles.itemIcon} aria-hidden="true">
            <UiIcon name={voice ? 'VoiceOn' : 'VoiceOff'} size={22} />
          </span>
          <span className={styles.itemLabel}>
            {voice ? APP_COPY.menu.voiceOn : APP_COPY.menu.voiceOff}
          </span>
          <span className={styles.switchTrack} data-checked={String(voice)} aria-hidden="true">
            <span className={styles.switchThumb} />
          </span>
        </button>

        <hr className={styles.divider} />

        <button
          type="button"
          className={styles.menuItem}
          onClick={() => {
            closeMenu(false);
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
