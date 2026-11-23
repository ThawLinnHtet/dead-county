import { advanceAttack, aimFrom, batConfig, beginAttack, equippedMeleeKind, isMeleeWeapon, lowStaminaSwingThreshold, meleeWeapons,
  selectMeleeTarget, shoveConfig } from './combat.ts';
import type { AttackState } from './combat.ts';
import { alderShelter, workshopLock } from './district.ts';
import { actorRadius, contains, createTraversal, hasLineOfSight, houses, initiallyClosed, openings, overlapsOpening, survivorSpawn, unproject } from './world.ts';
import type { MapObject, WorldPoint } from './world.ts';
import { createGamePause } from './gamePause.ts';
import {
  authoredStock, backpackSlots, baseCarryCapacity, carriedLoad, containerSlots, findDropPosition, inventoryQuickSlotCount,
  itemDefinitions, itemWeight, reachableBeds, reachableContainers, reachableDrops, seedContainers,
} from './items.ts';
import type { ConsumableStat, ContainerContents, ContainerStock, DroppedItem, ItemInstance } from './items.ts';
import { createZombies, restoreZombies, zombieConfig } from './zombie.ts';
import type { WorldSound, ZombieSpawn, ZombieState } from './zombie.ts';
import { fatiguePerMs, getNeedWarning, getSurvivalStep, neighborhoodDarkness, plannedSleepMs, sleepRecoveryPerMs, sleepSpeed } from './survival.ts';
import { advanceDoorPressure, doorResistance, doorStrain, findClosedDoorApproach, openingCenter } from './shelter.ts';
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
    readonly fatigue: number;
    readonly inventory: readonly (ItemInstance | null)[];
    readonly equippedWeaponId: string | null;
    readonly equippedPackId: string | null;
    readonly gait: 'idle' | 'sneak' | 'walk' | 'sprint';
    readonly steppingBack: boolean;
    readonly facingLeft: boolean;
    readonly facing: WorldPoint;
    readonly attack: AttackState | null;
    readonly walkDistance: number;
  };
  readonly zombies: readonly ZombieState[];
  readonly containers: ContainerContents;
  readonly packs: ContainerContents;
  readonly sleep: { readonly bedId: string; readonly remainingMs: number } | null;
  readonly restNotice: 'danger' | 'needs' | 'awake' | null;
  readonly droppedItems: readonly DroppedItem[];
  readonly occupiedHouseId: string | null;
  readonly closedOpeningIds: readonly string[];
  readonly lockedDoorIds: readonly string[];
  readonly doorDefenses: DoorDefenses;
  readonly activeTimeMs: number;
  readonly gameOver: GameOverResult | null;
}

export interface GameSnapshot {
  readonly survivor: Omit<GameState['survivor'], 'gait' | 'steppingBack' | 'equippedPackId' | 'fatigue'> & {
    readonly equippedPackId?: string | null;
    readonly fatigue?: number;
  };
  readonly zombies: GameState['zombies'];
  readonly containers: ContainerContents;
  readonly packs?: ContainerContents;
  readonly sleep?: GameState['sleep'];
  readonly droppedItems: GameState['droppedItems'];
  readonly activeTimeMs: number;
  readonly occupiedHouseId?: string | null;
  readonly closedOpeningIds?: readonly string[];
  readonly lockedDoorIds?: readonly string[];
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
  getMeleeAimPreview(): MeleeAimPreview | null;
  getLastBatContact(): BatContact | null;
  step(deltaMs: number): GameState;
  startMeleeSwing(target: WorldPoint): boolean;
  startShove(): boolean;
  getInteractionTarget(): InteractionTarget | null;
  interact(displayed: InteractionTarget): InteractionResult;
  getSearchTarget(): MapObject | null;
  getOpenContainer(): MapObject | null;
  search(containerId: string): boolean;
  transferItem(containerId: string, itemId: string): TransferResult;
  transferStorage(from: StorageLocation, itemId: string, to: StorageLocation): TransferResult;
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

interface BatContact {
  readonly zombieId: string;
  readonly timeMs: number;
  readonly position: WorldPoint;
  readonly origin: WorldPoint;
}

export interface MeleeAimPreview {
  readonly origin: WorldPoint;
  readonly arc: readonly (WorldPoint | null)[];
  readonly center: WorldPoint | null;
  readonly target: Pick<ZombieState, 'id' | 'position'> | null;
  readonly committed: boolean;
}

export type InteractionTarget =
  | { kind: 'container'; id: string; position: WorldPoint; object: MapObject; empty: boolean }
  | { kind: 'bed'; id: string; position: WorldPoint; object: MapObject; sleeping: boolean }
  | { kind: 'opening'; id: string; position: WorldPoint; object: MapObject; closed: boolean; wedged: boolean; strain: DoorStrain;
      barricade: 'inside' | 'outside' | null; lock: 'locked' | 'key' | 'inside' | null }
  | { kind: 'drop'; id: string; position: WorldPoint; item: ItemInstance };

type InteractionResult =
  | { status: 'searched' | 'sleep_changed' }
  | { status: 'picked_up'; slot: number }
  | { status: 'opening_changed' | 'opening_blocked' | 'opening_locked' | 'barricade_removed' | 'barricade_blocked' | 'inventory_full' | 'too_heavy' | 'unavailable' }
  | { status: 'sleep_blocked'; reason: string };

const interactionPriority = { drop: 0, container: 1, opening: 2, bed: 3 };

type UseRejection = { status: 'no_benefit'; reason: string } | { status: 'unavailable' };
type ItemUse = { status: 'eligible'; stat: ConsumableStat; value: number } | { status: 'eligible'; door: MapObject; reinforcement: 'wedged' | 'barricaded' } | UseRejection;
type UseResult = { status: 'used'; stat: ConsumableStat; value: number } | { status: 'wedged' | 'barricaded' } | UseRejection;

type DropResult = { status: 'dropped' | 'cannot_drop' | 'swing_in_progress' | 'too_heavy' | 'pack_too_heavy' | 'unavailable' };

type TransferResult =
  | { status: 'transferred'; slot: number }
  | { status: 'inventory_full' | 'storage_full' | 'too_heavy' | 'unavailable' | 'unequip_first' | 'no_nested_packs' };

export type StorageLocation = { kind: 'inventory' } | { kind: 'pack' | 'container'; id: string };

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
  closedOpeningIds?: readonly string[];
};

export function createGameCoordinator(options: FreshRunOptions = {}): GameCoordinator {
  return makeGameCoordinator(options);
}

function makeGameCoordinator({
  position = survivorSpawn,
  characterId = 'survivor_male',
  zombieSpawns,
  containerStock = authoredStock,
  closedOpeningIds = initiallyClosed,
}: FreshRunOptions, snapshot?: GameSnapshot): GameCoordinator {
  let closed = openings.filter(({ name }) => (snapshot?.closedOpeningIds ?? closedOpeningIds).includes(name));
  const traversal = {
    ...createTraversal(() => closed),
    findClosedDoorApproach: (origin: WorldPoint, target: WorldPoint) => findClosedDoorApproach(closed, origin, target),
  };
  if (!traversal.canOccupy(position)) throw new Error('The survivor must start on walkable ground');
  const zombies = snapshot ? restoreZombies(snapshot.zombies, snapshot.activeTimeMs, traversal) : createZombies(zombieSpawns, traversal);
  let state: GameState = {
    survivor: snapshot ? { ...snapshot.survivor, fatigue: snapshot.survivor.fatigue ?? 0,
      equippedPackId: snapshot.survivor.equippedPackId ?? null, gait: 'idle', steppingBack: false } : {
      characterId,
      position: { ...position },
      health: 100,
      lastBiteAtMs: null,
      bleeding: false,
      stamina: 100,
      hunger: 0,
      thirst: 0,
      fatigue: 0,
      inventory: Array<ItemInstance | null>(12).fill(null),
      equippedWeaponId: null,
      equippedPackId: null,
      gait: 'idle',
      steppingBack: false,
      facingLeft: false,
      facing: { x: 1, y: 0 },
      attack: null,
      walkDistance: 0,
    },
    zombies: zombies.map((zombie) => zombie.getState()),
    containers: snapshot?.containers ?? seedContainers(containerStock),
    packs: snapshot?.packs ?? {},
    sleep: snapshot?.sleep ?? null,
    restNotice: null,
    droppedItems: snapshot?.droppedItems ?? [],
    occupiedHouseId: getHouseAt(position, snapshot?.occupiedHouseId),
    closedOpeningIds: closed.map(({ name }) => name),
    lockedDoorIds: snapshot ? snapshot.lockedDoorIds ?? []
      : closedOpeningIds.includes(workshopLock.doorId) ? [workshopLock.doorId] : [],
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
  let lastBatContact: BatContact | null = null;
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

  function getMeleeAimPreview(): MeleeAimPreview | null {
    const { position: origin, attack, facing } = state.survivor;
    const weapon = equippedMeleeKind(state.survivor);
    if (!ready || !weapon || state.gameOver || state.sleep || pause.getPauseState().isPaused
      || (attack && (attack.kind || attack.phase !== 'windup'))) return null;

    const aim = attack?.direction ?? (pointerTarget && aimFrom(origin, pointerTarget)) ?? facing;
    const timing = meleeWeapons[weapon];
    const heading = Math.atan2(aim.y, aim.x);
    const target = attack ? undefined : selectMeleeTarget(origin, aim, state.zombies, traversal.hasLineOfSight, timing);
    const samples = 20;
    const arc = Array.from({ length: samples + 1 }, (_, index) => {
      const angle = heading + timing.halfArc * (2 * index / samples - 1);
      const point = { x: origin.x + Math.cos(angle) * timing.reach, y: origin.y + Math.sin(angle) * timing.reach };
      return traversal.hasLineOfSight(origin, point) ? point : null;
    });
    const nearCenter = { x: origin.x + aim.x * .35, y: origin.y + aim.y * .35 };
    const center = arc[samples / 2] ?? (traversal.hasLineOfSight(origin, nearCenter) ? nearCenter : null);
    return {
      origin, arc, center, committed: attack !== null,
      target: target && canSee(target.position) ? target : null,
    };
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
    const { weight, capacity } = carriedLoad(inventory, equippedPackId, state.packs);
    return weight + itemWeight(item, state.packs) <= capacity + 1e-9;
  }

  function hasSleepThreat() {
    return state.zombies.some(({ health, position, attack, behavior }) => {
      if (health <= 0) return false;
      const survivor = state.survivor.position;
      const distance = Math.hypot(position.x - survivor.x, position.y - survivor.y);
      return (distance <= 5 && traversal.hasLineOfSight(position, survivor))
        || (distance <= 2.5 && (attack !== null || behavior.kind === 'chase')
          && getHouseAt(position) === state.occupiedHouseId);
    });
  }

  function wakeUp(notice: GameState['restNotice']) {
    state = { ...state, sleep: null, restNotice: notice };
  }

  function hasCriticalNeeds() {
    return getNeedWarning('hunger', state.survivor.hunger) === 'critical'
      || getNeedWarning('thirst', state.survivor.thirst) === 'critical';
  }

  function carries(kind: ItemInstance['kind']) {
    const { inventory, equippedPackId } = state.survivor;
    return inventory.some((item) => item?.kind === kind)
      || (equippedPackId !== null && !!state.packs[equippedPackId]?.some((item) => item.kind === kind));
  }

  function getDoorLock(id: string): Extract<InteractionTarget, { kind: 'opening' }>['lock'] {
    if (id !== workshopLock.doorId || !state.lockedDoorIds.includes(id)) return null;
    if (state.occupiedHouseId === workshopLock.houseId) return 'inside';
    if (carries(workshopLock.keyKind)) return 'key';
    return 'locked';
  }

  function interactionCandidates(): { target: InteractionTarget; distance: number }[] {
    if (pause.getPauseState().isPaused || state.gameOver) return [];
    const beds = reachableBeds(state.survivor.position, state.occupiedHouseId, traversal.hasLineOfSight)
      .flatMap(({ object, distance }) => state.sleep && state.sleep.bedId !== object.name ? [] : [{
        target: { kind: 'bed' as const, id: object.name, position: openingCenter(object), object, sleeping: !!state.sleep },
        distance,
      }]);
    if (state.sleep) return beds;
    return [
      ...beds,
      ...getReachableContainers().map(({ object, distance }) => ({
        target: {
          kind: 'container' as const,
          id: object.name,
          position: { x: object.x + object.width / 2, y: object.y + object.height / 2 },
          object,
          empty: !state.containers[object.name]!.length,
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
          barricade: defense?.barricaded ? (state.occupiedHouseId === alderShelter.houseId ? 'inside' as const : 'outside' as const) : null,
          lock: getDoorLock(object.name),
        };
        return [{ target, distance }];
      }),
    ];
  }

  function getInteractionTarget() {
    const candidates = interactionCandidates();
    const isEmptyStorage = (target: InteractionTarget) => Number(target.kind === 'container' && target.empty);
    candidates.sort((first, second) => {
      // A cupboard with supplies or an existing entrance takes precedence over empty storage.
      const emptyDifference = isEmptyStorage(first.target) - isEmptyStorage(second.target);
      if (emptyDifference) return emptyDifference;
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

    if (target.kind === 'bed') {
      if (displayed.kind !== 'bed' || target.sleeping !== displayed.sleeping) return { status: 'unavailable' };
      if (state.sleep) {
        wakeUp('awake');
      } else {
        const reason = state.survivor.attack ? 'Finish your swing first.'
          : state.survivor.bleeding ? 'Stop the bleeding before sleeping.'
          : hasSleepThreat() ? 'It is too dangerous to sleep here.'
          : hasCriticalNeeds() ? 'Eat or drink before sleeping.'
          : state.survivor.fatigue < 15 ? 'You are too alert to sleep.' : null;
        if (reason) return { status: 'sleep_blocked', reason };
        clearMovement();
        pointerTarget = null;
        state = { ...state, sleep: { bedId: target.id, remainingMs: plannedSleepMs(state.activeTimeMs) }, restNotice: null };
      }
      notify();
      return { status: 'sleep_changed' };
    }

    if (target.kind === 'container') {
      openContainer = target.object;
      pause.setForegroundPanel('loot');
      return { status: 'searched' };
    }
    if (target.kind === 'opening') {
      if (displayed.kind !== 'opening' || displayed.closed !== target.closed || displayed.barricade !== target.barricade) {
        return { status: 'unavailable' };
      }
      if (target.barricade === 'outside') return { status: 'barricade_blocked' };
      if (target.barricade === 'inside') {
        const { [target.id]: defense, ...doorDefenses } = state.doorDefenses;
        const pressureMs = Math.min(defense!.pressureMs, doorResistance() - 1);
        state = { ...state, doorDefenses: pressureMs > 0
          ? { ...doorDefenses, [target.id]: { pressureMs, wedged: false } } : doorDefenses };
        notify();
        return { status: 'barricade_removed' };
      }
      if (target.lock === 'locked') return { status: 'opening_locked' };
      if (!target.closed && (overlapsOpening(state.survivor.position, target.object)
          || state.zombies.some((actor) => actor.health > 0 && overlapsOpening(actor.position, target.object))
          || state.droppedItems.some(({ position }) => overlapsOpening(position, target.object, .17)))) return { status: 'opening_blocked' };
      closed = target.closed ? closed.filter((opening) => opening !== target.object) : [...closed, target.object];
      const { [target.id]: _cleared, ...doorDefenses } = state.doorDefenses;
      emitSound({ position: target.position, reach: target.object.type === 'window' ? 4 : 3 });
      state = {
        ...state, doorDefenses, closedOpeningIds: closed.map(({ name }) => name),
        lockedDoorIds: target.lock ? state.lockedDoorIds.filter((id) => id !== target.id) : state.lockedDoorIds,
        zombies: zombies.map((actor) => actor.getState()),
      };
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

  function transferStorage(from: StorageLocation, itemId: string, to: StorageLocation): TransferResult {
    const { survivor, packs, containers } = state;
    function slots(location: StorageLocation): readonly (ItemInstance | null)[] | undefined {
      switch (location.kind) {
        case 'inventory': return survivor.inventory;
        case 'pack': return location.id === survivor.equippedPackId ? packs[location.id] ?? [] : undefined;
        case 'container': return openContainer?.name === location.id
          && getReachableContainers().some(({ object }) => object.name === location.id) ? containers[location.id] : undefined;
      }
    }
    if (!isInventoryAvailable() || from.kind === to.kind) return { status: 'unavailable' };
    const source = slots(from);
    const destination = slots(to);
    const index = source?.findIndex((item) => item?.id === itemId) ?? -1;
    const item = source?.[index];
    if (!source || !destination || !item) return { status: 'unavailable' };
    if (itemId === survivor.equippedPackId || itemId === survivor.equippedWeaponId) return { status: 'unequip_first' };
    if (to.kind === 'pack' && item.kind === 'backpack') return { status: 'no_nested_packs' };
    const slot = to.kind === 'inventory' ? destination.indexOf(null) : destination.length;
    if (slot < 0) return { status: 'inventory_full' };
    if ((to.kind === 'pack' && slot >= backpackSlots) || (to.kind === 'container' && slot >= containerSlots)) {
      return { status: 'storage_full' };
    }
    if (from.kind === 'container' && !canCarry(item)) return { status: 'too_heavy' };

    const next = {
      inventory: [...survivor.inventory],
      packs: { ...packs },
      containers: { ...containers },
    };
    if (from.kind === 'inventory') next.inventory[index] = null;
    else (from.kind === 'pack' ? next.packs : next.containers)[from.id] =
      source.filter((entry): entry is ItemInstance => entry !== null && entry.id !== itemId);
    if (to.kind === 'inventory') next.inventory[slot] = item;
    else (to.kind === 'pack' ? next.packs : next.containers)[to.id] = [...destination.filter((entry) => entry !== null), item];
    state = { ...state, survivor: { ...survivor, inventory: next.inventory }, packs: next.packs, containers: next.containers };
    notify();
    return { status: 'transferred', slot };
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
      const defense = state.doorDefenses[door.name];
      if (defense?.wedged) return { status: 'no_benefit', reason: 'This door is already wedged.' };
      if (defense?.barricaded) return { status: 'no_benefit', reason: 'This door is already barricaded.' };
      return { status: 'eligible', door, reinforcement: 'wedged' };
    }
    if (item.kind === 'board') {
      const door = closed.find(({ name }) => name === alderShelter.doorId);
      if (!door || state.occupiedHouseId !== alderShelter.houseId
        || !Number.isFinite(openingDistance(door, survivor.position))) {
        return { status: 'no_benefit', reason: 'Stand inside beside the closed front door of Alder House.' };
      }
      const defense = state.doorDefenses[door.name];
      if (defense?.barricaded || defense?.wedged) return { status: 'no_benefit', reason: 'This door is already reinforced.' };
      if (!carries('hammer')) return { status: 'no_benefit', reason: 'Carry a Hammer to use this Board.' };
      return { status: 'eligible', door, reinforcement: 'barricaded' };
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
    const canStep = (from: WorldPoint, to: WorldPoint) => traversal.canTraverse(from, to) && livingBodies.every(({ position }) => {
      const separation = Math.hypot(to.x - position.x, to.y - position.y);
      // Permit separation if a saved or approaching body already overlaps the survivor.
      return separation >= 2 * actorRadius || separation > Math.hypot(from.x - position.x, from.y - position.y);
    });
    const { walkSpeed, sprintSpeed, readyForwardSpeed, readySideSpeed, readyBackSpeed } = movementConfig;
    const { exertion } = carriedLoad(previous.inventory, previous.equippedPackId, state.packs);
    const sprintDrain = movementConfig.sprintDrainPerMs * (1 + .45 * exertion);
    const recovery = movementConfig.staminaRecoveryPerMs * (1 - .30 * exertion)
      * (1 - .45 * Math.max(0, previous.fatigue - 35) / 65);
    const timeToExhaustion = previous.stamina / sprintDrain;
    const shoving = previous.attack?.kind === 'shove';
    const weapon = previous.attack && !shoving ? equippedMeleeKind(previous) : undefined;
    const melee = weapon ? meleeWeapons[weapon] : batConfig;
    const timing = shoving ? shoveConfig : melee;
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
    if (swingContact) emitSound({ position: nextPosition, reach: timing.soundReach });
    else if (traveled > 0 && Math.floor(activeTimeMs / 420) !== Math.floor(state.activeTimeMs / 420)) {
      emitSound({ position: nextPosition, reach: sprinting ? 8.5 : sneakHeld ? .65 : 1.7 });
    }
    const sightRange = zombieConfig.detectionDistance - 2.1 * neighborhoodDarkness(activeTimeMs) - (sneakHeld ? 1.7 : 0);
    const approached = zombies.map((zombie) => zombie.step(nextPosition, deltaMs, activeTimeMs, sightRange));
    if (swingContact && attack) {
      const candidates = shoving ? approached.filter(({ attack }) => attack?.kind !== 'knockdown') : approached;
      const target = selectMeleeTarget(nextPosition, attack.direction, candidates, traversal.hasLineOfSight, timing);
      if (target) {
        const zombie = zombies.find((zombie) => zombie.getState() === target)!;
        if (attack.kind === 'shove') zombie.receiveShove(nextPosition);
        else {
          lastBatContact = { zombieId: target.id, timeMs: activeTimeMs, position: target.position, origin: nextPosition };
          zombie.receiveMeleeHit(nextPosition, activeTimeMs, melee);
        }
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
        steppingBack: traveled > 0 && ready && heading < -.3,
        facing,
        facingLeft: Math.abs(facing.x - facing.y) > 0.0001 ? facing.x < facing.y : previous.facingLeft,
        attack: health > 0 ? attack : null,
        walkDistance: previous.walkDistance + traveled,
        stamina,
        hunger,
        thirst,
        fatigue: state.sleep
          ? Math.max(0, previous.fatigue - deltaMs * sleepRecoveryPerMs)
          : Math.min(100, previous.fatigue + deltaMs * fatiguePerMs),
      },
      zombies: zombieStates,
      doorDefenses: doors.defenses,
      closedOpeningIds: openingsChanged ? closed.map(({ name }) => name) : state.closedOpeningIds,
      lockedDoorIds: openingsChanged ? state.lockedDoorIds.filter((id) => closed.some(({ name }) => name === id)) : state.lockedDoorIds,
      occupiedHouseId: getHouseAt(nextPosition, state.occupiedHouseId),
      activeTimeMs,
      gameOver,
      restNotice: traveled > 0 ? null : state.restNotice,
    };
    if (state.sleep) {
      const remainingMs = state.sleep.remainingMs - deltaMs;
      if (gameOver || biteDamage > 0 || hasSleepThreat()
        || [...doors.breached].some((door) => door.name.startsWith(state.occupiedHouseId + '_'))) {
        wakeUp('danger');
      } else if (hasCriticalNeeds()) {
        wakeUp('needs');
      } else if (remainingMs <= 0) {
        wakeUp('awake');
      } else {
        state = { ...state, sleep: { ...state.sleep, remainingMs } };
      }
    }
    if (gameOver) {
      clearMovement();
      openContainer = null;
    }
  }

  function step(deltaMs: number): GameState {
    if (pause.getPauseState().isPaused || state.gameOver) return state;
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return state;

    const sleeping = !!state.sleep;
    let remaining = sleeping ? Math.min(1600, deltaMs * sleepSpeed) : deltaMs;
    while (remaining > 0 && !state.gameOver) {
      let elapsed = Math.min(remaining, state.survivor.attack?.remainingMs ?? remaining);
      if (state.sleep) elapsed = Math.min(elapsed, state.sleep.remainingMs, 50);
      for (const { attack } of state.zombies) {
        if (attack) elapsed = Math.min(elapsed, attack.remainingMs);
      }
      const survivalStep = getSurvivalStep(state.survivor, elapsed);
      advanceSimulation(survivalStep);
      remaining -= survivalStep.elapsedMs;
      if (sleeping && !state.sleep) break;
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
      if (pause.getPauseState().isPaused || state.gameOver || state.sleep) return;
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
      ready = held && !pause.getPauseState().isPaused && !state.gameOver && !state.sleep;
    },
    isReady: () => ready,
    isSneaking: () => sneakHeld,
    canSee,
    getMeleeAimPreview,
    getLastBatContact: () => lastBatContact,
    listenAt,
    aimAt(target) {
      if (pause.getPauseState().isPaused || state.gameOver || state.sleep || state.survivor.attack) return;
      if (target && (!Number.isFinite(target.x) || !Number.isFinite(target.y))) return;
      pointerTarget = target;
    },
    step,
    startMeleeSwing(target) {
      const { survivor } = state;
      const weapon = equippedMeleeKind(survivor);
      if (pause.getPauseState().isPaused || !weapon || survivor.attack || state.gameOver || state.sleep
          || !Number.isFinite(target.x) || !Number.isFinite(target.y)) return false;

      const facing = aimFrom(survivor.position, target)
        ?? (pointerTarget && aimFrom(survivor.position, pointerTarget)) ?? survivor.facing;
      const targetAtWindup = selectMeleeTarget(survivor.position, facing, state.zombies,
        traversal.hasLineOfSight, meleeWeapons[weapon]);
      const lowStrike = targetAtWindup?.attack?.kind === 'knockdown';
      if (!ready) pointerTarget = null;
      state = {
        ...state,
        survivor: {
          ...survivor,
          gait: survivor.gait === 'sprint' ? 'walk' : survivor.gait,
          facing,
          facingLeft: Math.abs(facing.x - facing.y) > 0.0001 ? facing.x < facing.y : survivor.facingLeft,
          attack: {
            ...beginAttack(facing, meleeWeapons[weapon]),
            ...(survivor.stamina < lowStaminaSwingThreshold && { tired: true }),
            ...(lowStrike && { lowStrike: true }),
          },
        },
      };
      notify();
      return true;
    },
    startShove() {
      const { survivor } = state;
      if (pause.getPauseState().isPaused || state.gameOver || state.sleep || survivor.attack || survivor.stamina < shoveConfig.staminaCost) return false;
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
      return target?.kind === 'container' && !target.empty ? target.object : null;
    },
    getOpenContainer: () => openContainer,
    search(containerId) {
      const target = getInteractionTarget();
      return target?.kind === 'container' && !target.empty && target.id === containerId && interact(target).status === 'searched';
    },
    transferItem(containerId, itemId) {
      return transferStorage({ kind: 'container', id: containerId }, itemId, { kind: 'inventory' });
    },
    transferStorage,
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
      if (pause.getPauseState().isPaused || state.gameOver || state.sleep || !Number.isInteger(slot)
          || slot < 0 || slot >= inventoryQuickSlotCount) return 'unavailable';
      const item = state.survivor.inventory[slot];
      if (!item || item.id !== itemId) return 'unavailable';
      if (!isMeleeWeapon(item.kind)) return 'inspect';
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
      if (!isInventoryAvailable() || state.survivor.attack || !item || item.id !== itemId || !isMeleeWeapon(item.kind)) return false;
      changeEquippedWeapon(state.survivor.equippedWeaponId === itemId ? null : itemId);
      return true;
    },
    togglePack(slot, itemId) {
      const { survivor } = state;
      const item = survivor.inventory[slot];
      if (!isInventoryAvailable() || item?.kind !== 'backpack' || item.id !== itemId) return 'unavailable';
      const equipped = survivor.equippedPackId === itemId;
      if (equipped && carriedLoad(survivor.inventory, null, state.packs).weight > baseCarryCapacity + 1e-9) return 'too_heavy';
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
        const barricaded = action.reinforcement === 'barricaded';
        const doorDefenses: DoorDefenses = { ...state.doorDefenses, [id]: {
          pressureMs: state.doorDefenses[id]?.pressureMs ?? 0,
          wedged: !barricaded,
          ...(barricaded ? { barricaded: true } : {}),
        } };
        if (barricaded) emitSound({ position: state.survivor.position, reach: 9 });
        state = {
          ...state, doorDefenses, survivor: { ...state.survivor, inventory },
          zombies: barricaded ? zombies.map((actor) => actor.getState()) : state.zombies,
        };
        notify();
        return { status: action.reinforcement };
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
      if (item.kind === 'backpack' && itemWeight(item, state.packs) > baseCarryCapacity + 1e-9) {
        return { status: 'pack_too_heavy' };
      }

      const inventory = [...survivor.inventory];
      inventory[slot] = null;
      if (survivor.equippedPackId === itemId && carriedLoad(inventory, null, state.packs).weight > baseCarryCapacity + 1e-9) {
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
