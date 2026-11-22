// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright 2026 Luis Henrique Coutinho Beltrão
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { registerPwa } from './hooks/pwaRegistration';

registerPwa();

createRoot(document.getElementById('root')!).render(<App />);
