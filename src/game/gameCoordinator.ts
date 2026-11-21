import { advanceAttack, aimFrom, batConfig, beginAttack, selectMeleeTarget, shoveConfig } from './combat.ts';
import type { AttackState } from './combat.ts';
import { actorRadius, contains, createTraversal, hasLineOfSight, houses, initiallyClosed, openings, overlapsOpening, survivorSpawn, unproject } from './world.ts';
import type { MapObject, WorldPoint } from './world.ts';
import { createGamePause } from './gamePause.ts';
import {
  authoredStock, baseCarryCapacity, carriedLoad, findDropPosition, inventoryQuickSlotCount, itemDefinitions,
  reachableContainers, reachableDrops, seedContainers,
} from './items.ts';
import type { ConsumableStat, ContainerContents, ContainerStock, DroppedItem, ItemInstance } from './items.ts';
import { createZombies, restoreZombies, zombieConfig } from './zombie.ts';
import type { WorldSound, ZombieSpawn, ZombieState } from './zombie.ts';
import { getSurvivalStep, neighborhoodDarkness } from './survival.ts';
import { advanceDoorPressure, doorStrain, findClosedDoorApproach, openingCenter } from './shelter.ts';
import type { DoorDefenses, DoorStrain } from './shelter.ts';

export type SurvivorId = 'survivor_male' | 'survivor_female';

export interface GameOverResult {
  readonly survivorId: SurvivorId;
  readonly finalActiveTimeMs: number;
}

export interface GameState {
  readonly survivor: {
    readonly characterId: SurvivorId;
    readonly position: WorldPoint;
    readonly health: number;
    readonly lastBiteAtMs: number | null;
    readonly bleeding: boolean;
    readonly stamina: number;
    readonly hunger: number;
    readonly thirst: number;
    readonly inventory: readonly (ItemInstance | null)[];
    readonly equippedWeaponId: string | null;
    readonly equippedPackId: string | null;
    readonly gait: 'idle' | 'sneak' | 'walk' | 'sprint';
    readonly facingLeft: boolean;
    readonly facing: WorldPoint;
    readonly attack: AttackState | null;
    readonly walkDistance: number;
  };
  readonly zombies: readonly ZombieState[];
  readonly containers: ContainerContents;
  readonly droppedItems: readonly DroppedItem[];
  readonly occupiedHouseId: string | null;
  readonly closedOpeningIds: readonly string[];
  readonly doorDefenses: DoorDefenses;
  readonly activeTimeMs: number;
  readonly gameOver: GameOverResult | null;
}

export interface GameSnapshot {
  readonly survivor: Omit<GameState['survivor'], 'gait' | 'equippedPackId'> & { readonly equippedPackId?: string | null };
  readonly zombies: GameState['zombies'];
  readonly containers: ContainerContents;
  readonly droppedItems: GameState['droppedItems'];
  readonly activeTimeMs: number;
  readonly occupiedHouseId?: string | null;
  readonly closedOpeningIds?: readonly string[];
  readonly doorDefenses?: DoorDefenses;
}

export interface GameCoordinator extends ReturnType<typeof createGamePause> {
  getState(): GameState;
  subscribe(listener: () => void): () => void;
  setMovement(screenDirection: WorldPoint, sprintHeld?: boolean, sneakHeld?: boolean): void;
  setReady(held: boolean): void;
  isReady(): boolean;
  isSneaking(): boolean;
  canSee(position: WorldPoint): boolean;
  listenAt(position: WorldPoint, reach: number): { volume: number; muffled: boolean } | null;
  aimAt(target: WorldPoint | null): void;
  step(deltaMs: number): GameState;
  startBatSwing(target: WorldPoint): boolean;
  startShove(): boolean;
  getInteractionTarget(): InteractionTarget | null;
  interact(displayed: InteractionTarget): InteractionResult;
  getSearchTarget(): MapObject | null;
  getOpenContainer(): MapObject | null;
  search(containerId: string): boolean;
  transferItem(containerId: string, itemId: string): TransferResult;
  moveInventoryItem(from: number, itemId: string, to: number): boolean;
  activateQuickSlot(slot: number, itemId: string): 'equipped' | 'inspect' | 'unavailable';
  toggleMap(): void;
  closeMap(): void;
  toggleInventory(): void;
  closeInventoryPanel(): void;
  toggleEquip(slot: number, itemId: string): boolean;
  togglePack(slot: number, itemId: string): 'equipped' | 'unequipped' | 'too_heavy' | 'unavailable';
  getItemUse(slot: number, itemId: string): ItemUse;
  useItem(slot: number, itemId: string): UseResult;
  dropItem(slot: number, itemId: string): DropResult;
}

export type InteractionTarget =
  | { kind: 'container'; id: string; position: WorldPoint; object: MapObject }
  | { kind: 'opening'; id: string; position: WorldPoint; object: MapObject; closed: boolean; wedged: boolean; strain: DoorStrain }
  | { kind: 'drop'; id: string; position: WorldPoint; item: ItemInstance };

type InteractionResult =
  | { status: 'searched' }
  | { status: 'picked_up'; slot: number }
  | { status: 'opening_changed' | 'opening_blocked' | 'inventory_full' | 'too_heavy' | 'unavailable' };

const interactionPriority = { drop: 0, container: 1, opening: 2 };

type UseRejection = { status: 'no_benefit'; reason: string } | { status: 'unavailable' };
type ItemUse = { status: 'eligible'; stat: ConsumableStat; value: number } | { status: 'eligible'; door: MapObject } | UseRejection;
type UseResult = { status: 'used'; stat: ConsumableStat; value: number } | { status: 'wedged' } | UseRejection;

type DropResult = { status: 'dropped' | 'cannot_drop' | 'swing_in_progress' | 'too_heavy' | 'unavailable' };

type TransferResult =
  | { status: 'transferred'; slot: number }
  | { status: 'inventory_full' | 'too_heavy' | 'unavailable' };

const movementConfig = {
  walkSpeed: 2.55,
  sneakSpeed: 1.38,
  readyForwardSpeed: 1.86,
  readySideSpeed: 1.59,
  readyBackSpeed: 1.25,
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

function move(position: WorldPoint, dx: number, dy: number, canStep: (from: WorldPoint, to: WorldPoint) => boolean): WorldPoint {
  const straight = { x: position.x + dx, y: position.y + dy };
  if (canStep(position, straight)) return straight;

  // Sliding follows the walkable axis at a wall instead of catching its corners.
  const horizontal = { x: straight.x, y: position.y };
  const vertical = { x: position.x, y: straight.y };
  const alternatives = Math.abs(dx) >= Math.abs(dy)
    ? [horizontal, vertical]
    : [vertical, horizontal];
  return alternatives.find((candidate) => canStep(position, candidate)) ?? position;
}

function travel(position: WorldPoint, direction: WorldPoint, distance: number, canStep: (from: WorldPoint, to: WorldPoint) => boolean): WorldPoint {
  if (distance <= 0 || (!direction.x && !direction.y)) return position;

  const steps = Math.ceil(distance / movementConfig.maxCollisionStep);
  const stride = distance / steps;
  let current = position;
  for (let index = 0; index < steps; index += 1) {
    const next = move(current, direction.x * stride, direction.y * stride, canStep);
    if (next.x === current.x && next.y === current.y) break;
    current = next;
  }
  return current;
}

export function restoreGameCoordinator(snapshot: GameSnapshot): GameCoordinator {
  return makeGameCoordinator({ position: snapshot.survivor.position }, snapshot);
}

type FreshRunOptions = {
  position?: WorldPoint;
  characterId?: SurvivorId;
  zombieSpawns?: readonly ZombieSpawn[];
  containerStock?: ContainerStock;
};

export function createGameCoordinator(options: FreshRunOptions = {}): GameCoordinator {
  return makeGameCoordinator(options);
}

function makeGameCoordinator({
  position = survivorSpawn,
  characterId = 'survivor_male',
  zombieSpawns,
  containerStock = authoredStock,
}: FreshRunOptions, snapshot?: GameSnapshot): GameCoordinator {
  let closed = openings.filter(({ name }) => (snapshot?.closedOpeningIds ?? initiallyClosed).includes(name));
  const traversal = {
    ...createTraversal(() => closed),
    findClosedDoorApproach: (origin: WorldPoint, target: WorldPoint) => findClosedDoorApproach(closed, origin, target),
  };
  if (!traversal.canOccupy(position)) throw new Error('The survivor must start on walkable ground');
  const zombies = snapshot ? restoreZombies(snapshot.zombies, snapshot.activeTimeMs, traversal) : createZombies(zombieSpawns, traversal);
  let state: GameState = {
    survivor: snapshot ? { ...snapshot.survivor, equippedPackId: snapshot.survivor.equippedPackId ?? null, gait: 'idle' } : {
      characterId,
      position: { ...position },
      health: 100,
      lastBiteAtMs: null,
      bleeding: false,
      stamina: 100,
      hunger: 0,
      thirst: 0,
      inventory: Array<ItemInstance | null>(12).fill(null),
      equippedWeaponId: null,
      equippedPackId: null,
      gait: 'idle',
      facingLeft: false,
      facing: { x: 1, y: 0 },
      attack: null,
      walkDistance: 0,
    },
    zombies: zombies.map((zombie) => zombie.getState()),
    containers: snapshot?.containers ?? seedContainers(containerStock),
    droppedItems: snapshot?.droppedItems ?? [],
    occupiedHouseId: getHouseAt(position, snapshot?.occupiedHouseId),
    closedOpeningIds: closed.map(({ name }) => name),
    doorDefenses: snapshot?.doorDefenses ?? {},
    activeTimeMs: snapshot?.activeTimeMs ?? 0,
    gameOver: null,
  };
  let direction: WorldPoint = { x: 0, y: 0 };
  let shiftHeld = false;
  let sneakHeld = false;
  let ready = false;
  let sprintRequested = false;
  let pointerTarget: WorldPoint | null = null;
  let openContainer: MapObject | null = null;
  let wasPaused = false;
  const listeners = new Set<() => void>();

  function notify() {
    for (const listener of listeners) listener();
  }

  function clearMovement() {
    direction = { x: 0, y: 0 };
    shiftHeld = false;
    sneakHeld = false;
    ready = false;
    sprintRequested = false;
  }

  const pause = createGamePause(() => {
    const { isPaused, foregroundPanel } = pause.getPauseState();
    if (foregroundPanel !== 'loot') openContainer = null;
    if (isPaused) {
      clearMovement();
      pointerTarget = null;
    } else if (wasPaused) {
      for (const zombie of zombies) zombie.rebuildNavigation(state.activeTimeMs);
    }
    wasPaused = isPaused;
    notify();
  });

  function getReachableContainers() {
    return reachableContainers(state.survivor.position, state.occupiedHouseId, state.containers, traversal.hasLineOfSight);
  }

  function emitSound(sound: WorldSound) {
    for (const zombie of zombies) zombie.hear(sound);
  }

  function canSee(position: WorldPoint) {
    const survivor = state.survivor;
    const dx = position.x - survivor.position.x;
    const dy = position.y - survivor.position.y;
    const distance = Math.hypot(dx, dy);
    const range = 11 - 4 * neighborhoodDarkness(state.activeTimeMs);
    const heading = survivor.facing.x * dx + survivor.facing.y * dy;
    const peripheralRange = heading >= .12 * distance ? range : heading >= -.42 * distance ? 4.25 : 1.55;
    return distance <= Math.min(range, peripheralRange) && traversal.hasLineOfSight(survivor.position, position);
  }

  function listenAt(position: WorldPoint, reach: number) {
    const origin = state.survivor.position;
    const distance = Math.hypot(position.x - origin.x, position.y - origin.y);
    if (distance >= reach) return null;
    const muffled = !traversal.hasLineOfSight(origin, position);
    return { volume: (1 - distance / reach) * (muffled ? .55 : 1), muffled };
  }

  function openingDistance(object: MapObject, origin: WorldPoint, center = openingCenter(object)) {
    const dx = center.x - origin.x;
    const dy = center.y - origin.y;
    const [across, along] = object.height > object.width ? [dx, dy] : [dy, dx];
    const approachReach = object.type === 'door' ? 1.65 : 1.08;
    if (Math.hypot(across / approachReach, along / 1.08) > 1
      || !hasLineOfSight(origin, center, closed.filter((opening) => opening !== object))) return Infinity;
    return Math.hypot(dx, dy);
  }

  function canCarry(item: ItemInstance) {
    const { inventory, equippedPackId } = state.survivor;
    const { weight, capacity } = carriedLoad(inventory, equippedPackId);
    return weight + itemDefinitions[item.kind].weight <= capacity + 1e-9;
  }

  function interactionCandidates(): { target: InteractionTarget; distance: number }[] {
    if (pause.getPauseState().isPaused || state.gameOver) return [];
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
      ...reachableDrops(state.survivor.position, state.droppedItems, traversal.hasLineOfSight).map(({ drop, distance }) => ({
        target: { kind: 'drop' as const, id: drop.item.id, position: drop.position, item: drop.item },
        distance,
      })),
      ...openings.flatMap((object) => {
        const point = openingCenter(object);
        const distance = openingDistance(object, state.survivor.position, point);
        if (!Number.isFinite(distance)) return [];
        const defense = state.doorDefenses[object.name];
        const target = {
          kind: 'opening' as const, id: object.name, position: point, object,
          closed: closed.includes(object), wedged: defense?.wedged ?? false, strain: doorStrain(defense),
        };
        return [{ target, distance }];
      }),
    ];
  }

  function getInteractionTarget() {
    const candidates = interactionCandidates();
    candidates.sort((first, second) => {
      const difference = first.distance - second.distance;
      if (Math.abs(difference) > 1e-9) return difference;
      if (first.target.kind !== second.target.kind) return interactionPriority[first.target.kind] - interactionPriority[second.target.kind];
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
    if (target.kind === 'opening') {
      if (displayed.kind !== 'opening' || displayed.closed !== target.closed) return { status: 'unavailable' };
      if (!target.closed && (overlapsOpening(state.survivor.position, target.object)
          || state.zombies.some((actor) => actor.health > 0 && overlapsOpening(actor.position, target.object))
          || state.droppedItems.some(({ position }) => overlapsOpening(position, target.object, .17)))) return { status: 'opening_blocked' };
      closed = target.closed ? closed.filter((opening) => opening !== target.object) : [...closed, target.object];
      const { [target.id]: _cleared, ...doorDefenses } = state.doorDefenses;
      emitSound({ position: target.position, reach: target.object.type === 'window' ? 4 : 3 });
      state = { ...state, doorDefenses, closedOpeningIds: closed.map(({ name }) => name), zombies: zombies.map((actor) => actor.getState()) };
      notify();
      return { status: 'opening_changed' };
    }

    const slot = state.survivor.inventory.indexOf(null);
    if (slot < 0) return { status: 'inventory_full' };
    if (!canCarry(target.item)) return { status: 'too_heavy' };

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
    return !state.gameOver && !tabHidden && !savePending
      && (foregroundPanel === 'inventory' || (foregroundPanel === 'loot' && openContainer !== null));
  }

  function changeEquippedWeapon(itemId: string | null) {
    if (itemId === state.survivor.equippedWeaponId) return;
    state = { ...state, survivor: { ...state.survivor, equippedWeaponId: itemId } };
    notify();
  }

  function getItemUse(slot: number, itemId: string): ItemUse {
    const { survivor } = state;
    const item = survivor.inventory[slot];
    if (!isInventoryAvailable() || !item || item.id !== itemId) {
      return { status: 'unavailable' };
    }
    if (item.kind === 'door_wedge') {
      const door = closed.filter((object) => object.type === 'door' && state.occupiedHouseId
        && object.name.startsWith(state.occupiedHouseId + '_'))
        .map((object) => ({ object, distance: openingDistance(object, survivor.position) }))
        .filter(({ distance }) => Number.isFinite(distance)).sort((a, b) => a.distance - b.distance)[0]?.object;
      if (!door) return { status: 'no_benefit', reason: 'Stand inside beside a closed door.' };
      if (state.doorDefenses[door.name]?.wedged) return { status: 'no_benefit', reason: 'This door is already wedged.' };
      return { status: 'eligible', door };
    }
    const definition = itemDefinitions[item.kind];
    if (!('use' in definition)) return { status: 'unavailable' };
    const { stat, change, noBenefit } = definition.use;
    const value = Math.min(100, Math.max(0, survivor[stat] + change));
    if (value === survivor[stat]) return { status: 'no_benefit', reason: noBenefit };
    return { status: 'eligible', stat, value };
  }

  function advanceSimulation({ elapsedMs: deltaMs, needDamage, hunger, thirst }: ReturnType<typeof getSurvivalStep>) {
    const previous = state.survivor;
    const livingBodies = state.zombies.filter(({ health }) => health > 0);
    const canStep = (from: WorldPoint, to: WorldPoint) => traversal.canOccupy(to) && livingBodies.every(({ position }) => {
      const separation = Math.hypot(to.x - position.x, to.y - position.y);
      // Permit separation if a saved or approaching body already overlaps the survivor.
      return separation >= 2 * actorRadius || separation > Math.hypot(from.x - position.x, from.y - position.y);
    });
    const { walkSpeed, sprintSpeed, readyForwardSpeed, readySideSpeed, readyBackSpeed } = movementConfig;
    const { exertion } = carriedLoad(previous.inventory, previous.equippedPackId);
    const sprintDrain = movementConfig.sprintDrainPerMs * (1 + .45 * exertion);
    const recovery = movementConfig.staminaRecoveryPerMs * (1 - .30 * exertion);
    const timeToExhaustion = previous.stamina / sprintDrain;
    const shoving = previous.attack?.kind === 'shove';
    const timing = shoving ? shoveConfig : batConfig;
    const sprintMs = sprintRequested && !previous.attack && !sneakHeld && !ready ? Math.min(deltaMs, timeToExhaustion) : 0;
    const sprintPosition = travel(previous.position, direction, sprintSpeed * sprintMs / 1000, canStep);
    const sprinting = sprintPosition !== previous.position;
    const readyFacing = (pointerTarget && aimFrom(previous.position, pointerTarget)) ?? previous.facing;
    const heading = direction.x * readyFacing.x + direction.y * readyFacing.y;
    const readySpeed = readySideSpeed + (heading >= 0 ? readyForwardSpeed - readySideSpeed : readySideSpeed - readyBackSpeed) * heading;
    const stepSpeed = previous.attack ? timing.stepSpeed
      : sneakHeld ? movementConfig.sneakSpeed : ready ? readySpeed : walkSpeed;
    const nextPosition = travel(sprintPosition, direction, stepSpeed * (deltaMs - sprintMs) / 1000, canStep);

    const exhausted = sprinting && sprintMs >= timeToExhaustion;
    const stamina = sprinting
      ? exhausted ? 0 : previous.stamina - sprintMs * sprintDrain
      : shoving ? previous.stamina : Math.min(100, previous.stamina + deltaMs * recovery);
    if (exhausted) sprintRequested = false;

    const traveled = Math.hypot(nextPosition.x - previous.position.x, nextPosition.y - previous.position.y);
    const facing = previous.attack?.direction ?? (pointerTarget
      ? aimFrom(nextPosition, pointerTarget)
      : ready ? readyFacing : aimFrom(previous.position, nextPosition)) ?? previous.facing;
    const activeTimeMs = state.activeTimeMs + deltaMs;
    let attack = advanceAttack(previous.attack, deltaMs, timing);
    const swingContact = attack?.phase === 'contact' && previous.attack?.phase === 'windup';
    if (swingContact) emitSound({ position: nextPosition, reach: attack?.kind === 'shove' ? 2.9 : 6.8 });
    else if (traveled > 0 && Math.floor(activeTimeMs / 420) !== Math.floor(state.activeTimeMs / 420)) {
      emitSound({ position: nextPosition, reach: sprinting ? 8.5 : sneakHeld ? .65 : 1.7 });
    }
    const sightRange = zombieConfig.detectionDistance - 2.1 * neighborhoodDarkness(activeTimeMs) - (sneakHeld ? 1.7 : 0);
    const approached = zombies.map((zombie) => zombie.step(nextPosition, deltaMs, activeTimeMs, sightRange));
    if (swingContact && attack) {
      const target = selectMeleeTarget(nextPosition, attack.direction, approached, traversal.hasLineOfSight, timing);
      if (target) {
        const zombie = zombies.find((zombie) => zombie.getState() === target)!;
        if (attack.kind === 'shove') zombie.receiveShove(nextPosition);
        else zombie.receiveBatHit(nextPosition, activeTimeMs);
        attack = { ...attack, damageApplied: true };
      }
    }
    const biteDamage = zombies.reduce((total, zombie, index) => {
      if (state.zombies[index]!.attack?.phase !== 'windup' || approached[index]!.attack?.phase !== 'contact') return total;
      return total + zombie.resolveBite(nextPosition);
    }, 0);
    const health = Math.max(0, previous.health - needDamage - biteDamage);
    const gameOver = health === 0 ? { survivorId: previous.characterId, finalActiveTimeMs: activeTimeMs } : null;
    const zombieStates = zombies.map((zombie) => zombie.getState());
    const doors = advanceDoorPressure(closed, state.doorDefenses, zombieStates, deltaMs);
    const openingsChanged = closed !== doors.closed;
    if (openingsChanged) {
      closed = [...doors.closed];
      for (const zombie of zombies) zombie.rebuildNavigation(activeTimeMs);
    }
    state = {
      ...state,
      survivor: {
        ...previous,
        position: nextPosition,
        health,
        lastBiteAtMs: biteDamage > 0 ? activeTimeMs : previous.lastBiteAtMs,
        bleeding: previous.bleeding || biteDamage > 0,
        gait: traveled === 0 || health === 0 ? 'idle' : sprinting && !exhausted ? 'sprint' : sneakHeld ? 'sneak' : 'walk',
        facing,
        facingLeft: Math.abs(facing.x - facing.y) > 0.0001 ? facing.x < facing.y : previous.facingLeft,
        attack: health > 0 ? attack : null,
        walkDistance: previous.walkDistance + traveled,
        stamina,
        hunger,
        thirst,
      },
      zombies: zombieStates,
      doorDefenses: doors.defenses,
      closedOpeningIds: openingsChanged ? closed.map(({ name }) => name) : state.closedOpeningIds,
      occupiedHouseId: getHouseAt(nextPosition, state.occupiedHouseId),
      activeTimeMs,
      gameOver,
    };
    if (gameOver) {
      clearMovement();
      openContainer = null;
    }
  }

  function step(deltaMs: number): GameState {
    if (pause.getPauseState().isPaused || state.gameOver) return state;
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return state;

    let remaining = deltaMs;
    while (remaining > 0 && !state.gameOver) {
      let elapsed = Math.min(remaining, state.survivor.attack?.remainingMs ?? remaining);
      for (const { attack } of state.zombies) {
        if (attack) elapsed = Math.min(elapsed, attack.remainingMs);
      }
      const survivalStep = getSurvivalStep(state.survivor, elapsed);
      advanceSimulation(survivalStep);
      remaining -= survivalStep.elapsedMs;
    }
    if (!ready) pointerTarget = null;
    notify();
    return state;
  }

  return {
    ...pause,
    handleEscape() {
      if (!state.gameOver) pause.handleEscape();
    },
    setForegroundPanel(panel) {
      if (!state.gameOver) pause.setForegroundPanel(panel);
    },
    setTabHidden(hidden) {
      if (!state.gameOver) pause.setTabHidden(hidden);
    },
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    setMovement(screenDirection, sprintHeld = false, crouchHeld = false) {
      if (pause.getPauseState().isPaused || state.gameOver) return;
      const input = unproject(screenDirection);
      const magnitude = Math.hypot(input.x, input.y);
      direction = Number.isFinite(magnitude) && magnitude > 0
        ? { x: input.x / magnitude, y: input.y / magnitude } : { x: 0, y: 0 };

      if (!sprintHeld) sprintRequested = false;
      if (sprintHeld && !shiftHeld) sprintRequested = state.survivor.stamina >= movementConfig.minimumSprintStamina;
      shiftHeld = sprintHeld;
      sneakHeld = crouchHeld;
    },
    setReady(held) {
      if (!held && ready) pointerTarget = null;
      ready = held && !pause.getPauseState().isPaused && !state.gameOver;
    },
    isReady: () => ready,
    isSneaking: () => sneakHeld,
    canSee,
    listenAt,
    aimAt(target) {
      if (pause.getPauseState().isPaused || state.gameOver || state.survivor.attack) return;
      if (target && (!Number.isFinite(target.x) || !Number.isFinite(target.y))) return;
      pointerTarget = target;
    },
    step,
    startBatSwing(target) {
      const { survivor } = state;
      if (pause.getPauseState().isPaused || !survivor.equippedWeaponId || survivor.attack || state.gameOver
          || !Number.isFinite(target.x) || !Number.isFinite(target.y)) return false;

      const facing = aimFrom(survivor.position, target)
        ?? (pointerTarget && aimFrom(survivor.position, pointerTarget)) ?? survivor.facing;
      if (!ready) pointerTarget = null;
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
    startShove() {
      const { survivor } = state;
      if (pause.getPauseState().isPaused || state.gameOver || survivor.attack || survivor.stamina < shoveConfig.staminaCost) return false;
      const facing = (pointerTarget && aimFrom(survivor.position, pointerTarget)) ?? survivor.facing;
      if (!ready) pointerTarget = null;
      state = { ...state, survivor: {
        ...survivor, stamina: survivor.stamina - shoveConfig.staminaCost,
        gait: survivor.gait === 'sprint' ? 'walk' : survivor.gait, facing,
        facingLeft: Math.abs(facing.x - facing.y) > .0001 ? facing.x < facing.y : survivor.facingLeft,
        attack: { ...beginAttack(facing, shoveConfig), kind: 'shove' },
      } };
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
      if (!canCarry(items[itemIndex]!)) return { status: 'too_heavy' };

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
    moveInventoryItem(from, itemId, to) {
      const { survivor } = state;
      if (!isInventoryAvailable() || !Number.isInteger(from) || !Number.isInteger(to)
          || from < 0 || to < 0 || from >= survivor.inventory.length || to >= survivor.inventory.length
          || from === to || survivor.inventory[from]?.id !== itemId) return false;

      const inventory = [...survivor.inventory];
      [inventory[from], inventory[to]] = [inventory[to]!, inventory[from]!];
      state = { ...state, survivor: { ...survivor, inventory } };
      notify();
      return true;
    },
    activateQuickSlot(slot, itemId) {
      if (pause.getPauseState().isPaused || state.gameOver || !Number.isInteger(slot)
          || slot < 0 || slot >= inventoryQuickSlotCount) return 'unavailable';
      const item = state.survivor.inventory[slot];
      if (!item || item.id !== itemId) return 'unavailable';
      if (item.kind !== 'baseball_bat') return 'inspect';
      if (state.survivor.attack) return 'unavailable';

      changeEquippedWeapon(item.id);
      return 'equipped';
    },
    toggleMap() {
      if (pause.getPauseState().foregroundPanel === 'map') closeMap();
      else if (!state.gameOver) pause.setForegroundPanel('map');
    },
    closeMap,
    toggleInventory() {
      if (pause.getPauseState().foregroundPanel === 'inventory') closeInventoryPanel();
      else if (!state.gameOver) pause.setForegroundPanel('inventory');
    },
    closeInventoryPanel,
    toggleEquip(slot, itemId) {
      const item = state.survivor.inventory[slot];
      if (!isInventoryAvailable() || state.survivor.attack || !item || item.id !== itemId || item.kind !== 'baseball_bat') return false;
      changeEquippedWeapon(state.survivor.equippedWeaponId === itemId ? null : itemId);
      return true;
    },
    togglePack(slot, itemId) {
      const { survivor } = state;
      const item = survivor.inventory[slot];
      if (!isInventoryAvailable() || item?.kind !== 'backpack' || item.id !== itemId) return 'unavailable';
      const equipped = survivor.equippedPackId === itemId;
      if (equipped && carriedLoad(survivor.inventory, null).weight > baseCarryCapacity + 1e-9) return 'too_heavy';
      state = { ...state, survivor: { ...survivor, equippedPackId: equipped ? null : itemId } };
      notify();
      return equipped ? 'unequipped' : 'equipped';
    },
    getItemUse,
    useItem(slot, itemId) {
      const action = getItemUse(slot, itemId);
      if (action.status !== 'eligible') return action;

      const inventory = [...state.survivor.inventory];
      inventory[slot] = null;
      if ('door' in action) {
        const id = action.door.name;
        const doorDefenses = { ...state.doorDefenses, [id]: {
          pressureMs: state.doorDefenses[id]?.pressureMs ?? 0, wedged: true,
        } };
        state = { ...state, doorDefenses, survivor: { ...state.survivor, inventory } };
        notify();
        return { status: 'wedged' };
      }
      const { stat, value } = action;
      state = { ...state, survivor: {
        ...state.survivor, [stat]: value, inventory, bleeding: stat === 'health' ? false : state.survivor.bleeding,
      } };
      notify();
      return { status: 'used', stat, value };
    },
    dropItem(slot, itemId) {
      const { survivor } = state;
      const item = survivor.inventory[slot];
      if (!isInventoryAvailable() || !item || item.id !== itemId) return { status: 'unavailable' };
      if (survivor.attack && survivor.equippedWeaponId === itemId) return { status: 'swing_in_progress' };

      const inventory = [...survivor.inventory];
      inventory[slot] = null;
      if (survivor.equippedPackId === itemId && carriedLoad(inventory, null).weight > baseCarryCapacity + 1e-9) {
        return { status: 'too_heavy' };
      }
      const position = findDropPosition(survivor.position, state.droppedItems, traversal.canOccupy, traversal.hasLineOfSight);
      if (!position) return { status: 'cannot_drop' };

      state = {
        ...state,
        survivor: {
          ...survivor,
          inventory,
          equippedWeaponId: survivor.equippedWeaponId === itemId ? null : survivor.equippedWeaponId,
          equippedPackId: survivor.equippedPackId === itemId ? null : survivor.equippedPackId,
        },
        droppedItems: [...state.droppedItems, { item, position }],
      };
      notify();
      return { status: 'dropped' };
    },
  };
}
