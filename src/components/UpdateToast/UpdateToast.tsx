// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import type { ReactElement } from 'react';

import { Button } from '@/components/Button';
import type { UpdateToastProps } from '@/contracts';
import { UiIcon } from '@/ui/icons/UiIcons';

import styles from './UpdateToast.module.css';

export function UpdateToast({
  visible,
  onApply,
  onDismiss,
}: UpdateToastProps): ReactElement | null {
  if (!visible) {
    return null;
  }

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
        <span>Uma nova versão do Relógio Maluco está pronta.</span>
      </div>
      <div className={styles.actions}>
        <Button variant="primary" size="sm" onClick={onApply}>
          Atualizar agora
        </Button>
        <Button variant="soft" size="sm" onClick={onDismiss}>
          Agora não
        </Button>
      </div>
    </div>
  );
}

export default UpdateToast;
