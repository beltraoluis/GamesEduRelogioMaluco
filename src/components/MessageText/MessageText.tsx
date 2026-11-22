// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import type { ReactElement } from 'react';

import { HandBadge } from '@/components/HandBadge';
import type { Group, MessageSegment, MessageTextProps } from '@/contracts';

import styles from './MessageText.module.css';

const GROUP_CLASS: Readonly<Record<Group, string | undefined>> = {
  hour: styles.termHour,
  minute: styles.termMinute,
  period: styles.termPeriod,
};

function renderSegment(segment: MessageSegment, index: number): ReactElement {
  switch (segment.kind) {
    case 'text':
      return <span key={index}>{segment.text}</span>;
    case 'strong':
      return (
        <strong key={index} className={styles.strong}>
          {segment.text}
        </strong>
      );
    case 'term': {
      const groupClass = segment.group === undefined ? undefined : GROUP_CLASS[segment.group];
      const className = [styles.term, groupClass].filter(Boolean).join(' ');
      return (
        <span
          key={index}
          className={className}
          {...(segment.group === undefined ? {} : { 'data-term-group': segment.group })}
        >
          {segment.text}
        </span>
      );
    }
    case 'badge':
      return <HandBadge key={index} kind={segment.badge} size="inline" />;
  }
}

export function MessageText({ message }: MessageTextProps): ReactElement {
  return (
    <span className={styles.messageText} data-message-code={message.code}>
      {message.segments.map((segment, index) => renderSegment(segment, index))}
    </span>
  );
}

export default MessageText;
