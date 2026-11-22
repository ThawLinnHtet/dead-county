import type { GameCoordinator, GameSnapshot } from '../game/gameCoordinator.ts';
import { batConfig, shoveConfig } from '../game/combat.ts';
import type { AttackState } from '../game/combat.ts';
import { alderShelter, workshopLock } from '../game/district.ts';
import { authoredStock, backpackSlots, containerSlots, expandedStock, reachableBeds, seedContainers, starterStock } from '../game/items.ts';
import type { ItemInstance } from '../game/items.ts';
import { doorResistance } from '../game/shelter.ts';
import { canOccupy, contains, hasLineOfSight, houses, mapHeight, mapWidth, openings, starterZombieSpawns, zombieSpawns } from '../game/world.ts';
import { maximumSleepMs } from '../game/survival.ts';
import type { MapObject, WorldPoint } from '../game/world.ts';
import { createZombies, zombieConfig } from '../game/zombie.ts';
import type { ZombieState } from '../game/zombie.ts';

export const saveSchemaVersion = 6;
export const saveWorldVersion = 'neighborhood-2';
export const slotKey = 'local';

export interface SavedRun {
  readonly id: string;
  readonly snapshot: GameSnapshot;
}

export interface DamagedSaveGuard {
  readonly revision: number | undefined;
}

export type SaveRead =
  | { kind: 'empty' | 'dead'; revision: number }
  | { kind: 'ready'; revision: number; run: SavedRun }
  | { kind: 'unsupported'; reason: 'newer_schema' | 'world' }
  | { kind: 'damaged'; guard?: DamagedSaveGuard };

type SaveRecord = {
  key: typeof slotKey;
  schemaVersion: number;
  worldVersion: string;
  revision: number;
  run: SavedRun | null;
};

const initialContainers = seedContainers(authoredStock);
const starterContainers = seedContainers(starterStock);
const expandedContainers = seedContainers(expandedStock);
const authoredItems = new Map(Object.values(initialContainers).flat().map((item) => [item.id, item.kind]));
const preBarricadeItems = new Map([...authoredItems].filter(([, kind]) => kind !== 'board' && kind !== 'hammer'));
const preLockItems = new Map([...preBarricadeItems].filter(([, kind]) => kind !== workshopLock.keyKind));
const boardId = initialContainers[alderShelter.boardCabinetId]!.find(({ kind }) => kind === 'board')!.id;
const starterItems = new Map(Object.values(starterContainers).flat().map((item) => [item.id, item.kind]));
const expandedItems = new Map(Object.values(expandedContainers).flat().map((item) => [item.id, item.kind]));
// Schema one had no door collision. Preserve walkable thresholds and actor positions when loading it.
const legacyClosedOpeningIds = openings.filter(({ type }) => type === 'window').map(({ name }) => name);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function finite(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

export function isRevision(value: unknown): value is number {
  return finite(value) && Number.isSafeInteger(value);
}

export function isRunId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value);
}

function point(value: unknown): value is Record<string, unknown> & WorldPoint {
  return isRecord(value) && finite(value.x, 0, mapWidth) && finite(value.y, 0, mapHeight);
}

function direction(value: unknown) {
  return isRecord(value) && finite(value.x, -1, 1) && finite(value.y, -1, 1)
    && Math.abs(Math.hypot(value.x, value.y) - 1) <= 1e-6;
}

function attack(value: unknown, timing: Pick<typeof batConfig, 'windupMs' | 'contactMs' | 'recoveryMs'>, kind?: AttackState['kind']) {
  if (value === null) return true;
  if (!isRecord(value) || value.kind !== kind || !direction(value.direction) || typeof value.damageApplied !== 'boolean') return false;
  if (kind === 'stagger') {
    return value.phase === 'recovery' && !value.damageApplied && finite(value.remainingMs, Number.MIN_VALUE, shoveConfig.staggerMs);
  }
  switch (value.phase) {
    case 'windup': return !value.damageApplied && finite(value.remainingMs, Number.MIN_VALUE, timing.windupMs);
    case 'contact': return finite(value.remainingMs, Number.MIN_VALUE, timing.contactMs);
    case 'recovery': return finite(value.remainingMs, Number.MIN_VALUE, timing.recoveryMs);
    default: return false;
  }
}

function isNavigationRetry(value: unknown, activeTimeMs: number) {
  return value === undefined || value === null || (isRecord(value) && isRevision(value.failures)
    && value.failures > 0 && finite(value.nextAttemptAtMs, 0, activeTimeMs + zombieConfig.pathRefreshMs));
}

function isZombie(value: unknown, index: number, activeTimeMs: number, closed: readonly MapObject[], schema: number) {
  const authored = zombieSpawns[index];
  if (!authored || !isRecord(value)) return false;
  const staggered = schema >= 3 && isRecord(value.attack) && value.attack.kind === 'stagger';
  if (value.id !== authored.id || value.appearanceId !== authored.appearanceId
      || !point(value.position) || !canOccupy(value.position, undefined, value.health === 0 ? [] : closed) || !finite(value.health, 0, zombieConfig.health)
      || !(value.lastBatHitAtMs === null || finite(value.lastBatHitAtMs, 0, activeTimeMs))
      || !attack(value.attack, zombieConfig.bite, staggered ? 'stagger' : undefined) || (value.health === 0 && value.attack !== null)
      || !finite(value.walkDistance) || typeof value.facingLeft !== 'boolean' || typeof value.moving !== 'boolean'
      || !isRevision(value.randomState) || value.randomState > 0xffffffff || !isRecord(value.behavior)
      || !isNavigationRetry(value.navigationRetry, activeTimeMs)) return false;

  const behavior = value.behavior;
  if (behavior.kind === 'chase') {
    return point(behavior.lastKnownPosition)
      && (behavior.graceRemainingMs === null || finite(behavior.graceRemainingMs, 0, zombieConfig.pursuitGraceMs));
  }
  if (behavior.kind === 'investigate') {
    return schema >= 2 && point(behavior.destination) && finite(behavior.remainingMs, Number.MIN_VALUE, zombieConfig.investigateMs);
  }
  return behavior.kind === 'wander' && (behavior.destination === null || point(behavior.destination))
    && finite(behavior.idleRemainingMs, 0, zombieConfig.wanderIdleMs);
}

function isAliveSnapshot(value: unknown, schema: number): value is GameSnapshot {
  if (!isRecord(value) || !finite(value.activeTimeMs) || !isRecord(value.survivor)) return false;
  const legacy = schema === 1;
  const older = schema < 3;
  const {
    survivor, containers, droppedItems, zombies, activeTimeMs, occupiedHouseId,
    closedOpeningIds, lockedDoorIds, doorDefenses, packs, sleep,
  } = value;
  if (!legacy && (!Array.isArray(closedOpeningIds) || closedOpeningIds.length > openings.length
      || closedOpeningIds.length !== new Set(closedOpeningIds).size
      || !closedOpeningIds.every((id) => openings.some(({ name }) => name === id)))) return false;
  const closed = legacy ? [] : openings.filter(({ name }) => (closedOpeningIds as string[]).includes(name));
  if (schema >= 5 && (!Array.isArray(lockedDoorIds) || lockedDoorIds.length > 1
    || (lockedDoorIds.length === 1 && (lockedDoorIds[0] !== workshopLock.doorId
      || !closed.some(({ name }) => name === workshopLock.doorId))))) return false;
  const stockByContainer = legacy ? starterContainers : older ? expandedContainers : initialContainers;
  const allowedItems = legacy ? starterItems : older ? expandedItems
    : schema < 5 ? preLockItems : schema < 6 ? preBarricadeItems : authoredItems;
  if (!older && (!isRecord(doorDefenses) || Object.keys(doorDefenses).length > closed.length
    || !Object.entries(doorDefenses).every(([id, defense]) =>
      closed.some((door) => door.name === id && door.type === 'door') && isRecord(defense)
      && typeof defense.wedged === 'boolean'
      && (defense.barricaded === undefined
        || (schema >= 6 && defense.barricaded === true && id === alderShelter.doorId && !defense.wedged))
      && finite(defense.pressureMs)
      && defense.pressureMs < doorResistance({ wedged: defense.wedged, ...(defense.barricaded && { barricaded: true }) })))) return false;
  if (occupiedHouseId !== undefined && occupiedHouseId !== null
      && !houses.some(({ name }) => name === occupiedHouseId)) return false;
  const shoving = !older && isRecord(survivor.attack) && survivor.attack.kind === 'shove';
  if (!(survivor.characterId === 'survivor_male' || survivor.characterId === 'survivor_female')
      || !point(survivor.position) || !canOccupy(survivor.position, undefined, closed)
      || (!legacy && typeof survivor.bleeding !== 'boolean')
      || (schema >= 4 && !finite(survivor.fatigue, 0, 100))
      || !finite(survivor.health, Number.MIN_VALUE, 100) || !finite(survivor.stamina, 0, 100) || !finite(survivor.hunger, 0, 100) || !finite(survivor.thirst, 0, 100)
      || !(survivor.lastBiteAtMs === null || finite(survivor.lastBiteAtMs, 0, activeTimeMs))
      || !finite(survivor.walkDistance) || !direction(survivor.facing) || typeof survivor.facingLeft !== 'boolean'
      || !attack(survivor.attack, shoving ? shoveConfig : batConfig, shoving ? 'shove' : undefined)
      || !Array.isArray(survivor.inventory) || survivor.inventory.length !== 12
      || !isRecord(containers) || !Array.isArray(droppedItems) || droppedItems.length > allowedItems.size
      || !Array.isArray(zombies) || zombies.length !== (legacy ? starterZombieSpawns.length : zombieSpawns.length)) return false;

  const seen = new Set<string>();
  function claim(item: unknown): item is ItemInstance {
    if (!isRecord(item) || typeof item.id !== 'string' || item.id.length > 100 || seen.has(item.id)
      || !allowedItems.has(item.id) || allowedItems.get(item.id) !== item.kind) return false;
    seen.add(item.id);
    return true;
  }

  for (const item of survivor.inventory) {
    if (item !== null && !claim(item)) return false;
  }
  if (survivor.equippedWeaponId !== null &&
    !survivor.inventory.some((item) => item?.kind === 'baseball_bat' && item.id === survivor.equippedWeaponId)) return false;
  if (!older && survivor.equippedPackId !== null &&
    !survivor.inventory.some((item) => item?.kind === 'backpack' && item.id === survivor.equippedPackId)) return false;
  if (survivor.attack !== null && !shoving && survivor.equippedWeaponId === null) return false;

  for (const [id, stock] of Object.entries(stockByContainer)) {
    const items = containers[id];
    if (!Array.isArray(items) || items.length > (schema >= 4 ? containerSlots : stock.length)) return false;
    for (const item of items) {
      if (!claim(item) || (schema < 4 && !stock.some((authored) => authored.id === item.id))) return false;
    }
  }
  for (const drop of droppedItems) {
    if (!isRecord(drop) || !claim(drop.item) || !point(drop.position) || !canOccupy(drop.position, .17, closed)) return false;
  }
  if (schema >= 4) {
    if (Object.keys(containers).length !== Object.keys(stockByContainer).length || !isRecord(packs)) return false;
    for (const [id, items] of Object.entries(packs)) {
      if (!seen.has(id) || allowedItems.get(id) !== 'backpack' || !Array.isArray(items) || items.length > backpackSlots) return false;
      for (const item of items) {
        if (!claim(item) || item.kind === 'backpack') return false;
      }
    }
    if (sleep !== null) {
      const position = survivor.position;
      const houseId = houses.find((house) => contains(house, position))?.name ?? null;
      if (!isRecord(sleep) || survivor.bleeding || survivor.attack !== null
        || !finite(sleep.remainingMs, Number.MIN_VALUE, maximumSleepMs)
        || !reachableBeds(position, houseId, (from, to) => hasLineOfSight(from, to, closed))
          .some(({ object }) => object.name === sleep.bedId)) return false;
    }
  }
  const alderDefense = isRecord(doorDefenses) ? doorDefenses[alderShelter.doorId] : null;
  if (isRecord(alderDefense) && alderDefense.barricaded === true && seen.has(boardId)) return false;
  for (const [index, zombie] of zombies.entries()) {
    if (!isZombie(zombie, index, activeTimeMs, closed, schema)) return false;
  }
  return true;
}

export function captureRun(coordinator: GameCoordinator): GameSnapshot {
  const {
    survivor, containers, packs, sleep, droppedItems, zombies, activeTimeMs, occupiedHouseId,
    closedOpeningIds, lockedDoorIds, doorDefenses,
  } = coordinator.getState();
  const { gait: _gait, steppingBack: _steppingBack, ...savedSurvivor } = survivor;
  return {
    survivor: savedSurvivor, containers, packs, sleep, droppedItems, zombies, activeTimeMs, occupiedHouseId,
    closedOpeningIds, lockedDoorIds, doorDefenses,
  };
}

export function saveRecord(revision: number, run: SavedRun | null): SaveRecord {
  return { key: slotKey, schemaVersion: saveSchemaVersion, worldVersion: saveWorldVersion, revision, run };
}

export function readRevision(record: unknown): number | undefined {
  if (record === undefined) return 0;
  if (isRecord(record) && isRevision(record.revision) && record.revision > 0) return record.revision;
}

function copyPoint({ x, y }: WorldPoint): WorldPoint {
  return { x, y };
}

function copyItem({ id, kind }: ItemInstance): ItemInstance {
  return { id, kind };
}

function copyAttack(attack: GameSnapshot['survivor']['attack']): GameSnapshot['survivor']['attack'] {
  if (!attack) return null;
  const { phase, direction, remainingMs, damageApplied, kind } = attack;
  return { phase, direction: copyPoint(direction), remainingMs, damageApplied, ...(kind && { kind }) };
}

function copyBehavior(behavior: ZombieState['behavior']): ZombieState['behavior'] {
  switch (behavior.kind) {
    case 'chase': return { kind: 'chase', lastKnownPosition: copyPoint(behavior.lastKnownPosition), graceRemainingMs: behavior.graceRemainingMs };
    case 'investigate': return { kind: 'investigate', destination: copyPoint(behavior.destination), remainingMs: behavior.remainingMs };
    case 'wander': return { kind: 'wander', destination: behavior.destination ? copyPoint(behavior.destination) : null, idleRemainingMs: behavior.idleRemainingMs };
  }
}

function copySnapshot({
  survivor, containers, packs, sleep, droppedItems, zombies, activeTimeMs, occupiedHouseId,
  closedOpeningIds, lockedDoorIds, doorDefenses,
}: GameSnapshot, schema: number): GameSnapshot {
  const legacy = schema === 1;
  const older = schema < 3;
  const oldItems = legacy ? starterItems : expandedItems;
  const knownContainers = legacy ? starterContainers : older ? expandedContainers : initialContainers;
  const {
    characterId, position, health, stamina, hunger, thirst, inventory, equippedWeaponId,
    facing, facingLeft, attack, lastBiteAtMs, walkDistance, bleeding,
  } = survivor;
  const expandedZombies = legacy ? createZombies(zombieSpawns.slice(starterZombieSpawns.length)).map((actor) => actor.getState()) : [];
  const restoredContainers = Object.fromEntries(Object.entries(initialContainers).map(([id, authored]) => {
    const items = Object.hasOwn(knownContainers, id) ? containers[id]! : [];
    const newItems = older ? authored.filter((item) => preLockItems.has(item.id) && !oldItems.has(item.id)) : [];
    return [id, [...items, ...newItems].map(copyItem)];
  }));
  if (schema < 6) {
    for (const [id, kind] of [[alderShelter.hammerCabinetId, 'hammer'], [alderShelter.boardCabinetId, 'board']] as const) {
      const item = initialContainers[id]!.find((entry) => entry.kind === kind)!;
      // A player may have filled the original cupboard with a stash.
      const destination = restoredContainers[id]!.length < containerSlots ? restoredContainers[id]
        : Object.values(restoredContainers).find((items) => items.length < containerSlots);
      destination?.push(copyItem(item));
    }
  }
  return {
    activeTimeMs,
    occupiedHouseId,
    closedOpeningIds: [...(legacy ? legacyClosedOpeningIds : closedOpeningIds ?? [])],
    lockedDoorIds: schema >= 5 ? [...lockedDoorIds!] : [],
    doorDefenses: older ? {} : Object.fromEntries(Object.entries(doorDefenses!).map(([id, defense]) => [
      id, { pressureMs: defense!.pressureMs, wedged: defense!.wedged, ...(defense!.barricaded && { barricaded: true }) },
    ])),
    survivor: {
      characterId, position: copyPoint(position), health, stamina, hunger, thirst,
      fatigue: schema >= 4 ? survivor.fatigue : 0,
      inventory: inventory.map((item) => item ? copyItem(item) : null), equippedWeaponId,
      equippedPackId: older ? null : survivor.equippedPackId,
      facing: copyPoint(facing), facingLeft, attack: copyAttack(attack), lastBiteAtMs, walkDistance, bleeding: legacy ? false : bleeding,
    },
    containers: restoredContainers,
    packs: schema >= 4 ? Object.fromEntries(Object.entries(packs!).map(([id, items]) => [id, items.map(copyItem)])) : {},
    sleep: schema >= 4 && sleep ? { bedId: sleep.bedId, remainingMs: sleep.remainingMs } : null,
    droppedItems: droppedItems.map((drop) => ({ item: copyItem(drop.item), position: copyPoint(drop.position) })),
    zombies: [...zombies, ...expandedZombies].map((zombie) => {
      const {
        id, appearanceId, position, health, lastBatHitAtMs, attack, facingLeft,
        walkDistance, moving, randomState, behavior, navigationRetry,
      } = zombie;
      return {
        id, appearanceId, position: copyPoint(position), health, lastBatHitAtMs, attack: copyAttack(attack),
        facingLeft, walkDistance, moving, randomState,
        navigationRetry: navigationRetry ? { failures: navigationRetry.failures, nextAttemptAtMs: navigationRetry.nextAttemptAtMs } : null,
        behavior: copyBehavior(behavior),
      };
    }),
  };
}

export function inspectSaveRecord(record: unknown): SaveRead {
  if (record === undefined) return { kind: 'empty', revision: 0 };
  if (!isRecord(record) || record.key !== slotKey || !isRevision(record.schemaVersion)) return { kind: 'damaged' };
  if (record.schemaVersion > saveSchemaVersion) return { kind: 'unsupported', reason: 'newer_schema' };
  const revision = readRevision(record);
  const schema = record.schemaVersion;
  const legacy = schema === 1;
  if (schema < 1 || typeof record.worldVersion !== 'string'
    || !record.worldVersion.length || revision === undefined) return { kind: 'damaged' };
  if (record.worldVersion !== (legacy ? 'neighborhood-1' : saveWorldVersion)) return { kind: 'unsupported', reason: 'world' };
  if (record.run === null) return { kind: 'dead', revision };
  if (!isRecord(record.run) || !isRunId(record.run.id) || !isAliveSnapshot(record.run.snapshot, schema)) return { kind: 'damaged' };

  return { kind: 'ready', revision, run: { id: record.run.id, snapshot: copySnapshot(record.run.snapshot, schema) } };
}
