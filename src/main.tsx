// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão
import './styles/index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import type { AppScreens, HomeScreenProps } from './app/screenProps';
import { registerPwa } from './hooks/pwaRegistration';
import { usePwaInstall } from './hooks/usePwaInstall';
import { useServiceWorkerUpdate } from './hooks/useServiceWorkerUpdate';
import { ExploreScreen } from './screens/ExploreScreen';
import { GameScreen } from './screens/GameScreen';
import { HomeScreen } from './screens/HomeScreen';
import { ResultScreen } from './screens/ResultScreen';

function Home(props: HomeScreenProps) {
  const pwa = usePwaInstall();
  return <HomeScreen {...props} pwa={pwa} />;
}

const screens: AppScreens = { Home, Game: GameScreen, Explore: ExploreScreen, Result: ResultScreen };

registerPwa();
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App screens={screens} useUpdate={useServiceWorkerUpdate} />
  </StrictMode>,
);
