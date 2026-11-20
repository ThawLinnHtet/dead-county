import { useState } from 'react';
import { createGameCoordinator } from './game/gameCoordinator';
import type { GameCoordinator } from './game/gameCoordinator';
import { PlaySession } from './game/PlaySession';
import { RunMenus } from './ui/RunMenus';

export function App() {
  const [coordinator, setCoordinator] = useState<GameCoordinator | null>(null);

  return coordinator
    ? <PlaySession coordinator={coordinator} />
    : <RunMenus onStartRun={(characterId) => setCoordinator(createGameCoordinator({ characterId }))} />;
}
