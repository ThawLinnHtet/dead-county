import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { HouseScene } from './HouseScene';
import type { GameCoordinator } from './gameCoordinator';

export function GameViewport({ coordinator }: { coordinator: GameCoordinator }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parent = host.current;
    if (!parent) return;

    let game: Phaser.Game | undefined;
    const frame = requestAnimationFrame(() => {
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent,
        backgroundColor: '#3f4934',
        pixelArt: true,
        scene: new HouseScene(coordinator),
        scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
      });
    });

    return () => {
      cancelAnimationFrame(frame);
      game?.destroy(true);
    };
  }, [coordinator]);

  return <div ref={host} className="game-viewport" role="region" aria-label="Dead County game world" />;
}
