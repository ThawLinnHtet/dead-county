import { useState } from 'react';
import { createGameCoordinator } from './game/gameCoordinator';
import { PlaySession } from './game/PlaySession';

export function App() {
  const [coordinator] = useState(() => createGameCoordinator());

  return <PlaySession coordinator={coordinator} />;
}
