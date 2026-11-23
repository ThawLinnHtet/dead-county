import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { formatSurvivalTime } from '../ui/formatSurvivalTime';
import { GameOverScreen } from '../ui/GameOverScreen';
import type { DeathSaveStatus } from '../save/useRunFlow';
import { GameViewport } from './GameViewport';
import type { GameAudio } from './gameAudio';
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
  audio,
  soundToggle,
  onNewRun,
  onMainMenu,
  pauseSaveActions,
  deathSaveStatus,
  onRecoverDeathSave,
}: {
  coordinator: GameCoordinator;
  audio: GameAudio;
  soundToggle: ReactNode;
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
  const weaponEquipped = useSyncExternalStore(coordinator.subscribe, () => !!coordinator.getState().survivor.equippedWeaponId);
  const survivalSeconds = useSyncExternalStore(
    coordinator.subscribe,
    () => Math.floor(coordinator.getState().activeTimeMs / 1000),
  );
  const gameOver = useSyncExternalStore(coordinator.subscribe, () => coordinator.getState().gameOver);
  const [revealedResult, revealGameOver] = useState<GameOverResult | null>(null);
  const [inventoryItemId, setInventoryItemId] = useState<string>();
  const [controlsOpen, setControlsOpen] = useState(false);
  const clock = neighborhoodTime(survivalSeconds * 1000);
  const showGameOver = gameOver !== null && revealedResult === gameOver;

  useLayoutEffect(() => {
    audio.setScene(showGameOver ? 'silent' : pause.isPaused ? 'paused' : 'world');
  }, [audio, pause.isPaused, showGameOver]);

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

  if (showGameOver) {
    return (
      <GameOverScreen result={gameOver} onNewRun={onNewRun} onMainMenu={onMainMenu}
        saveStatus={deathSaveStatus} onRecoverSave={onRecoverDeathSave} />
    );
  }

  return (
    <main className="game-screen">
      <div ref={foreground} inert={pause.isPaused || gameOver !== null}>
        <GameViewport coordinator={coordinator} audio={audio} onDeathAnimationEnd={revealGameOver} />
        <div className="neighborhood-night" style={{ opacity: clock.darkness }} aria-hidden="true" />
        <SurvivalMeters coordinator={coordinator} houseId={occupiedHouseId}
          onReturnToWorld={() => focusGameplay(foreground.current)} />
        <div className="map-hud">
          <div className="survival-clock field-frame">
            <span className="survival-clock-label">Survival Time</span>
            <time role="timer" aria-label="Survival time" dateTime={`PT${survivalSeconds}S`}>
              {formatSurvivalTime(survivalSeconds)}
            </time>
            <span className="neighborhood-day">Day {clock.day} · {clock.time}</span>
          </div>
          <Minimap coordinator={coordinator} />
        </div>
        <InventoryPreview coordinator={coordinator} audio={audio} onOpenInventory={openInventory}
          onReturnToWorld={() => focusGameplay(foreground.current)} />
        <aside className="movement-hint field-frame" aria-label="Gameplay controls">
          <div className="movement-hint__body" id="game-controls" hidden={!controlsOpen}>
            <span className="movement-keys"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span><span>Move</span>
            <span className="movement-keys"><kbd>Shift</kbd></span><span>Sprint</span>
            <span className="movement-keys"><kbd>C</kbd></span><span>Sneak</span>
            <span className="movement-keys"><kbd>Space</kbd></span><span>Shove to knock down</span>
            <span className="movement-keys"><kbd>E</kbd></span><span>Interact</span>
            <span className="movement-keys"><kbd>I</kbd></span><span>Inventory</span>
            <span className="movement-keys"><kbd>M</kbd></span><span>Map</span>
            <span className="movement-keys"><kbd>Esc</kbd></span><span>Pause</span>
          </div>
          {weaponEquipped ? (
            <div className="movement-hint__summary">
              <span>Hold <kbd>Right Click</kbd> to aim</span>
              <span><kbd>Left Click</kbd> to swing</span>
            </div>
          ) : !controlsOpen && (
            <div className="movement-hint__summary movement-hint__summary--move">
              <span className="movement-keys"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span> Move
            </div>
          )}
          <div className="movement-hint__actions">
            <button className="movement-hint__toggle" type="button" aria-expanded={controlsOpen}
              aria-controls="game-controls" onClick={(event) => {
                setControlsOpen(!controlsOpen);
                if (event.detail > 0) focusGameplay(foreground.current);
              }}>
              Controls
            </button>
            <button className="movement-hint__pause" type="button" aria-haspopup="dialog"
              aria-keyshortcuts="Escape" onClick={() => {
                if (!coordinator.getPauseState().isPaused) coordinator.handleEscape();
              }}>
              Pause <kbd aria-hidden="true">Esc</kbd>
            </button>
          </div>
        </aside>
      </div>
      {!gameOver && (
        <>
          <FullMap coordinator={coordinator} open={pause.foregroundPanel === 'map'} />
          {pause.foregroundPanel === 'pause' && (
            <PauseMenu pause={pause} onResume={coordinator.resume} saveActions={pauseSaveActions} soundToggle={soundToggle} />
          )}
          {(pause.foregroundPanel === 'inventory' || (pause.foregroundPanel === 'loot' && coordinator.getOpenContainer())) && (
            <InventoryPanel coordinator={coordinator} audio={audio}
              initialItemId={pause.foregroundPanel === 'inventory' ? inventoryItemId : undefined} />
          )}
        </>
      )}
    </main>
  );
}
