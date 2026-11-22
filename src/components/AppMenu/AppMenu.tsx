// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { useCallback, useId, useLayoutEffect, type ReactElement } from 'react';

import { UI_COPY } from '@/content/runtimeDomData';
import type { AppMenuProps } from '@/contracts';
import { useDismissiblePopover } from '@/hooks/useDismissiblePopover';
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
  const offlineReady =
    'offlineReady' in pwa &&
    Boolean((pwa as { readonly offlineReady?: boolean }).offlineReady);

  const {
    open,
    setOpen,
    containerRef,
    triggerRef,
    panelRef,
    close: closeMenu,
  } = useDismissiblePopover<HTMLElement>();

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
  }, [triggerRef, panelRef]);



  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    try {
      if (open) panel.showPopover?.();
      else panel.hidePopover?.();
    } catch {
      // O painel também pode ser posicionado fora da camada nativa.
    }
    if (!open) return;
    computeFallbackPosition();
    window.addEventListener('resize', computeFallbackPosition);
    return () => window.removeEventListener('resize', computeFallbackPosition);
  }, [open, panelRef, computeFallbackPosition]);

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
      label: sound ? UI_COPY.menu.soundOn : UI_COPY.menu.soundOff,
      onToggle: onToggleSound,
    },
    {
      key: 'voice',
      checked: voice,
      icon: voice ? 'VoiceOn' : 'VoiceOff',
      label: voice ? UI_COPY.menu.voiceOn : UI_COPY.menu.voiceOff,
      onToggle: onToggleVoice,
    },
  ];

  const renderItemContent = (icon: UiIconName, label: string, size = 22): ReactElement => (
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
            {renderItemContent(sw.icon, sw.label)}
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
          {renderItemContent('TeacherBook', UI_COPY.menu.teachers)}
        </button>

        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.menuItem}
          onClick={() => closeMenu(false)}
          data-menu-item="source"
        >
          {renderItemContent('CompassExplore', UI_COPY.menu.source)}
        </a>

        {pwa.canInstall && !pwa.isStandalone ? (
          <button
            type="button"
            className={`${styles.menuItem} ${styles.installItem}`}
            onClick={() => {
              closeMenu(false);
              void pwa.install();
            }}
            data-menu-item="install"
          >
            {renderItemContent('InstallApp', UI_COPY.menu.install)}
          </button>
        ) : null}

        {pwa.showIosInstallTip && !pwa.isStandalone && !pwa.canInstall ? (
          <div
            className={`${styles.menuItem} ${styles.iosTipItem}`}
            role="note"
            data-menu-item="ios-install-tip"
          >
            {renderItemContent('InstallApp', UI_COPY.menu.iosInstallTip, 20)}
          </div>
        ) : null}

        {offlineReady ? (
          <div
            className={`${styles.menuItem} ${styles.offlineBadge}`}
            role="status"
            data-menu-item="offline-ready"
          >
            {renderItemContent('OfflineCheck', UI_COPY.menu.offlineReady, 20)}
          </div>
        ) : null}
      </div>
    </nav>
  );
}

export default AppMenu;
