import { canOccupy, contains, houses, survivorSpawn, unproject } from './world.ts';
import type { WorldPoint } from './world.ts';
import { createZombies } from './zombie.ts';
import type { ZombieSpawn, ZombieState } from './zombie.ts';

export interface GameState {
  readonly survivor: {
    readonly position: WorldPoint;
    readonly gait: 'idle' | 'walk' | 'sprint';
    readonly facingLeft: boolean;
    readonly walkDistance: number;
    readonly stamina: number;
  };
  readonly zombies: readonly ZombieState[];
  readonly occupiedHouseId: string | null;
  readonly activeTimeMs: number;
}

export interface GameCoordinator {
  getState(): GameState;
  subscribe(listener: () => void): () => void;
  setMovement(screenDirection: WorldPoint, sprintHeld?: boolean): void;
  step(deltaMs: number): GameState;
}

const movementConfig = {
  walkSpeed: 2.55,
  sprintSpeed: 4.2,
  maxCollisionStep: 0.08,
  sprintDrainPerMs: 0.026,
  staminaRecoveryPerMs: 0.018,
  minimumSprintStamina: 15,
};
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

function travel(position: WorldPoint, direction: WorldPoint, distance: number): WorldPoint {
  if (distance <= 0 || (!direction.x && !direction.y)) return position;

  const steps = Math.ceil(distance / movementConfig.maxCollisionStep);
  const stride = distance / steps;
  let current = position;
  for (let index = 0; index < steps; index += 1) {
    const next = move(current, direction.x * stride, direction.y * stride);
    if (next.x === current.x && next.y === current.y) break;
    current = next;
  }
  return current;
}

export function createGameCoordinator({
  position = survivorSpawn,
  zombieSpawns,
}: { position?: WorldPoint; zombieSpawns?: readonly ZombieSpawn[] } = {}): GameCoordinator {
  if (!canOccupy(position)) throw new Error('The survivor must start on walkable ground');
  const zombies = createZombies(zombieSpawns);
  let state: GameState = {
    survivor: { position: { ...position }, gait: 'idle', facingLeft: false, walkDistance: 0, stamina: 100 },
    zombies: zombies.map((zombie) => zombie.getState()),
    occupiedHouseId: getHouseAt(position),
    activeTimeMs: 0,
  };
  let direction: WorldPoint = { x: 0, y: 0 };
  let shiftHeld = false;
  let sprintRequested = false;
  const listeners = new Set<() => void>();

  function step(deltaMs: number): GameState {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return state;

    const previous = state.survivor;
    const { walkSpeed, sprintSpeed, sprintDrainPerMs, staminaRecoveryPerMs } = movementConfig;
    const timeToExhaustion = previous.stamina / sprintDrainPerMs;
    const sprintMs = sprintRequested ? Math.min(deltaMs, timeToExhaustion) : 0;
    const sprintPosition = travel(previous.position, direction, sprintSpeed * sprintMs / 1000);
    const sprinting = sprintPosition !== previous.position;
    const nextPosition = travel(sprintPosition, direction, walkSpeed * (deltaMs - sprintMs) / 1000);

    const exhausted = sprinting && sprintMs >= timeToExhaustion;
    const stamina = sprinting
      ? exhausted ? 0 : previous.stamina - sprintMs * sprintDrainPerMs
      : Math.min(100, previous.stamina + deltaMs * staminaRecoveryPerMs);
    if (exhausted) sprintRequested = false;

    const traveled = Math.hypot(nextPosition.x - previous.position.x, nextPosition.y - previous.position.y);
    const screenX = nextPosition.x - previous.position.x - (nextPosition.y - previous.position.y);
    const facingLeft = Math.abs(screenX) > 0.0001 ? screenX < 0 : previous.facingLeft;
    const activeTimeMs = state.activeTimeMs + deltaMs;
    state = {
      survivor: {
        ...previous,
        position: nextPosition,
        gait: traveled === 0 ? 'idle' : sprinting && !exhausted ? 'sprint' : 'walk',
        facingLeft,
        walkDistance: previous.walkDistance + traveled,
        stamina,
      },
      zombies: zombies.map((zombie) => zombie.step(nextPosition, deltaMs, activeTimeMs)),
      occupiedHouseId: getHouseAt(nextPosition, state.occupiedHouseId),
      activeTimeMs,
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
    setMovement(screenDirection, sprintHeld = false) {
      const input = unproject(screenDirection);
      const magnitude = Math.hypot(input.x, input.y);
      direction = Number.isFinite(magnitude) && magnitude > 0
        ? { x: input.x / magnitude, y: input.y / magnitude } : { x: 0, y: 0 };

      if (!sprintHeld) sprintRequested = false;
      if (sprintHeld && !shiftHeld) sprintRequested = state.survivor.stamina >= movementConfig.minimumSprintStamina;
      shiftHeld = sprintHeld;
    },
    step,
  };
}
