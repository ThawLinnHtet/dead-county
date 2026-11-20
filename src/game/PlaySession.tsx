import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { GameViewport } from './GameViewport';
import type { GameCoordinator } from './gameCoordinator';
import { InventoryPanel } from './InventoryPanel';
import { PauseMenu } from './PauseMenu';
import type { PauseSaveActions } from './PauseMenu';

const locationNames: Readonly<Record<string, string>> = {
  house_a: 'House A',
  house_b: 'House B',
  house_c: 'House C',
};

export function PlaySession({
  coordinator,
  pauseSaveActions,
}: {
  coordinator: GameCoordinator;
  pauseSaveActions?: PauseSaveActions;
}) {
  const foreground = useRef<HTMLDivElement>(null);
  const pause = useSyncExternalStore(coordinator.subscribe, coordinator.getPauseState);
  const occupiedHouseId = useSyncExternalStore(
    coordinator.subscribe,
    () => coordinator.getState().occupiedHouseId,
  );
  const health = useSyncExternalStore(coordinator.subscribe, () => coordinator.getState().survivor.health);
  const batEquipped = useSyncExternalStore(coordinator.subscribe, () => !!coordinator.getState().survivor.equippedWeaponId);
  const survivalSeconds = useSyncExternalStore(
    coordinator.subscribe,
    () => Math.floor(coordinator.getState().activeTimeMs / 1000),
  );

  useLayoutEffect(() => {
    const onVisibilityChange = () => coordinator.setTabHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibilityChange);
    onVisibilityChange();
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [coordinator]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.code === 'KeyI') {
        if (!event.repeat) coordinator.toggleInventory();
        return;
      }
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (!event.repeat) coordinator.handleEscape();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [coordinator]);

  useLayoutEffect(() => {
    if (!pause.isPaused) {
      const target = foreground.current?.querySelector('canvas')
        ?? foreground.current?.querySelector<HTMLElement>('.game-viewport');
      target?.focus({ preventScroll: true });
    }
  }, [pause.isPaused]);

  return (
    <main className="game-screen">
      <div ref={foreground} inert={pause.isPaused}>
        <GameViewport coordinator={coordinator} />
        <header className="game-location">
          <h1>Dead County</h1>
          <p role="status">{locationNames[occupiedHouseId ?? ''] ?? 'Neighborhood'}</p>
          <div className="combat-health">
            <label htmlFor="survivor-health">Health</label>
            <meter id="survivor-health" min={0} max={100} value={health} />
            <span aria-hidden="true">{Math.ceil(health)} / 100</span>
          </div>
        </header>
        <div className="survival-clock">
          <span>Survival Time</span>
          <time role="timer" aria-label="Survival time" dateTime={`PT${survivalSeconds}S`}>
            {formatSurvivalTime(survivalSeconds)}
          </time>
        </div>
        <aside className="movement-hint" aria-label="Gameplay controls">
          <span className="movement-keys" aria-hidden="true">
            <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>
          </span>
          <span>Move</span>
          <span className="movement-keys" aria-hidden="true"><kbd>I</kbd></span>
          <span>Inventory</span>
          {batEquipped && (
            <>
              <span className="movement-keys mouse-control" aria-hidden="true"><kbd>Left Click</kbd></span>
              <span aria-label="Left Click to swing">Swing</span>
            </>
          )}
        </aside>
      </div>
      {pause.foregroundPanel === 'pause' && (
        <PauseMenu pause={pause} onResume={coordinator.resume} saveActions={pauseSaveActions} />
      )}
      {(pause.foregroundPanel === 'inventory' || (pause.foregroundPanel === 'loot' && coordinator.getOpenContainer())) && (
        <InventoryPanel coordinator={coordinator} />
      )}
    </main>
  );
}

function formatSurvivalTime(seconds: number) {
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
}
