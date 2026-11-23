// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

import { useCallback } from 'react';
import type { SoundApi, SfxName } from '../contracts';
import * as engine from '../audio/sfxEngine';

export function useSound(enabled = true): SoundApi {
  const play = useCallback((name: SfxName) => { if (enabled) engine.play(name); }, [enabled]);
  return { enabled, play, unlock: engine.unlock };
}
