import { findRoute } from './navigation.ts';
import { canOccupy, canTraverse, hasLineOfSight, zombieSpawns } from './world.ts';
import type { WorldPoint } from './world.ts';

export interface ZombieSpawn {
  readonly id: string;
  readonly position: WorldPoint;
  readonly destination: WorldPoint;
  readonly appearanceId?: ZombieAppearanceId;
}

export type ZombieAppearanceId = 'zombie_civilian' | 'zombie_worker' | 'zombie_hoodie' | 'zombie_female' | 'zombie_bloody';

type ZombieBehavior = {
  readonly kind: 'wander';
  readonly destination: WorldPoint | null;
  readonly idleRemainingMs: number;
} | {
  readonly kind: 'chase';
  readonly lastKnownPosition: WorldPoint;
  readonly graceRemainingMs: number | null;
};

export interface ZombieState {
  readonly id: string;
  readonly appearanceId: ZombieAppearanceId;
  readonly position: WorldPoint;
  readonly facingLeft: boolean;
  readonly walkDistance: number;
  readonly moving: boolean;
  readonly behavior: ZombieBehavior;
  readonly randomState: number;
}

const zombieConfig = {
  wanderSpeed: 0.9,
  chaseSpeed: 2.85,
  detectionDistance: 6.5,
  approachDistance: 0.52,
  pursuitGraceMs: 4200,
  pathRefreshMs: 320,
  pathAttemptsPerWander: 2,
  wanderIdleMs: 850,
  wanderDestinationAttempts: 8,
};
const waypointTolerance = 0.00001;

function distance(a: WorldPoint, b: WorldPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function createZombie({ id, position, destination, appearanceId = 'zombie_civilian' }: ZombieSpawn) {
  if (!canOccupy(position)) throw new Error('Zombie spawn must be walkable: ' + id);
  let randomState = 2166136261;
  for (const character of id) randomState = Math.imul(randomState ^ character.charCodeAt(0), 16777619) >>> 0;

  let state: ZombieState = {
    id,
    appearanceId,
    position: { ...position },
    facingLeft: true,
    walkDistance: 0,
    moving: false,
    behavior: { kind: 'wander', destination: { ...destination }, idleRemainingMs: 0 },
    randomState,
  };
  let path: WorldPoint[] = [];
  let nextPathTimeMs = 0;
  let pathGoal: WorldPoint | undefined;
  let pathFailures = 0;

  function resetPath() {
    path = [];
    nextPathTimeMs = 0;
    pathGoal = undefined;
    pathFailures = 0;
  }

  function random(): number {
    randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
    return randomState / 2 ** 32;
  }

  function chooseWanderDestination(): WorldPoint | null {
    for (let attempt = 0; attempt < zombieConfig.wanderDestinationAttempts; attempt += 1) {
      const angle = random() * 2 * Math.PI;
      const stride = 1.8 + random() * 3;
      const point = {
        x: state.position.x + Math.cos(angle) * stride,
        y: state.position.y + Math.sin(angle) * stride,
      };
      if (canOccupy(point)) return point;
    }
    return null;
  }

  function perceive(survivor: WorldPoint, deltaMs: number): ZombieBehavior {
    const { behavior } = state;
    const visible = distance(state.position, survivor) <= zombieConfig.detectionDistance
      && hasLineOfSight(state.position, survivor);
    if (visible) {
      if (behavior.kind !== 'chase' || behavior.graceRemainingMs !== null) resetPath();
      return { kind: 'chase', lastKnownPosition: survivor, graceRemainingMs: null };
    }
    if (behavior.kind === 'wander') return behavior;

    if (behavior.graceRemainingMs === null) resetPath();
    const graceRemainingMs = Math.max(0, (behavior.graceRemainingMs ?? zombieConfig.pursuitGraceMs) - deltaMs);
    if (graceRemainingMs > 0) return { ...behavior, graceRemainingMs };
    resetPath();
    return { kind: 'wander', destination: null, idleRemainingMs: 0 };
  }

  function wander(behavior: Extract<ZombieBehavior, { kind: 'wander' }>, deltaMs: number): ZombieBehavior {
    const { position } = state;
    if (behavior.destination) {
      if (distance(position, behavior.destination) > waypointTolerance && pathFailures < zombieConfig.pathAttemptsPerWander) {
        return behavior;
      }
      resetPath();
      return { kind: 'wander', destination: null, idleRemainingMs: zombieConfig.wanderIdleMs };
    }

    const idleRemainingMs = Math.max(0, behavior.idleRemainingMs - deltaMs);
    if (idleRemainingMs > 0) return { ...behavior, idleRemainingMs };
    const destination = chooseWanderDestination();
    return { ...behavior, destination, idleRemainingMs: destination ? 0 : zombieConfig.wanderIdleMs };
  }

  function waypoints(goal: WorldPoint, activeTimeMs: number): WorldPoint[] {
    const { position } = state;
    if (canTraverse(position, goal)) {
      path = [];
      pathFailures = 0;
      return [goal];
    }

    const outdated = !pathGoal || distance(pathGoal, goal) >= 0.25;
    if (activeTimeMs >= nextPathTimeMs && (path.length === 0 || outdated)) {
      const route = findRoute(position, goal);
      path = route ?? [];
      pathGoal = goal;
      nextPathTimeMs = activeTimeMs + zombieConfig.pathRefreshMs;
      pathFailures = route ? 0 : pathFailures + 1;
    }
    return path;
  }

  function move(behavior: ZombieBehavior, deltaMs: number, activeTimeMs: number): ZombieState {
    const goal = behavior.kind === 'chase' ? behavior.lastKnownPosition : behavior.destination;
    const motion = { position: state.position, walkDistance: state.walkDistance, facingLeft: state.facingLeft };
    if (goal) {
      const route = waypoints(goal, activeTimeMs);
      const speed = behavior.kind === 'chase' ? zombieConfig.chaseSpeed : zombieConfig.wanderSpeed;
      let budget = speed * deltaMs / 1000;
      while (route.length > 0 && budget > 0) {
        const waypoint = route[0]!;
        const remaining = distance(motion.position, waypoint);
        const stopping = behavior.kind === 'chase' && behavior.graceRemainingMs === null && route.length === 1
          ? zombieConfig.approachDistance : 0;
        const stride = Math.min(Math.max(0, remaining - stopping), budget);

        if (stride > 0) {
          const dx = (waypoint.x - motion.position.x) * stride / remaining;
          const dy = (waypoint.y - motion.position.y) * stride / remaining;
          const next = { x: motion.position.x + dx, y: motion.position.y + dy };
          if (!canTraverse(motion.position, next)) {
            path = [];
            break;
          }
          motion.position = next;
          motion.walkDistance += stride;
          if (Math.abs(dx - dy) > waypointTolerance) motion.facingLeft = dx - dy < 0;
          budget -= stride;
        }

        if (remaining - stride > waypointTolerance) break;
        route.shift();
      }
    }
    return { ...state, ...motion, moving: motion.walkDistance > state.walkDistance, behavior, randomState };
  }

  return {
    getState: () => state,
    step(survivor: WorldPoint, deltaMs: number, activeTimeMs: number): ZombieState {
      const perceived = perceive(survivor, deltaMs);
      const behavior = perceived.kind === 'wander' && state.behavior.kind === 'wander'
        ? wander(perceived, deltaMs) : perceived;
      state = move(behavior, deltaMs, activeTimeMs);
      return state;
    },
  };
}

export function createZombies(spawns: readonly ZombieSpawn[] = zombieSpawns) {
  return spawns.map(createZombie);
}
