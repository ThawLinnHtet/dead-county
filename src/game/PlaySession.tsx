import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { formatSurvivalTime } from '../ui/formatSurvivalTime';
import { GameOverScreen } from '../ui/GameOverScreen';
import type { DeathSaveStatus } from '../save/useRunFlow';
import { houseNames } from './drawNeighborhoodMap';
import { GameViewport } from './GameViewport';
import type { GameCoordinator, GameOverResult } from './gameCoordinator';
import { InventoryPanel } from './InventoryPanel';
import { FullMap, Minimap } from './NeighborhoodMap';
import { PauseMenu } from './PauseMenu';
import type { PauseSaveActions } from './PauseMenu';
import { SurvivalMeters } from './SurvivalMeters';

export function PlaySession({
  coordinator,
  onNewRun,
  onMainMenu,
  pauseSaveActions,
  deathSaveStatus,
  onRecoverDeathSave,
}: {
  coordinator: GameCoordinator;
  onNewRun: () => void;
  onMainMenu: () => void;
  pauseSaveActions?: PauseSaveActions;
  deathSaveStatus?: DeathSaveStatus;
  onRecoverDeathSave?: () => void;
}) {
  const foreground = useRef<HTMLDivElement>(null);
  const pause = useSyncExternalStore(coordinator.subscribe, coordinator.getPauseState);
  const occupiedHouseId = useSyncExternalStore(
    coordinator.subscribe,
    () => coordinator.getState().occupiedHouseId,
  );
  const batEquipped = useSyncExternalStore(coordinator.subscribe, () => !!coordinator.getState().survivor.equippedWeaponId);
  const survivalSeconds = useSyncExternalStore(
    coordinator.subscribe,
    () => Math.floor(coordinator.getState().activeTimeMs / 1000),
  );
  const gameOver = useSyncExternalStore(coordinator.subscribe, () => coordinator.getState().gameOver);
  const [revealedResult, revealGameOver] = useState<GameOverResult | null>(null);

  useLayoutEffect(() => {
    if (gameOver) return;
    const onVisibilityChange = () => coordinator.setTabHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibilityChange);
    onVisibilityChange();
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [coordinator, gameOver]);

  useEffect(() => {
    if (gameOver) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (coordinator.getState().gameOver || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.code === 'KeyM') {
        event.preventDefault();
        if (!event.repeat) coordinator.toggleMap();
        return;
      }
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
  }, [coordinator, gameOver]);

  useLayoutEffect(() => {
    if (!pause.isPaused && !gameOver) {
      const target = foreground.current?.querySelector('canvas')
        ?? foreground.current?.querySelector<HTMLElement>('.game-viewport');
      target?.focus({ preventScroll: true });
    }
  }, [pause.isPaused, gameOver]);

  if (gameOver && revealedResult === gameOver) {
    return (
      <GameOverScreen result={gameOver} onNewRun={onNewRun} onMainMenu={onMainMenu}
        saveStatus={deathSaveStatus} onRecoverSave={onRecoverDeathSave} />
    );
  }

  return (
    <main className="game-screen">
      <div ref={foreground} inert={pause.isPaused || gameOver !== null}>
        <GameViewport coordinator={coordinator} onDeathAnimationEnd={revealGameOver} />
        <header className="game-location">
          <SurvivalMeters coordinator={coordinator} />
          <p className="game-location-label" role="status">{houseNames[occupiedHouseId ?? ''] ?? 'Neighborhood'}</p>
        </header>
        <div className="map-hud">
          <div className="survival-clock">
            <span>Survival Time</span>
            <time role="timer" aria-label="Survival time" dateTime={`PT${survivalSeconds}S`}>
              {formatSurvivalTime(survivalSeconds)}
            </time>
          </div>
          <Minimap coordinator={coordinator} />
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
      {!gameOver && (
        <>
          <FullMap coordinator={coordinator} open={pause.foregroundPanel === 'map'} />
          {pause.foregroundPanel === 'pause' && (
            <PauseMenu pause={pause} onResume={coordinator.resume} saveActions={pauseSaveActions} />
          )}
          {(pause.foregroundPanel === 'inventory' || (pause.foregroundPanel === 'loot' && coordinator.getOpenContainer())) && (
            <InventoryPanel coordinator={coordinator} />
          )}
        </>
      )}
    </main>
  );
}
