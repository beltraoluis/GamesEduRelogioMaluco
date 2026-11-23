// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import type { ReactElement } from 'react';

import modeAssembleImg from '@/assets/illustrations/mode-assemble.webp';
import modeExploreImg from '@/assets/illustrations/mode-explore.webp';
import modeHandsImg from '@/assets/illustrations/mode-hands.webp';
import modeNumbersImg from '@/assets/illustrations/mode-numbers.webp';
import modeWordsImg from '@/assets/illustrations/mode-words.webp';
import type { ModeId } from '@/contracts';

export const MODE_ILLUSTRATION_SRCS: Readonly<Record<ModeId, string>> = {
  assemble: modeAssembleImg,
  numbers: modeNumbersImg,
  words: modeWordsImg,
  hands: modeHandsImg,
  explore: modeExploreImg,
};

export interface ModeIllustrationProps {
  readonly mode: ModeId;
  readonly className?: string | undefined;
  readonly width?: number;
  readonly height?: number;
}

export function ModeIllustration({
  mode,
  className,
  width = 384,
  height = 384,
}: ModeIllustrationProps): ReactElement {
  const src = MODE_ILLUSTRATION_SRCS[mode];
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      loading="eager"
      decoding="async"
      width={width}
      height={height}
      data-mode-illustration={mode}
      {...(className === undefined ? {} : { className })}
    />
  );
}

export default ModeIllustration;
