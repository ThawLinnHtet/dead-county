import { advanceAttack, aimFrom, batConfig, beginAttack, selectBatTarget } from './combat.ts';
import type { AttackState } from './combat.ts';
import { canOccupy, contains, houses, survivorSpawn, unproject } from './world.ts';
import type { MapObject, WorldPoint } from './world.ts';
import { createGamePause } from './gamePause.ts';
import { authoredStock, findDropPosition, reachableContainers, reachableDrops, seedContainers } from './items.ts';
import type { ContainerContents, ContainerStock, DroppedItem, ItemInstance } from './items.ts';
import { createZombies } from './zombie.ts';
import type { ZombieSpawn, ZombieState } from './zombie.ts';

export type SurvivorId = 'survivor_male' | 'survivor_female';

export interface GameState {
  readonly survivor: {
    readonly characterId: SurvivorId;
    readonly position: WorldPoint;
    readonly health: number;
    readonly lastBiteAtMs: number | null;
    readonly stamina: number;
    readonly hunger: number;
    readonly thirst: number;
    readonly inventory: readonly (ItemInstance | null)[];
    readonly equippedWeaponId: string | null;
    readonly gait: 'idle' | 'walk' | 'sprint';
    readonly facingLeft: boolean;
    readonly facing: WorldPoint;
    readonly attack: AttackState | null;
    readonly walkDistance: number;
  };
  readonly zombies: readonly ZombieState[];
  readonly containers: ContainerContents;
  readonly droppedItems: readonly DroppedItem[];
  readonly occupiedHouseId: string | null;
  readonly activeTimeMs: number;
}

export interface GameCoordinator extends ReturnType<typeof createGamePause> {
  getState(): GameState;
  subscribe(listener: () => void): () => void;
  setMovement(screenDirection: WorldPoint, sprintHeld?: boolean): void;
  step(deltaMs: number): GameState;
  startBatSwing(target: WorldPoint): boolean;
  getInteractionTarget(): InteractionTarget | null;
  interact(displayed: InteractionTarget): InteractionResult;
  getSearchTarget(): MapObject | null;
  getOpenContainer(): MapObject | null;
  search(containerId: string): boolean;
  transferItem(containerId: string, itemId: string): TransferResult;
  toggleMap(): void;
  closeMap(): void;
  toggleInventory(): void;
  closeInventoryPanel(): void;
  toggleEquip(slot: number, itemId: string): boolean;
  dropItem(slot: number, itemId: string): DropResult;
}

export type InteractionTarget =
  | { kind: 'container'; id: string; position: WorldPoint; object: MapObject }
  | { kind: 'drop'; id: string; position: WorldPoint; item: ItemInstance };

type InteractionResult =
  | { status: 'searched' }
  | { status: 'picked_up'; slot: number }
  | { status: 'inventory_full' | 'unavailable' };

type DropResult = { status: 'dropped' | 'cannot_drop' | 'swing_in_progress' | 'unavailable' };

type TransferResult =
  | { status: 'transferred'; slot: number }
  | { status: 'inventory_full' | 'unavailable' };

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
  characterId = 'survivor_male',
  zombieSpawns,
  containerStock = authoredStock,
}: {
  position?: WorldPoint;
  characterId?: SurvivorId;
  zombieSpawns?: readonly ZombieSpawn[];
  containerStock?: ContainerStock;
} = {}): GameCoordinator {
  if (!canOccupy(position)) throw new Error('The survivor must start on walkable ground');
  const zombies = createZombies(zombieSpawns);
  let state: GameState = {
    survivor: {
      characterId,
      position: { ...position },
      health: 100,
      lastBiteAtMs: null,
      stamina: 100,
      hunger: 0,
      thirst: 0,
      inventory: Array<ItemInstance | null>(12).fill(null),
      equippedWeaponId: null,
      gait: 'idle',
      facingLeft: false,
      facing: { x: 1, y: 0 },
      attack: null,
      walkDistance: 0,
    },
    zombies: zombies.map((zombie) => zombie.getState()),
    containers: seedContainers(containerStock),
    droppedItems: [],
    occupiedHouseId: getHouseAt(position),
    activeTimeMs: 0,
  };
  let direction: WorldPoint = { x: 0, y: 0 };
  let shiftHeld = false;
  let sprintRequested = false;
  let openContainer: MapObject | null = null;
  const listeners = new Set<() => void>();

  function notify() {
    for (const listener of listeners) listener();
  }

  const pause = createGamePause(() => {
    const { isPaused, foregroundPanel } = pause.getPauseState();
    if (foregroundPanel !== 'loot') openContainer = null;
    if (isPaused) {
      direction = { x: 0, y: 0 };
      shiftHeld = false;
      sprintRequested = false;
    }
    notify();
  });

  function getReachableContainers() {
    return reachableContainers(state.survivor.position, state.occupiedHouseId, state.containers);
  }

  function interactionCandidates(): { target: InteractionTarget; distance: number }[] {
    if (pause.getPauseState().isPaused || state.survivor.health <= 0) return [];
    return [
      ...getReachableContainers().map(({ object, distance }) => ({
        target: {
          kind: 'container' as const,
          id: object.name,
          position: { x: object.x + object.width / 2, y: object.y + object.height / 2 },
          object,
        },
        distance,
      })),
      ...reachableDrops(state.survivor.position, state.droppedItems).map(({ drop, distance }) => ({
        target: { kind: 'drop' as const, id: drop.item.id, position: drop.position, item: drop.item },
        distance,
      })),
    ];
  }

  function getInteractionTarget() {
    const candidates = interactionCandidates();
    candidates.sort((first, second) => {
      const difference = first.distance - second.distance;
      if (Math.abs(difference) > 1e-9) return difference;
      if (first.target.kind !== second.target.kind) return first.target.kind === 'drop' ? -1 : 1;
      if (first.target.id === second.target.id) return 0;
      return first.target.id < second.target.id ? -1 : 1;
    });
    return candidates[0]?.target ?? null;
  }

  function interact(displayed: InteractionTarget): InteractionResult {
    const target = interactionCandidates().find(({ target }) =>
      target.kind === displayed.kind && target.id === displayed.id)?.target;
    if (!target) return { status: 'unavailable' };

    if (target.kind === 'container') {
      openContainer = target.object;
      pause.setForegroundPanel('loot');
      return { status: 'searched' };
    }

    const slot = state.survivor.inventory.indexOf(null);
    if (slot < 0) return { status: 'inventory_full' };

    const inventory = [...state.survivor.inventory];
    inventory[slot] = target.item;
    state = {
      ...state,
      survivor: { ...state.survivor, inventory },
      droppedItems: state.droppedItems.filter(({ item }) => item.id !== target.id),
    };
    notify();
    return { status: 'picked_up', slot };
  }

  function closeMap() {
    if (pause.getPauseState().foregroundPanel === 'map') pause.setForegroundPanel(null);
  }

  function closeInventoryPanel() {
    const { foregroundPanel, savePending, tabHidden } = pause.getPauseState();
    if (!savePending && !tabHidden && (foregroundPanel === 'inventory' || foregroundPanel === 'loot')) {
      pause.setForegroundPanel(null);
    }
  }

  function isInventoryAvailable() {
    const { foregroundPanel, tabHidden, savePending } = pause.getPauseState();
    return state.survivor.health > 0 && !tabHidden && !savePending
      && (foregroundPanel === 'inventory' || (foregroundPanel === 'loot' && openContainer !== null));
  }

  function advanceSimulation(deltaMs: number) {
    const previous = state.survivor;
    const { walkSpeed, sprintSpeed, sprintDrainPerMs, staminaRecoveryPerMs } = movementConfig;
    const timeToExhaustion = previous.stamina / sprintDrainPerMs;
    const sprintMs = sprintRequested && !previous.attack ? Math.min(deltaMs, timeToExhaustion) : 0;
    const sprintPosition = travel(previous.position, direction, sprintSpeed * sprintMs / 1000);
    const sprinting = sprintPosition !== previous.position;
    const stepSpeed = previous.attack ? batConfig.stepSpeed : walkSpeed;
    const nextPosition = travel(sprintPosition, direction, stepSpeed * (deltaMs - sprintMs) / 1000);

    const exhausted = sprinting && sprintMs >= timeToExhaustion;
    const stamina = sprinting
      ? exhausted ? 0 : previous.stamina - sprintMs * sprintDrainPerMs
      : Math.min(100, previous.stamina + deltaMs * staminaRecoveryPerMs);
    if (exhausted) sprintRequested = false;

    const traveled = Math.hypot(nextPosition.x - previous.position.x, nextPosition.y - previous.position.y);
    const facing = previous.attack?.direction ?? aimFrom(previous.position, nextPosition) ?? previous.facing;
    const activeTimeMs = state.activeTimeMs + deltaMs;
    const approached = zombies.map((zombie) => zombie.step(nextPosition, deltaMs, activeTimeMs));
    let attack = advanceAttack(previous.attack, deltaMs, batConfig);
    if (attack?.phase === 'contact' && previous.attack?.phase === 'windup') {
      const target = selectBatTarget(nextPosition, attack.direction, approached);
      if (target) {
        zombies.find((zombie) => zombie.getState() === target)!.receiveBatHit(nextPosition, activeTimeMs);
        attack = { ...attack, damageApplied: true };
      }
    }
    const biteDamage = zombies.reduce((total, zombie, index) => {
      if (state.zombies[index]!.attack?.phase !== 'windup' || approached[index]!.attack?.phase !== 'contact') return total;
      return total + zombie.resolveBite(nextPosition);
    }, 0);
    const health = Math.max(0, previous.health - biteDamage);
    state = {
      ...state,
      survivor: {
        ...previous,
        position: nextPosition,
        health,
        lastBiteAtMs: biteDamage > 0 ? activeTimeMs : previous.lastBiteAtMs,
        gait: traveled === 0 || health === 0 ? 'idle' : sprinting && !exhausted ? 'sprint' : 'walk',
        facing,
        facingLeft: Math.abs(facing.x - facing.y) > 0.0001 ? facing.x < facing.y : previous.facingLeft,
        attack: health > 0 ? attack : null,
        walkDistance: previous.walkDistance + traveled,
        stamina,
      },
      zombies: zombies.map((zombie) => zombie.getState()),
      occupiedHouseId: getHouseAt(nextPosition, state.occupiedHouseId),
      activeTimeMs,
    };
  }

  function step(deltaMs: number): GameState {
    if (pause.getPauseState().isPaused || state.survivor.health <= 0) return state;
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return state;

    let remaining = deltaMs;
    while (remaining > 0 && state.survivor.health > 0) {
      let elapsed = Math.min(remaining, state.survivor.attack?.remainingMs ?? remaining);
      for (const { attack } of state.zombies) {
        if (attack) elapsed = Math.min(elapsed, attack.remainingMs);
      }
      advanceSimulation(elapsed);
      remaining -= elapsed;
    }
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
    setMovement(screenDirection, sprintHeld = false) {
      if (pause.getPauseState().isPaused || state.survivor.health <= 0) return;
      const input = unproject(screenDirection);
      const magnitude = Math.hypot(input.x, input.y);
      direction = Number.isFinite(magnitude) && magnitude > 0
        ? { x: input.x / magnitude, y: input.y / magnitude } : { x: 0, y: 0 };

      if (!sprintHeld) sprintRequested = false;
      if (sprintHeld && !shiftHeld) sprintRequested = state.survivor.stamina >= movementConfig.minimumSprintStamina;
      shiftHeld = sprintHeld;
    },
    step,
    startBatSwing(target) {
      const { survivor } = state;
      if (pause.getPauseState().isPaused || !survivor.equippedWeaponId || survivor.attack || survivor.health <= 0
          || !Number.isFinite(target.x) || !Number.isFinite(target.y)) return false;

      const facing = aimFrom(survivor.position, target) ?? survivor.facing;
      state = {
        ...state,
        survivor: {
          ...survivor,
          gait: survivor.gait === 'sprint' ? 'walk' : survivor.gait,
          facing,
          facingLeft: Math.abs(facing.x - facing.y) > 0.0001 ? facing.x < facing.y : survivor.facingLeft,
          attack: beginAttack(facing, batConfig),
        },
      };
      notify();
      return true;
    },
    getInteractionTarget,
    interact,
    getSearchTarget() {
      const target = getInteractionTarget();
      return target?.kind === 'container' ? target.object : null;
    },
    getOpenContainer: () => openContainer,
    search(containerId) {
      const target = getInteractionTarget();
      return target?.kind === 'container' && target.id === containerId && interact(target).status === 'searched';
    },
    transferItem(containerId, itemId) {
      if (!isInventoryAvailable() || openContainer?.name !== containerId
          || !getReachableContainers().some(({ object }) => object.name === containerId)) {
        return { status: 'unavailable' };
      }
      const items = state.containers[containerId]!;
      const itemIndex = items.findIndex((item) => item.id === itemId);
      if (itemIndex < 0) return { status: 'unavailable' };
      const slot = state.survivor.inventory.indexOf(null);
      if (slot < 0) return { status: 'inventory_full' };

      const inventory = [...state.survivor.inventory];
      inventory[slot] = items[itemIndex]!;
      state = {
        ...state,
        survivor: { ...state.survivor, inventory },
        containers: { ...state.containers, [containerId]: [...items.slice(0, itemIndex), ...items.slice(itemIndex + 1)] },
      };
      notify();
      return { status: 'transferred', slot };
    },
    toggleMap() {
      if (pause.getPauseState().foregroundPanel === 'map') closeMap();
      else if (state.survivor.health > 0) pause.setForegroundPanel('map');
    },
    closeMap,
    toggleInventory() {
      if (pause.getPauseState().foregroundPanel === 'inventory') closeInventoryPanel();
      else if (state.survivor.health > 0) pause.setForegroundPanel('inventory');
    },
    closeInventoryPanel,
    toggleEquip(slot, itemId) {
      const item = state.survivor.inventory[slot];
      if (!isInventoryAvailable() || state.survivor.attack || !item || item.id !== itemId || item.kind !== 'baseball_bat') return false;
      const equippedWeaponId = state.survivor.equippedWeaponId === itemId ? null : itemId;
      state = { ...state, survivor: { ...state.survivor, equippedWeaponId } };
      notify();
      return true;
    },
    dropItem(slot, itemId) {
      const { survivor } = state;
      const item = survivor.inventory[slot];
      if (!isInventoryAvailable() || !item || item.id !== itemId) return { status: 'unavailable' };
      if (survivor.attack && survivor.equippedWeaponId === itemId) return { status: 'swing_in_progress' };

      const position = findDropPosition(survivor.position, state.droppedItems);
      if (!position) return { status: 'cannot_drop' };

      const inventory = [...survivor.inventory];
      inventory[slot] = null;
      state = {
        ...state,
        survivor: {
          ...survivor,
          inventory,
          equippedWeaponId: survivor.equippedWeaponId === itemId ? null : survivor.equippedWeaponId,
        },
        droppedItems: [...state.droppedItems, { item, position }],
      };
      notify();
      return { status: 'dropped' };
    },
  };
}
