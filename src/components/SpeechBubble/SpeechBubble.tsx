// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import type { ReactElement } from 'react';

import { MessageText } from '@/components/MessageText';
import type { SpeechBubbleProps } from '@/contracts';
import { toPlainText } from '@/domain/messages';
import { UiIcon } from '@/ui/icons/UiIcons';

import styles from './SpeechBubble.module.css';

export function SpeechBubble({
  message,
  live = 'polite',
  tone = 'neutral',
}: SpeechBubbleProps): ReactElement {
  const plainText = toPlainText(message);
  const toneClass =
    tone === 'positive'
      ? styles.positive
      : tone === 'corrective'
        ? styles.corrective
        : styles.neutral;
  const className = [styles.bubble, toneClass].filter(Boolean).join(' ');

  return (
    <div
      className={className}
      aria-live={live}
      aria-atomic="true"
      data-speech-bubble="true"
      data-tone={tone}
      data-message-code={message.code}
      data-plain-text={plainText}
    >
      {tone === 'positive' ? (
        <span className={styles.toneIcon} aria-hidden="true">
          <UiIcon name="CheckBadge" size={20} />
        </span>
      ) : null}
      {tone === 'corrective' ? (
        <span className={styles.toneIcon} aria-hidden="true">
          <UiIcon name="HintBulb" size={20} />
        </span>
      ) : null}
      <div className={styles.textWrap}>
        <MessageText message={message} />
      </div>
    </div>
  );
}

export default SpeechBubble;
