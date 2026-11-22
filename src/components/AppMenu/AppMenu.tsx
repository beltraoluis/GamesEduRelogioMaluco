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
  const panelId = `${useId()}-mp`;
  const containerRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const offlineReady = Boolean((pwa as { readonly offlineReady?: boolean }).offlineReady);

  const computePos = useCallback(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (
      !trigger ||
      !panel ||
      (globalThis.CSS?.supports('position-area', 'block-end') && panel.matches(':popover-open'))
    ) {
      return;
    }
    const tr = trigger.getBoundingClientRect();
    const pr = panel.getBoundingClientRect();
    const left = Math.max(8, Math.min(tr.right - pr.width, window.innerWidth - pr.width - 8));
    const below = tr.bottom + 8;
    const above = tr.top - pr.height - 8;
    const maxTop = window.innerHeight - pr.height - 8;
    const top = below > maxTop && above >= 8 ? above : Math.min(below, maxTop);
    panel.style.setProperty('--menu-top', `${Math.max(8, top)}px`);
    panel.style.setProperty('--menu-left', `${left}px`);
  }, []);

  const closeMenu = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    try {
      panelRef.current?.hidePopover?.();
    } catch { /* ignore */ }
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    try {
      if (open) panel.showPopover?.();
      else panel.hidePopover?.();
    } catch { /* ignore */ }
    if (open) computePos();
  }, [open, computePos]);

  useEffect(() => {
    if (!open) return;
    const onOut = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (t && containerRef.current && !containerRef.current.contains(t)) closeMenu(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeMenu(true);
      }
    };
    document.addEventListener('click', onOut);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', computePos);
    return () => {
      document.removeEventListener('click', onOut);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', computePos);
    };
  }, [open, closeMenu, computePos]);

  const switches: readonly [string, boolean, UiIconName, string, () => void][] = [
    ['sound', sound, sound ? 'BellOn' : 'BellOff', sound ? APP_COPY.menu.soundOn : APP_COPY.menu.soundOff, onToggleSound],
    ['voice', voice, voice ? 'VoiceOn' : 'VoiceOff', voice ? APP_COPY.menu.voiceOn : APP_COPY.menu.voiceOff, onToggleVoice],
  ];

  const renderIconLabel = (icon: UiIconName, label: string, size = 22) => (
    <>
      <span className={styles.itemIcon} aria-hidden="true">
        <UiIcon name={icon} size={size} />
      </span>
      <span className={styles.itemLabel}>{label}</span>
    </>
  );

  return (
    <nav ref={containerRef} className={styles.menu} aria-label="Menu principal" data-app-menu="true">
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-label={open ? 'Fechar menu' : 'Menu'}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((p) => !p)}
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
        onToggle={(e) => {
          if (e.newState === 'closed') setOpen(false);
        }}
      >
        {switches.map(([key, checked, icon, label, onToggle]) => (
          <button
            key={key}
            type="button"
            role="switch"
            aria-checked={checked}
            className={styles.menuItem}
            onClick={onToggle}
            data-menu-item={key}
          >
            {renderIconLabel(icon, label)}
            <span className={styles.switchTrack} data-checked={String(checked)} aria-hidden="true">
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
          {renderIconLabel('TeacherBook', APP_COPY.menu.teachers)}
        </button>

        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.menuItem}
          onClick={() => closeMenu(false)}
          data-menu-item="source"
        >
          {renderIconLabel('CompassExplore', APP_COPY.menu.source)}
        </a>

        {pwa.canInstall && !pwa.isStandalone && (
          <button
            type="button"
            className={`${styles.menuItem} ${styles.installItem}`}
            onClick={() => {
              closeMenu(false);
              void pwa.install();
            }}
            data-menu-item="install"
          >
            {renderIconLabel('InstallApp', APP_COPY.menu.install)}
          </button>
        )}

        {pwa.showIosInstallTip && !pwa.isStandalone && !pwa.canInstall && (
          <div
            className={`${styles.menuItem} ${styles.iosTipItem}`}
            role="note"
            data-menu-item="ios-install-tip"
          >
            {renderIconLabel('InstallApp', APP_COPY.menu.iosInstallTip, 20)}
          </div>
        )}

        {offlineReady && (
          <div
            className={`${styles.menuItem} ${styles.offlineBadge}`}
            role="status"
            data-menu-item="offline-ready"
          >
            {renderIconLabel('OfflineCheck', APP_COPY.menu.offlineReady, 20)}
          </div>
        )}
      </div>
    </nav>
  );
}

export default AppMenu;
