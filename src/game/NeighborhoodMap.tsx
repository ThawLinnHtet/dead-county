import { useCallback, useId, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import type { CSSProperties } from 'react';
import type { GameCoordinator } from './gameCoordinator';
import { getNeighborhoodMapImage, houseNames } from './drawNeighborhoodMap';
import { mapHeight, mapWidth, roofs } from './world';
import type { WorldPoint } from './world';
import './neighborhoodMap.css';

const minimapSpan = 20;
const markerRefreshMs = 50;

function useSurvivorMarker(coordinator: GameCoordinator) {
  const subscribe = useCallback((notify: () => void) => {
    let lastRefresh = -Infinity;
    return coordinator.subscribe(() => {
      const now = coordinator.getState().activeTimeMs;
      if (now - lastRefresh < markerRefreshMs && !coordinator.getPauseState().isPaused) return;
      lastRefresh = now;
      notify();
    });
  }, [coordinator]);
  const position = useSyncExternalStore(subscribe, () => coordinator.getState().survivor.position);
  const facing = useSyncExternalStore(subscribe, () => coordinator.getState().survivor.facing);
  return { position, facing };
}

function getMinimapOrigin(coordinate: number, extent: number) {
  // Let the window extend beyond the world edge, keeping the arrow visible at corners.
  const boundaryPadding = 4;
  return Math.min(Math.max(coordinate, boundaryPadding), extent - boundaryPadding) - minimapSpan / 2;
}

function PlayerMarker({ x, y, facing }: WorldPoint & { facing: WorldPoint }) {
  const degrees = Math.atan2(facing.x, -facing.y) * 180 / Math.PI;
  return (
    <span
      className="map-player-arrow"
      style={{ left: x + '%', top: y + '%', rotate: degrees + 'deg' }}
      aria-hidden="true"
    />
  );
}

function MinimapChart({ coordinator }: { coordinator: GameCoordinator }) {
  const { position, facing } = useSurvivorMarker(coordinator);
  const x = getMinimapOrigin(position.x, mapWidth);
  const y = getMinimapOrigin(position.y, mapHeight);
  const toPercent = (tiles: number) => tiles / minimapSpan * 100;
  return (
    <>
      <img
        className="minimap__chart"
        src={getNeighborhoodMapImage()}
        alt=""
        draggable={false}
        style={{
          width: toPercent(mapWidth) + '%',
          height: toPercent(mapHeight) + '%',
          left: -toPercent(x) + '%',
          top: -toPercent(y) + '%',
        }}
      />
      <PlayerMarker x={toPercent(position.x - x)} y={toPercent(position.y - y)} facing={facing} />
    </>
  );
}

export function Minimap({ coordinator }: { coordinator: GameCoordinator }) {
  return (
    <button
      type="button"
      className="minimap"
      aria-label="Open neighborhood map"
      aria-haspopup="dialog"
      aria-keyshortcuts="M"
      onClick={coordinator.toggleMap}
    >
      <MinimapChart coordinator={coordinator} />
      <span className="map-north minimap__north" aria-hidden="true">N</span>
      <kbd className="minimap__shortcut" aria-hidden="true">M</kbd>
    </button>
  );
}

const fullMapStyle: CSSProperties = { aspectRatio: mapWidth + ' / ' + mapHeight };

function FullMapChart({ coordinator }: { coordinator: GameCoordinator }) {
  const { position, facing } = useSurvivorMarker(coordinator);
  return (
    <div className="full-map__chart" style={fullMapStyle}>
      <img src={getNeighborhoodMapImage()} alt="" draggable={false} />
      <span className="map-north full-map__north" aria-hidden="true">N ↑</span>
      {roofs.map(({ name, x, y, width }) => (
        <span
          key={name}
          className="full-map__house"
          style={{ left: (x + width / 2) / mapWidth * 100 + '%', top: y / mapHeight * 100 + '%' }}
        >
          {houseNames[name]}
        </span>
      ))}
      <PlayerMarker x={position.x / mapWidth * 100} y={position.y / mapHeight * 100} facing={facing} />
    </div>
  );
}

export function FullMap({ coordinator, open }: { coordinator: GameCoordinator; open: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const locationId = useId();

  useLayoutEffect(() => {
    const panel = dialog.current;
    if (!open || !panel) return;
    panel.showModal();
    close.current?.focus();
    return () => panel.close();
  }, [open]);

  useLayoutEffect(() => {
    const mapPresses = new Set<number>();
    const onPointerDown = (event: PointerEvent) => {
      if (dialog.current?.open) mapPresses.add(event.pointerId);
      else mapPresses.delete(event.pointerId);
    };
    const onPointerEnd = (event: PointerEvent) => {
      // A keyboard dismissal can remove the dialog before a mouse gesture is released.
      if (mapPresses.delete(event.pointerId) && !dialog.current?.open) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('pointerup', onPointerEnd, true);
    window.addEventListener('pointercancel', onPointerEnd, true);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('pointerup', onPointerEnd, true);
      window.removeEventListener('pointercancel', onPointerEnd, true);
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      className="full-map"
      aria-labelledby={titleId}
      aria-describedby={locationId}
      onCancel={(event) => event.preventDefault()}
      onKeyDown={(event) => { if (event.key === 'Tab') event.preventDefault(); }}
    >
      {open && (
        <>
          <header className="full-map__header">
            <h2 id={titleId}>Neighborhood Map</h2>
            <div className="full-map__dismiss">
              <span aria-hidden="true"><kbd>M</kbd><kbd>Esc</kbd></span>
              <button ref={close} type="button" aria-label="Close map" onClick={coordinator.closeMap}>×</button>
            </div>
          </header>
          <FullMapChart coordinator={coordinator} />
          <div className="full-map__legend">
            <span><i className="full-map__player-key" aria-hidden="true" /> You</span>
            <span><i className="full-map__house-key" aria-hidden="true" /> Enterable house</span>
            <span id={locationId} className="sr-only">
              Current area: {houseNames[coordinator.getState().occupiedHouseId ?? ''] ?? 'Neighborhood'}.
            </span>
          </div>
        </>
      )}
    </dialog>
  );
}
