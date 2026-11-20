import { canOccupy, contains, houses, survivorSpawn, unproject } from './world.ts';
import type { WorldPoint } from './world.ts';
import { createGamePause } from './gamePause.ts';

export type SurvivorId = 'survivor_male' | 'survivor_female';

export interface GameState {
  readonly survivor: {
    readonly characterId: SurvivorId;
    readonly position: WorldPoint;
    readonly health: number;
    readonly stamina: number;
    readonly hunger: number;
    readonly thirst: number;
    readonly inventory: readonly (string | null)[];
    readonly equippedWeaponId: string | null;
    readonly gait: 'idle' | 'walk';
    readonly facingLeft: boolean;
    readonly walkDistance: number;
  };
  readonly occupiedHouseId: string | null;
  readonly activeTimeMs: number;
}

export interface GameCoordinator extends ReturnType<typeof createGamePause> {
  getState(): GameState;
  subscribe(listener: () => void): () => void;
  setMovement(screenDirection: WorldPoint, sprintHeld?: boolean): void;
  step(deltaMs: number): GameState;
}

const walkSpeed = 2.55;
const maxCollisionStep = 0.08;
const occupancyMargin = 0.07;

function getHouseAt(position: WorldPoint, previous?: string | null): string | null {
  return houses.find((house) =>
    contains(house, position, previous === undefined ? 0 : house.name === previous ? -occupancyMargin : occupancyMargin),
  )?.name ?? null;
}

function move(position: WorldPoint, dx: number, dy: number): WorldPoint {
  const straight = { x: position.x + dx, y: position.y + dy };
  if (canOccupy(straight)) return straight;

  // Sliding follows the walkable axis at a wall instead of catching its corners.
  const horizontal = { x: straight.x, y: position.y };
  const vertical = { x: position.x, y: straight.y };
  const alternatives = Math.abs(dx) >= Math.abs(dy)
    ? [horizontal, vertical]
    : [vertical, horizontal];
  return alternatives.find((candidate) => canOccupy(candidate)) ?? position;
}

export function createGameCoordinator({
  position = survivorSpawn,
  characterId = 'survivor_male',
}: { position?: WorldPoint; characterId?: SurvivorId } = {}): GameCoordinator {
  if (!canOccupy(position)) throw new Error('The survivor must start on walkable ground');

  let state: GameState = {
    survivor: {
      characterId,
      position: { ...position },
      health: 100,
      stamina: 100,
      hunger: 0,
      thirst: 0,
      inventory: Array<string | null>(12).fill(null),
      equippedWeaponId: null,
      gait: 'idle',
      facingLeft: false,
      walkDistance: 0,
    },
    occupiedHouseId: getHouseAt(position),
    activeTimeMs: 0,
  };
  let direction: WorldPoint = { x: 0, y: 0 };
  const listeners = new Set<() => void>();

  function notify() {
    for (const listener of listeners) listener();
  }

  const pause = createGamePause(() => {
    if (pause.getPauseState().isPaused) direction = { x: 0, y: 0 };
    notify();
  });

  function step(deltaMs: number): GameState {
    if (pause.getPauseState().isPaused) return state;
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return state;

    const previous = state.survivor;
    let nextPosition = previous.position;
    const distance = walkSpeed * deltaMs / 1000;
    if (direction.x || direction.y) {
      const steps = Math.ceil(distance / maxCollisionStep);
      const stride = distance / steps;
      for (let index = 0; index < steps; index += 1) {
        const next = move(nextPosition, direction.x * stride, direction.y * stride);
        if (next.x === nextPosition.x && next.y === nextPosition.y) break;
        nextPosition = next;
      }
    }

    const traveled = Math.hypot(nextPosition.x - previous.position.x, nextPosition.y - previous.position.y);
    const screenX = nextPosition.x - previous.position.x - (nextPosition.y - previous.position.y);
    const facingLeft = Math.abs(screenX) > 0.0001 ? screenX < 0 : previous.facingLeft;
    state = {
      survivor: {
        ...previous,
        position: nextPosition,
        gait: traveled > 0 ? 'walk' : 'idle',
        facingLeft,
        walkDistance: previous.walkDistance + traveled,
      },
      occupiedHouseId: getHouseAt(nextPosition, state.occupiedHouseId),
      activeTimeMs: state.activeTimeMs + deltaMs,
    };
    notify();
    return state;
  }

  return {
    ...pause,
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    setMovement(screenDirection) {
      if (pause.getPauseState().isPaused) return;
      const input = unproject(screenDirection);
      const magnitude = Math.hypot(input.x, input.y);
      direction = magnitude > 0 ? { x: input.x / magnitude, y: input.y / magnitude } : { x: 0, y: 0 };
    },
    step,
  };
}
