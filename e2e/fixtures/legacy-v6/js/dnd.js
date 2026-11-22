// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Luis Henrique Coutinho Beltrão

// Arrastar e soltar com Pointer Events (funciona com mouse, dedo e caneta).
// Um toque rápido na ficha também a envia para a lacuna certa (acessibilidade).

export function setupTile(tile, { onDrop, onTap, onPick }) {
  tile.addEventListener('pointerdown', (e) => {
    if (tile.disabled || e.button > 0) return;
    e.preventDefault();
    const rect = tile.getBoundingClientRect();
    const start = { x: e.clientX, y: e.clientY };
    let ghost = null;
    let over = null;
    let moved = false;
    tile.setPointerCapture?.(e.pointerId);

    const move = (ev) => {
      const dx = ev.clientX - start.x;
      const dy = ev.clientY - start.y;
      if (!moved && Math.hypot(dx, dy) > 8) {
        moved = true;
        ghost = tile.cloneNode(true);
        ghost.classList.add('ghost');
        ghost.removeAttribute('id');
        ghost.style.width = `${rect.width}px`;
        ghost.style.height = `${rect.height}px`;
        document.body.appendChild(ghost);
        tile.classList.add('dragging');
        onPick?.(tile);
      }
      if (!moved) return;
      ghost.style.transform = `translate(${rect.left + dx}px, ${rect.top + dy}px) rotate(-4deg) scale(1.08)`;
      const target = document.elementFromPoint(ev.clientX, ev.clientY);
      const slot = target?.closest('.slot:not(.filled)') ?? null;
      if (slot !== over) {
        over?.classList.remove('over');
        over = slot;
        over?.classList.add('over');
      }
    };

    const up = () => {
      tile.removeEventListener('pointermove', move);
      tile.removeEventListener('pointerup', up);
      tile.removeEventListener('pointercancel', up);
      over?.classList.remove('over');
      if (!moved) {
        onTap(tile);
        return;
      }
      tile.classList.remove('dragging');
      if (over) {
        ghost.remove();
        onDrop(tile, over);
      } else {
        ghost.style.transition = 'transform .25s ease-out';
        ghost.style.transform = `translate(${rect.left}px, ${rect.top}px)`;
        setTimeout(() => ghost.remove(), 260);
      }
    };

    tile.addEventListener('pointermove', move);
    tile.addEventListener('pointerup', up);
    tile.addEventListener('pointercancel', up);
  });

  tile.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onTap(tile);
    }
  });
}
