import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { formatSurvivalTime } from '../ui/formatSurvivalTime';
import { GameOverScreen } from '../ui/GameOverScreen';
import type { DeathSaveStatus } from '../save/useRunFlow';
import { houseNames } from './drawNeighborhoodMap';
import { GameViewport } from './GameViewport';
import type { GameCoordinator, GameOverResult } from './gameCoordinator';
import { InventoryPanel } from './InventoryPanel';
import { InventoryPreview } from './InventoryPreview';
import { FullMap, Minimap } from './NeighborhoodMap';
import { PauseMenu } from './PauseMenu';
import type { PauseSaveActions } from './PauseMenu';
import { SurvivalMeters } from './SurvivalMeters';
import { neighborhoodTime } from './survival';

function focusGameplay(root: HTMLElement | null) {
  const target = root?.querySelector('canvas') ?? root?.querySelector<HTMLElement>('.game-viewport');
  target?.focus({ preventScroll: true });
}

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
  const [inventoryItemId, setInventoryItemId] = useState<string>();
  const clock = neighborhoodTime(survivalSeconds * 1000);

  function openInventory(itemId?: string) {
    setInventoryItemId(itemId);
    coordinator.setForegroundPanel('inventory');
  }

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
        if (!event.repeat) {
          setInventoryItemId(undefined);
          coordinator.toggleInventory();
        }
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
    if (!pause.isPaused && !gameOver) focusGameplay(foreground.current);
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
        <div className="neighborhood-night" style={{ opacity: clock.darkness }} aria-hidden="true" />
        <header className="game-location">
          <p className="game-location-label" role="status">{houseNames[occupiedHouseId ?? ''] ?? 'Neighborhood'}</p>
          <SurvivalMeters coordinator={coordinator} />
        </header>
        <div className="map-hud">
          <div className="survival-clock">
            <span>Survival Time</span>
            <time role="timer" aria-label="Survival time" dateTime={`PT${survivalSeconds}S`}>
              {formatSurvivalTime(survivalSeconds)}
            </time>
            <span className="neighborhood-day">Day {clock.day} · {clock.time}</span>
          </div>
          <Minimap coordinator={coordinator} />
        </div>
        <InventoryPreview coordinator={coordinator} onOpenInventory={openInventory}
          onReturnToWorld={() => focusGameplay(foreground.current)} />
        <aside className="movement-hint" aria-label="Gameplay controls">
          <span className="movement-keys" aria-hidden="true">
            <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>
          </span>
          <span>Move</span>
          {batEquipped && (
            <>
              <span className="movement-keys mouse-control" aria-hidden="true"><kbd>Left Click</kbd></span>
              <span aria-label="Left Click to swing">Swing</span>
            </>
          )}
          <span className="movement-keys mouse-control" aria-hidden="true"><kbd>Esc</kbd></span>
          <span aria-label="Escape to pause">Pause</span>
        </aside>
      </div>
      {!gameOver && (
        <>
          <FullMap coordinator={coordinator} open={pause.foregroundPanel === 'map'} />
          {pause.foregroundPanel === 'pause' && (
            <PauseMenu pause={pause} onResume={coordinator.resume} saveActions={pauseSaveActions} />
          )}
          {(pause.foregroundPanel === 'inventory' || (pause.foregroundPanel === 'loot' && coordinator.getOpenContainer())) && (
            <InventoryPanel coordinator={coordinator}
              initialItemId={pause.foregroundPanel === 'inventory' ? inventoryItemId : undefined} />
          )}
        </>
      )}
    </main>
  );
}
