import { advanceAttack, aimFrom, batConfig, beginAttack, isInReach, shoveConfig } from './combat.ts';
import type { AttackState } from './combat.ts';
import { findRoute } from './navigation.ts';
import { canOccupy, canTraverse, hasLineOfSight, zombieSpawns } from './world.ts';
import type { Traversal, WorldPoint, ZombieAppearanceId } from './world.ts';
export type { ZombieAppearanceId } from './world.ts';

export interface ZombieSpawn {
  readonly id: string;
  readonly position: WorldPoint;
  readonly destination: WorldPoint;
  readonly appearanceId?: ZombieAppearanceId;
}

type ZombieBehavior = {
  readonly kind: 'wander';
  readonly destination: WorldPoint | null;
  readonly idleRemainingMs: number;
} | {
  readonly kind: 'chase';
  readonly lastKnownPosition: WorldPoint;
  readonly graceRemainingMs: number | null;
} | {
  readonly kind: 'investigate';
  readonly destination: WorldPoint;
  readonly remainingMs: number;
};

export type WorldSound = { readonly position: WorldPoint; readonly reach: number };
const ordinaryTraversal = { canOccupy, canTraverse, hasLineOfSight } satisfies Traversal;
type ZombieTraversal = Traversal & { findClosedDoorApproach?: (origin: WorldPoint, target: WorldPoint) => WorldPoint | null };

type NavigationRetry = { readonly failures: number; readonly nextAttemptAtMs: number };

export interface ZombieState {
  readonly id: string;
  readonly appearanceId: ZombieAppearanceId;
  readonly position: WorldPoint;
  readonly health: number;
  readonly lastBatHitAtMs: number | null;
  readonly attack: AttackState | null;
  readonly facingLeft: boolean;
  readonly walkDistance: number;
  readonly moving: boolean;
  readonly behavior: ZombieBehavior;
  readonly randomState: number;
  readonly navigationRetry: NavigationRetry | null;
}

export const zombieConfig = {
  health: 80,
  wanderSpeed: 0.9,
  chaseSpeed: 2.85,
  detectionDistance: 6.5,
  approachDistance: 0.52,
  bite: {
    reach: 0.78,
    damage: 22,
    windupMs: 425,
    contactMs: 135,
    recoveryMs: 560,
  },
  pursuitGraceMs: 4200,
  pathRefreshMs: 320,
  pathAttemptsPerWander: 2,
  wanderIdleMs: 850,
  wanderDestinationAttempts: 8,
  investigateMs: 5500,
  investigateSpeed: 1.65,
};
const waypointTolerance = 0.00001;

function distance(a: WorldPoint, b: WorldPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function createZombie({ id, position, destination, appearanceId = 'zombie_civilian' }: ZombieSpawn,
  restored?: ZombieState, traversal: ZombieTraversal = ordinaryTraversal) {
  const { canOccupy, canTraverse, hasLineOfSight } = traversal;
  if (!canOccupy(position) && restored?.health !== 0) throw new Error('Zombie spawn must be walkable: ' + id);
  let randomState = 2166136261;
  for (const character of id) randomState = Math.imul(randomState ^ character.charCodeAt(0), 16777619) >>> 0;

  randomState = restored?.randomState ?? randomState;
  let state: ZombieState = restored ? { ...restored, navigationRetry: restored.navigationRetry ?? null } : {
    id,
    appearanceId,
    position: { ...position },
    health: zombieConfig.health,
    lastBatHitAtMs: null,
    attack: null,
    facingLeft: true,
    walkDistance: 0,
    moving: false,
    behavior: { kind: 'wander', destination: { ...destination }, idleRemainingMs: 0 },
    randomState,
    navigationRetry: null,
  };
  let path: WorldPoint[] = [];
  let nextPathTimeMs = state.navigationRetry?.nextAttemptAtMs ?? 0;
  let pathGoal: WorldPoint | undefined;
  let pathFailures = state.navigationRetry?.failures ?? 0;

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

  function hear(sound: WorldSound) {
    if (state.health === 0 || state.behavior.kind === 'chase') return;
    const range = distance(state.position, sound.position);
    if (range > sound.reach) return;
    const reaches = sound.reach * (hasLineOfSight(state.position, sound.position) ? 1 : .63);
    if (range > reaches) return;
    resetPath();
    state = { ...state, behavior: { kind: 'investigate', destination: sound.position, remainingMs: zombieConfig.investigateMs }, navigationRetry: null };
  }

  function perceive(survivor: WorldPoint, deltaMs: number, sightRange: number): ZombieBehavior {
    const { behavior } = state;
    const visible = distance(state.position, survivor) <= sightRange
      && hasLineOfSight(state.position, survivor);
    if (visible) {
      if (behavior.kind !== 'chase' || behavior.graceRemainingMs !== null) resetPath();
      return { kind: 'chase', lastKnownPosition: survivor, graceRemainingMs: null };
    }
    if (behavior.kind === 'wander') return behavior;
    if (behavior.kind === 'investigate') {
      const remainingMs = Math.max(0, behavior.remainingMs - deltaMs);
      if (remainingMs > 0) return { ...behavior, remainingMs };
      resetPath();
      return { kind: 'wander', destination: null, idleRemainingMs: 0 };
    }

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
      resetPath();
      return [goal];
    }

    const outdated = !pathGoal || distance(pathGoal, goal) >= 0.25;
    if (activeTimeMs >= nextPathTimeMs && (path.length === 0 || outdated)) {
      const route = findRoute(position, goal, canTraverse);
      path = route ?? [];
      pathGoal = goal;
      nextPathTimeMs = activeTimeMs + zombieConfig.pathRefreshMs;
      pathFailures = route ? 0 : pathFailures + 1;
    }
    return path;
  }

  function movementGoal(behavior: ZombieBehavior) {
    if (behavior.kind !== 'chase') return behavior.destination;
    const target = behavior.lastKnownPosition;
    if (behavior.graceRemainingMs === null) return target;
    return traversal.findClosedDoorApproach?.(state.position, target) ?? target;
  }

  function rebuildNavigation(activeTimeMs: number) {
    path = [];
    pathGoal = undefined;
    // A failed search retries on its original active step.
    if (pathFailures > 0) return;

    nextPathTimeMs = 0;
    const goal = movementGoal(state.behavior);
    if (state.health <= 0 || !goal || canTraverse(state.position, goal)) return;
    const route = findRoute(state.position, goal, canTraverse);
    if (route) {
      path = route;
      pathGoal = goal;
      nextPathTimeMs = activeTimeMs + zombieConfig.pathRefreshMs;
    }
  }

  function move(behavior: ZombieBehavior, deltaMs: number, activeTimeMs: number): ZombieState {
    const goal = movementGoal(behavior);
    const motion = { position: state.position, walkDistance: state.walkDistance, facingLeft: state.facingLeft };
    if (goal) {
      const route = waypoints(goal, activeTimeMs);
      const speed = behavior.kind === 'chase' ? zombieConfig.chaseSpeed
        : behavior.kind === 'investigate' ? zombieConfig.investigateSpeed : zombieConfig.wanderSpeed;
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
    hear,
    rebuildNavigation,
    receiveShove(origin: WorldPoint) {
      const direction = aimFrom(origin, state.position) ?? { x: 1, y: 0 };
      const displaced = {
        x: state.position.x + direction.x * shoveConfig.knockback,
        y: state.position.y + direction.y * shoveConfig.knockback,
      };
      state = {
        ...state,
        attack: {
          kind: 'stagger', phase: 'recovery', remainingMs: shoveConfig.staggerMs,
          direction: { x: -direction.x, y: -direction.y }, damageApplied: false,
        },
        position: canTraverse(state.position, displaced) ? displaced : state.position,
        moving: false, navigationRetry: null,
      };
      resetPath();
    },
    receiveBatHit(origin: WorldPoint, activeTimeMs: number) {
      const { position } = state;
      const direction = aimFrom(origin, position);
      const displaced = direction && {
        x: position.x + direction.x * batConfig.knockback,
        y: position.y + direction.y * batConfig.knockback,
      };
      const health = Math.max(0, state.health - batConfig.damage);
      state = {
        ...state,
        health,
        lastBatHitAtMs: activeTimeMs,
        attack: health > 0 ? state.attack : null,
        position: displaced && canTraverse(position, displaced) ? displaced : position,
        moving: health > 0 && state.moving,
        navigationRetry: null,
      };
      resetPath();
    },
    resolveBite(survivor: WorldPoint): number {
      if (state.attack?.phase !== 'contact' || state.attack.damageApplied
          || !isInReach(state.position, survivor, zombieConfig.bite.reach, hasLineOfSight)) return 0;
      state = { ...state, attack: { ...state.attack, damageApplied: true } };
      return zombieConfig.bite.damage;
    },
    step(survivor: WorldPoint, deltaMs: number, activeTimeMs: number, sightRange = zombieConfig.detectionDistance): ZombieState {
      if (state.health === 0) return state;
      const perceived = perceive(survivor, deltaMs, sightRange);
      const behavior = perceived.kind === 'wander' && state.behavior.kind === 'wander'
        ? wander(perceived, deltaMs) : perceived;
      state = state.attack
        ? { ...state, behavior, attack: advanceAttack(state.attack, deltaMs, zombieConfig.bite), moving: false }
        : move(behavior, deltaMs, activeTimeMs);

      if (!state.attack && behavior.kind === 'chase' && behavior.graceRemainingMs === null
          && isInReach(state.position, survivor, zombieConfig.bite.reach, hasLineOfSight)) {
        const facing = aimFrom(state.position, survivor) ?? (state.facingLeft ? { x: 0, y: 1 } : { x: 1, y: 0 });
        state = { ...state, attack: beginAttack(facing, zombieConfig.bite), facingLeft: facing.x < facing.y, moving: false };
      }
      const navigationRetry = pathFailures > 0 ? { failures: pathFailures, nextAttemptAtMs: nextPathTimeMs } : null;
      if (navigationRetry !== state.navigationRetry) state = { ...state, navigationRetry };
      return state;
    },
  };
}

export function createZombies(spawns: readonly ZombieSpawn[] = zombieSpawns, traversal?: ZombieTraversal) {
  return spawns.map((spawn) => createZombie(spawn, undefined, traversal));
}

export function restoreZombies(zombies: readonly ZombieState[], activeTimeMs: number, traversal?: ZombieTraversal) {
  return zombies.map((zombie) => {
    const actor = createZombie({
      id: zombie.id, position: zombie.position, destination: zombie.position, appearanceId: zombie.appearanceId,
    }, zombie, traversal);
    actor.rebuildNavigation(activeTimeMs);
    return actor;
  });
}
