import { useState, useSyncExternalStore } from 'react';
import { GameViewport } from './game/GameViewport';
import { createGameCoordinator } from './game/gameCoordinator';
import type { GameCoordinator } from './game/gameCoordinator';
import { RunMenus } from './ui/RunMenus';

export function App() {
  const [coordinator, setCoordinator] = useState<GameCoordinator | null>(null);

  return coordinator
    ? <PlaySession coordinator={coordinator} />
    : <RunMenus onStartRun={(characterId) => setCoordinator(createGameCoordinator({ characterId }))} />;
}

function PlaySession({ coordinator }: { coordinator: GameCoordinator }) {
  const occupiedHouseId = useSyncExternalStore(
    coordinator.subscribe,
    () => coordinator.getState().occupiedHouseId,
  );

  return (
    <main className="game-screen">
      <GameViewport coordinator={coordinator} />
      <header className="game-location">
        <h1>Dead County</h1>
        <p role="status">{occupiedHouseId === 'house_a' ? 'House A' : 'Neighborhood'}</p>
      </header>
      <aside className="movement-hint" aria-label="Move with W, A, S and D">
        <span className="movement-keys" aria-hidden="true">
          <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>
        </span>
        <span>Move</span>
      </aside>
    </main>
  );
}
