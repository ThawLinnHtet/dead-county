import { useState } from 'react';
import { createGameCoordinator } from './game/gameCoordinator';
import type { GameCoordinator } from './game/gameCoordinator';
import { PlaySession } from './game/PlaySession';
import { RunMenus } from './ui/RunMenus';

export function App() {
  const [coordinator, setCoordinator] = useState<GameCoordinator | null>(null);
  const [menuScreen, setMenuScreen] = useState<'main' | 'survivors'>('main');

  function leaveRun(destination: typeof menuScreen) {
    setMenuScreen(destination);
    setCoordinator(null);
  }

  return coordinator
    ? <PlaySession coordinator={coordinator} onNewRun={() => leaveRun('survivors')} onMainMenu={() => leaveRun('main')} />
    : <RunMenus
        initialScreen={menuScreen}
        onStartRun={(characterId) => setCoordinator(createGameCoordinator({ characterId }))}
      />;
}
