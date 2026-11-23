// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright 2026 Luis Henrique Coutinho Beltrão
import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import App from '../App';
test('exibe o título', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Relógio Maluco' })).toBeInTheDocument();
});
