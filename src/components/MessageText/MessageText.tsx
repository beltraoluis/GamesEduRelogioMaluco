// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import type { ReactElement } from 'react';

import { HandBadge } from '@/components/HandBadge';
import type { Group, MessageTextProps } from '@/contracts';

import styles from './MessageText.module.css';

const GROUP_CLASS: Readonly<Record<Group, string | undefined>> = {
  hour: styles.termHour,
  minute: styles.termMinute,
  period: styles.termPeriod,
};

export function MessageText({ message }: MessageTextProps): ReactElement {
  return (
    <span className={styles.messageText} data-message-code={message.code}>
      {message.segments.map((seg, i) =>
        seg.kind === 'text' ? (
          <span key={i}>{seg.text}</span>
        ) : seg.kind === 'strong' ? (
          <strong key={i} className={styles.strong}>
            {seg.text}
          </strong>
        ) : seg.kind === 'term' ? (
          <span
            key={i}
            className={[styles.term, seg.group ? GROUP_CLASS[seg.group] : undefined]
              .filter(Boolean)
              .join(' ')}
            {...(seg.group === undefined ? {} : { 'data-term-group': seg.group })}
          >
            {seg.text}
          </span>
        ) : (
          <HandBadge key={i} kind={seg.badge} size="inline" />
        ),
      )}
    </span>
  );
}

export default MessageText;
