import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { HouseScene } from './HouseScene';
import type { GameCoordinator } from './gameCoordinator';

const movementKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight']);

export function GameViewport({ coordinator }: { coordinator: GameCoordinator }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parent = host.current;
    if (!parent) return;

    const heldKeys = new Set<string>();

    function updateMovement() {
      coordinator.setMovement({
        x: Number(heldKeys.has('KeyD')) - Number(heldKeys.has('KeyA')),
        y: Number(heldKeys.has('KeyS')) - Number(heldKeys.has('KeyW')),
      }, heldKeys.has('ShiftLeft') || heldKeys.has('ShiftRight'));
    }

    function clearMovement() {
      heldKeys.clear();
      updateMovement();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey
        || !movementKeys.has(event.code) || coordinator.getPauseState().isPaused) return;
      heldKeys.add(event.code);
      updateMovement();
    }

    function onKeyUp(event: KeyboardEvent) {
      if (heldKeys.delete(event.code)) updateMovement();
    }

    const unsubscribe = coordinator.subscribe(() => {
      if (coordinator.getPauseState().isPaused) heldKeys.clear();
    });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearMovement);

    let game: Phaser.Game | undefined;
    const frame = requestAnimationFrame(() => {
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent,
        backgroundColor: '#3f4934',
        pixelArt: true,
        scene: new HouseScene(coordinator),
        scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
        input: { keyboard: false, windowEvents: false },
        callbacks: {
          postBoot({ canvas }) {
            canvas.tabIndex = -1;
            canvas.setAttribute('aria-label', 'Dead County game canvas');
            if (document.activeElement === parent) canvas.focus({ preventScroll: true });
          },
        },
      });
    });

    return () => {
      unsubscribe();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearMovement);
      clearMovement();
      cancelAnimationFrame(frame);
      game?.destroy(true);
    };
  }, [coordinator]);

  return <div ref={host} className="game-viewport" role="region" aria-label="Dead County game world" tabIndex={-1} />;
}
