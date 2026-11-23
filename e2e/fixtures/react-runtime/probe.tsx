// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import { Activity, StrictMode, useLayoutEffect, useRef, useState, version } from 'react';
import { createRoot } from 'react-dom/client';
import { useGameController } from '../../../src/screens/GameScreen/useGameController';
import type { GameControllerHookApi } from '../../../src/screens/GameScreen/useGameController';

const events: string[] = [];
let controller: GameControllerHookApi | null = null;
Object.assign(window, { runtimeProbe: () => ({ version, events,
  pending: Number(document.getElementById('probe-child')?.dataset.pending),
}) });

function Child({ label }: { label: string }) {
  const api = useGameController({
    createSession: () => ({ sessionId: 'production-activity', seed: 3 }),
    onEvent: event => { events.push(`${label}:${event.seq}:${event.event.type}`); },
  });
  useLayoutEffect(() => { controller = api; });
  return <p id="probe-child" data-pending={api.state?.pendingEvents.length ?? 0}>Atividade visível</p>;
}

function Probe() {
  const [hidden, setHidden] = useState(false);
  const [label, setLabel] = useState('initial');
  const first = useRef(true);
  return <>
    <button onClick={() => controller?.start('words', 1)}>Começar</button>
    <button onClick={() => {
      if (first.current) { controller?.requestHelp(); first.current = false; }
      setLabel('latest');
      setHidden(true);
    }}>Ocultar com evento pendente</button>
    <button onClick={() => setHidden(false)}>Reexibir</button>
    <Activity mode={hidden ? 'hidden' : 'visible'}><Child label={label} /></Activity>
  </>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><Probe /></StrictMode>);
