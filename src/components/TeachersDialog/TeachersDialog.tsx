// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { useCallback, useEffect, useId, useRef, useState, type ReactElement } from 'react';

import { Button } from '@/components/Button';
import { APP_COPY } from '@/content/copy';
import { buildAgplNotice, EDUCATORS_CONTENT } from '@/content/educators';
import type { TeachersDialogProps } from '@/contracts';
import { useModalDialog } from '@/hooks/useModalDialog';
import { UiIcon } from '@/ui/icons/UiIcons';

import styles from './TeachersDialog.module.css';

function extractCommit(sourceUrl: string): string {
  const idx = sourceUrl.indexOf('/tree/');
  const candidate = idx !== -1 ? sourceUrl.slice(idx + 6).trim() : '';
  if (candidate && candidate !== 'unknown') return candidate;
  const defined = typeof __APP_COMMIT__ !== 'undefined' ? String(__APP_COMMIT__).trim() : '';
  return defined && defined !== 'unknown' ? defined : '1c8594a';
}

export function TeachersDialog({
  open,
  onClose,
  onResetStars,
  sourceUrl,
  persistent,
}: TeachersDialogProps): ReactElement {
  const baseId = useId();
  const titleId = `${baseId}-t`;
  const bnccId = `${baseId}-b`;
  const confirmId = `${baseId}-c`;

  const [confirming, setConfirming] = useState(false);
  const [announced, setAnnounced] = useState(false);
  const resetRef = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef(false);

  const handleClose = useCallback(() => {
    restoreFocus.current = false;
    setConfirming(false);
    onClose();
  }, [onClose]);

  const dialogRef = useModalDialog(open, handleClose);
  const showConfirm = open && confirming;

  useEffect(() => {
    if (!open || !restoreFocus.current) return;
    resetRef.current
      ?.querySelector<HTMLButtonElement>(
        showConfirm ? '[data-reset-step="2-confirm"]' : '[data-reset-step="1"]',
      )
      ?.focus();
    if (!showConfirm) restoreFocus.current = false;
  }, [open, showConfirm]);

  const commit = extractCommit(sourceUrl);
  const version =
    typeof __APP_VERSION__ !== 'undefined' && String(__APP_VERSION__).trim()
      ? String(__APP_VERSION__).trim()
      : '0.1.0';
  const agplNotice = buildAgplNotice({ version, commit });

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      data-teachers-dialog="true"
      closedby="any"
    >
      <div className={styles.body}>
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {EDUCATORS_CONTENT.title}
          </h2>
          <button
            type="button"
            className={styles.closeBtn}
            aria-label={APP_COPY.teachers.close}
            onClick={handleClose}
            data-close-teachers="true"
          >
            <UiIcon name="CloseCross" size={22} />
          </button>
        </header>

        {!persistent && (
          <div
            className={styles.persistenceAlert}
            role="note"
            data-persistence-unavailable="true"
          >
            {APP_COPY.persistence.unavailable}
          </div>
        )}

        <p className={styles.paragraph}>{EDUCATORS_CONTENT.intro}</p>

        <h3 id={bnccId} className={styles.sectionTitle}>
          {EDUCATORS_CONTENT.bnccHeading}
        </h3>
        <div className={styles.tableWrapper} role="region" aria-labelledby={bnccId}>
          <table className={styles.bnccTable} role="table">
            <thead>
              <tr>
                <th scope="col">Código</th>
                <th scope="col">Resumo da habilidade</th>
                <th scope="col">Onde aparece</th>
              </tr>
            </thead>
            {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
            <tbody role="rowgroup">
              {EDUCATORS_CONTENT.bnccSkills.map((e) => (
                <tr key={e.code} role="row" data-bncc-row={e.code}>
                  <th scope="row" role="rowheader">{e.code}</th>
                  {/* eslint-disable-next-line jsx-a11y/no-interactive-element-to-noninteractive-role */}
                  <td role="cell">{e.summary}</td>
                  {/* eslint-disable-next-line jsx-a11y/no-interactive-element-to-noninteractive-role */}
                  <td role="cell">{e.where}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={styles.smallText}>{EDUCATORS_CONTENT.bnccDisclaimer}</p>

        <h3 className={styles.sectionTitle}>{EDUCATORS_CONTENT.levelsHeading}</h3>
        <ul className={styles.list}>
          {EDUCATORS_CONTENT.levels.map((l) => (
            <li key={l.id}>
              <strong>{l.title}:</strong> {l.description}
            </li>
          ))}
        </ul>

        <h3 className={styles.sectionTitle}>{EDUCATORS_CONTENT.modesHeading}</h3>
        <ul className={styles.list}>
          {EDUCATORS_CONTENT.modes.map((m) => (
            <li key={m.id}>
              <strong>{m.title}:</strong> {m.description}
            </li>
          ))}
        </ul>

        <h3 className={styles.sectionTitle}>{EDUCATORS_CONTENT.competenciesHeading}</h3>
        <p className={styles.paragraph}>{EDUCATORS_CONTENT.competencies}</p>
        <div className={styles.tagList} aria-hidden="true">
          <span className={styles.tagHour}>azul + filete sólido = horas</span>
          <span className={styles.tagMinute}>vermelho + borda tracejada = minutos</span>
          <span className={styles.tagPeriod}>roxo + pílula = período do dia</span>
        </div>

        <h3 className={styles.sectionTitle}>{EDUCATORS_CONTENT.usageHeading}</h3>
        <ul className={styles.list}>
          {EDUCATORS_CONTENT.usageSuggestions.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>

        <div ref={resetRef} className={styles.resetSection}>
          {!showConfirm ? (
            <div>
              <Button
                variant="soft"
                onClick={() => {
                  restoreFocus.current = true;
                  setConfirming(true);
                  setAnnounced(false);
                }}
                data-reset-step="1"
              >
                {APP_COPY.teachers.resetButton}
              </Button>
            </div>
          ) : (
            <div
              className={styles.confirmBox}
              role="group"
              aria-label={APP_COPY.resetProgress.title}
            >
              <p id={confirmId} className={styles.paragraph}>
                {APP_COPY.resetProgress.confirm}
              </p>
              <div className={styles.confirmActions}>
                <Button
                  variant="primary"
                  aria-describedby={confirmId}
                  onClick={() => {
                    onResetStars();
                    setConfirming(false);
                    setAnnounced(true);
                  }}
                  data-reset-step="2-confirm"
                >
                  {APP_COPY.resetProgress.confirmButton}
                </Button>
                <Button
                  variant="soft"
                  onClick={() => setConfirming(false)}
                  data-reset-step="2-cancel"
                >
                  {APP_COPY.resetProgress.cancelButton}
                </Button>
              </div>
            </div>
          )}

          <p className={styles.liveStatus} role="status" aria-live="polite">
            {announced ? APP_COPY.resetProgress.liveMessage : ''}
          </p>
        </div>

        <h3 className={styles.sectionTitle}>{EDUCATORS_CONTENT.licenseHeading}</h3>
        <div className={styles.licenseBox}>
          <p className={styles.smallText} data-agpl-notice="true">
            {agplNotice}
          </p>
          <div className={styles.licenseLinks}>
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
              Código-fonte ({commit})
            </a>
            <a href="LICENSE.txt" target="_blank" rel="license noopener noreferrer">
              LICENSE.txt (AGPL-3.0-or-later)
            </a>
            <a href="THIRD_PARTY_LICENSES.txt" target="_blank" rel="noopener noreferrer">
              THIRD_PARTY_LICENSES.txt
            </a>
          </div>
        </div>
      </div>
    </dialog>
  );
}

export default TeachersDialog;
