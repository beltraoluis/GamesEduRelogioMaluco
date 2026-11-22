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

function extractCommitFromSourceUrl(sourceUrl: string): string {
  const idx = sourceUrl.indexOf('/tree/');
  const candidate = idx !== -1 ? sourceUrl.slice(idx + 6).trim() : '';
  if (candidate.length > 0 && candidate !== 'unknown') return candidate;
  const defined = typeof __APP_COMMIT__ !== 'undefined' ? String(__APP_COMMIT__).trim() : '';
  return defined.length > 0 && defined !== 'unknown' ? defined : '1c8594a';
}

function resolveAppVersion(): string {
  const defined = typeof __APP_VERSION__ !== 'undefined' ? String(__APP_VERSION__).trim() : '';
  return defined.length > 0 ? defined : '0.1.0';
}

export function TeachersDialog({
  open,
  onClose,
  onResetStars,
  sourceUrl,
  persistent,
}: TeachersDialogProps): ReactElement {
  const baseId = useId();
  const titleId = `${baseId}-teachers-title`;
  const bnccHeadingId = `${baseId}-bncc-heading`;
  const confirmTextId = `${baseId}-confirm-reset`;

  const [confirmingReset, setConfirmingReset] = useState(false);
  const [resetAnnounced, setResetAnnounced] = useState(false);
  const resetSectionRef = useRef<HTMLDivElement>(null);
  const restoreResetFocus = useRef(false);

  const handleClose = useCallback(() => {
    restoreResetFocus.current = false;
    setConfirmingReset(false);
    onClose();
  }, [onClose]);

  const dialogRef = useModalDialog(open, handleClose);

  const showConfirmBox = open && confirmingReset;

  useEffect(() => {
    if (!open || !restoreResetFocus.current) return;
    const nextButton = resetSectionRef.current?.querySelector<HTMLButtonElement>(
      showConfirmBox ? '[data-reset-step="2-confirm"]' : '[data-reset-step="1"]',
    );
    nextButton?.focus();
    if (!showConfirmBox) restoreResetFocus.current = false;
  }, [open, showConfirmBox]);

  const commit = extractCommitFromSourceUrl(sourceUrl);
  const agplNotice = buildAgplNotice({
    version: resolveAppVersion(),
    commit,
  });

  const handleConfirmReset = () => {
    onResetStars();
    setConfirmingReset(false);
    setResetAnnounced(true);
  };

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

        {!persistent ? (
          <div
            className={styles.persistenceAlert}
            role="note"
            data-persistence-unavailable="true"
          >
            {APP_COPY.persistence.unavailable}
          </div>
        ) : null}

        <p className={styles.paragraph}>{EDUCATORS_CONTENT.intro}</p>

        <h3 id={bnccHeadingId} className={styles.sectionTitle}>
          {EDUCATORS_CONTENT.bnccHeading}
        </h3>
        <div
          className={styles.tableWrapper}
          role="region"
          aria-labelledby={bnccHeadingId}
        >
          <table className={styles.bnccTable} role="table">
            <thead>
              <tr>
                <th scope="col">Código</th>
                <th scope="col">Resumo da habilidade</th>
                <th scope="col">Onde aparece</th>
              </tr>
            </thead>
            {/* Os papéis explícitos preservam a tabela empilhada no WebKit antigo (bug 257458). */}
            {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
            <tbody role="rowgroup">
              {EDUCATORS_CONTENT.bnccSkills.map((entry) => (
                <tr key={entry.code} role="row" data-bncc-row={entry.code}>
                  <th scope="row" role="rowheader">{entry.code}</th>
                  {/* eslint-disable-next-line jsx-a11y/no-interactive-element-to-noninteractive-role */}
                  <td role="cell">{entry.summary}</td>
                  {/* eslint-disable-next-line jsx-a11y/no-interactive-element-to-noninteractive-role */}
                  <td role="cell">{entry.where}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={styles.smallText}>{EDUCATORS_CONTENT.bnccDisclaimer}</p>

        <h3 className={styles.sectionTitle}>{EDUCATORS_CONTENT.levelsHeading}</h3>
        <ul className={styles.list}>
          {EDUCATORS_CONTENT.levels.map((level) => (
            <li key={level.id}>
              <strong>{level.title}:</strong> {level.description}
            </li>
          ))}
        </ul>

        <h3 className={styles.sectionTitle}>{EDUCATORS_CONTENT.modesHeading}</h3>
        <ul className={styles.list}>
          {EDUCATORS_CONTENT.modes.map((mode) => (
            <li key={mode.id}>
              <strong>{mode.title}:</strong> {mode.description}
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
          {EDUCATORS_CONTENT.usageSuggestions.map((suggestion, index) => (
            <li key={index}>{suggestion}</li>
          ))}
        </ul>

        <div ref={resetSectionRef} className={styles.resetSection}>
          {!showConfirmBox ? (
            <div>
              <Button
                variant="soft"
                onClick={() => {
                  restoreResetFocus.current = true;
                  setConfirmingReset(true);
                  setResetAnnounced(false);
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
              <p id={confirmTextId} className={styles.paragraph}>
                {APP_COPY.resetProgress.confirm}
              </p>
              <div className={styles.confirmActions}>
                <Button
                  variant="primary"
                  aria-describedby={confirmTextId}
                  onClick={handleConfirmReset}
                  data-reset-step="2-confirm"
                >
                  {APP_COPY.resetProgress.confirmButton}
                </Button>
                <Button
                  variant="soft"
                  onClick={() => setConfirmingReset(false)}
                  data-reset-step="2-cancel"
                >
                  {APP_COPY.resetProgress.cancelButton}
                </Button>
              </div>
            </div>
          )}

          <p className={styles.liveStatus} role="status" aria-live="polite">
            {resetAnnounced ? APP_COPY.resetProgress.liveMessage : ''}
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
