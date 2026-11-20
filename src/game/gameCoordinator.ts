import { canOccupy, contains, houses, survivorSpawn, unproject } from './world.ts';
import type { WorldPoint } from './world.ts';

export interface GameState {
  readonly survivor: {
    readonly position: WorldPoint;
    readonly gait: 'idle' | 'walk';
    readonly facingLeft: boolean;
    readonly walkDistance: number;
  };
  readonly occupiedHouseId: string | null;
  readonly activeTimeMs: number;
}

export interface GameCoordinator {
  getState(): GameState;
  subscribe(listener: () => void): () => void;
  setMovement(screenDirection: WorldPoint): void;
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

export function createGameCoordinator({ position = survivorSpawn }: { position?: WorldPoint } = {}): GameCoordinator {
  if (!canOccupy(position)) throw new Error('The survivor must start on walkable ground');

  let state: GameState = {
    survivor: { position: { ...position }, gait: 'idle', facingLeft: false, walkDistance: 0 },
    occupiedHouseId: getHouseAt(position),
    activeTimeMs: 0,
  };
  let direction: WorldPoint = { x: 0, y: 0 };
  const listeners = new Set<() => void>();

  function step(deltaMs: number): GameState {
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
        position: nextPosition,
        gait: traveled > 0 ? 'walk' : 'idle',
        facingLeft,
        walkDistance: previous.walkDistance + traveled,
      },
      occupiedHouseId: getHouseAt(nextPosition, state.occupiedHouseId),
      activeTimeMs: state.activeTimeMs + deltaMs,
    };
    for (const listener of listeners) listener();
    return state;
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    setMovement(screenDirection) {
      const input = unproject(screenDirection);
      const magnitude = Math.hypot(input.x, input.y);
      direction = magnitude > 0 ? { x: input.x / magnitude, y: input.y / magnitude } : { x: 0, y: 0 };
    },
    step,
  };
}
