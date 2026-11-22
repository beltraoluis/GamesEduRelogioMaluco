// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import type { ReactElement } from 'react';

import { Button } from '@/components/Button';
import { APP_COPY } from '@/content/copy';
import type { UpdateToastProps } from '@/contracts';
import { UiIcon } from '@/ui/icons/UiIcons';

import styles from './UpdateToast.module.css';

export function UpdateToast({
  visible,
  onApply,
  onDismiss,
}: UpdateToastProps): ReactElement | null {
  if (!visible) return null;
  const { title, apply, dismiss } = APP_COPY.updateToast;

  return (
    <div
      className={styles.toast}
      role="status"
      aria-live="polite"
      data-update-toast="visible"
    >
      <div className={styles.content}>
        <UiIcon
          name="RefreshArrow"
          size={22}
          {...(styles.icon === undefined ? {} : { className: styles.icon })}
        />
        <span>{title}.</span>
      </div>
      <div className={styles.actions}>
        <Button variant="primary" size="sm" onClick={onApply}>
          {apply}
        </Button>
        <Button variant="soft" size="sm" onClick={onDismiss}>
          {dismiss}
        </Button>
      </div>
    </div>
  );
}

export default UpdateToast;
