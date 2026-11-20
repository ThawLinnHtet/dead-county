import type { GameCoordinator, GameSnapshot } from '../game/gameCoordinator.ts';
import { batConfig } from '../game/combat.ts';
import { authoredStock, seedContainers } from '../game/items.ts';
import type { ItemInstance } from '../game/items.ts';
import { canOccupy, mapHeight, mapWidth, zombieSpawns } from '../game/world.ts';
import type { WorldPoint } from '../game/world.ts';
import { zombieConfig } from '../game/zombie.ts';

export const saveSchemaVersion = 1;
export const saveWorldVersion = 'neighborhood-1';
export const slotKey = 'local';

export interface SavedRun {
  readonly id: string;
  readonly snapshot: GameSnapshot;
}

export type SaveRead =
  | { kind: 'empty' | 'dead'; revision: number }
  | { kind: 'ready'; revision: number; run: SavedRun }
  | { kind: 'unsupported'; reason: 'newer_schema' | 'world' }
  | { kind: 'damaged' };

type SaveRecord = {
  key: typeof slotKey;
  schemaVersion: number;
  worldVersion: string;
  revision: number;
  run: SavedRun | null;
};

const initialContainers = seedContainers(authoredStock);
const authoredItems = new Map(Object.values(initialContainers).flat().map((item) => [item.id, item.kind]));

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

function attack(value: unknown, timing: Pick<typeof batConfig, 'windupMs' | 'contactMs' | 'recoveryMs'>) {
  if (value === null) return true;
  if (!isRecord(value) || !direction(value.direction) || typeof value.damageApplied !== 'boolean') return false;
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

function isZombie(value: unknown, index: number, activeTimeMs: number) {
  const authored = zombieSpawns[index];
  if (!authored || !isRecord(value) || value.id !== authored.id || value.appearanceId !== authored.appearanceId
      || !point(value.position) || !canOccupy(value.position) || !finite(value.health, 0, zombieConfig.health)
      || !(value.lastBatHitAtMs === null || finite(value.lastBatHitAtMs, 0, activeTimeMs))
      || !attack(value.attack, zombieConfig.bite) || (value.health === 0 && value.attack !== null)
      || !finite(value.walkDistance) || typeof value.facingLeft !== 'boolean' || typeof value.moving !== 'boolean'
      || !isRevision(value.randomState) || value.randomState > 0xffffffff || !isRecord(value.behavior)
      || !isNavigationRetry(value.navigationRetry, activeTimeMs)) return false;

  const behavior = value.behavior;
  if (behavior.kind === 'chase') {
    return point(behavior.lastKnownPosition)
      && (behavior.graceRemainingMs === null || finite(behavior.graceRemainingMs, Number.MIN_VALUE, zombieConfig.pursuitGraceMs));
  }
  return behavior.kind === 'wander' && (behavior.destination === null || point(behavior.destination))
    && finite(behavior.idleRemainingMs, 0, zombieConfig.wanderIdleMs);
}

function isAliveSnapshot(value: unknown): value is GameSnapshot {
  if (!isRecord(value) || !finite(value.activeTimeMs) || !isRecord(value.survivor)) return false;
  const { survivor, containers, droppedItems, zombies, activeTimeMs } = value;
  if (!(survivor.characterId === 'survivor_male' || survivor.characterId === 'survivor_female')
      || !point(survivor.position) || !canOccupy(survivor.position)
      || !finite(survivor.health, Number.MIN_VALUE, 100) || !finite(survivor.stamina, 0, 100) || !finite(survivor.hunger, 0, 100) || !finite(survivor.thirst, 0, 100)
      || !(survivor.lastBiteAtMs === null || finite(survivor.lastBiteAtMs, 0, activeTimeMs))
      || !finite(survivor.walkDistance) || !direction(survivor.facing) || typeof survivor.facingLeft !== 'boolean'
      || !attack(survivor.attack, batConfig) || !Array.isArray(survivor.inventory) || survivor.inventory.length !== 12
      || !isRecord(containers) || !Array.isArray(droppedItems) || droppedItems.length > authoredItems.size
      || !Array.isArray(zombies) || zombies.length !== zombieSpawns.length) return false;

  const seen = new Set<string>();
  function claim(item: unknown): item is ItemInstance {
    if (!isRecord(item) || typeof item.id !== 'string' || item.id.length > 100 || seen.has(item.id)
      || !authoredItems.has(item.id) || authoredItems.get(item.id) !== item.kind) return false;
    seen.add(item.id);
    return true;
  }

  for (const item of survivor.inventory) {
    if (item !== null && !claim(item)) return false;
  }
  if (survivor.equippedWeaponId !== null &&
    !survivor.inventory.some((item) => item?.kind === 'baseball_bat' && item.id === survivor.equippedWeaponId)) return false;
  if (survivor.attack !== null && survivor.equippedWeaponId === null) return false;

  for (const [id, stock] of Object.entries(initialContainers)) {
    const items = containers[id];
    if (!Array.isArray(items) || items.length > stock.length) return false;
    for (const item of items) {
      if (!claim(item) || !stock.some((authored) => authored.id === item.id)) return false;
    }
  }
  for (const drop of droppedItems) {
    if (!isRecord(drop) || !claim(drop.item) || !point(drop.position) || !canOccupy(drop.position, .17)) return false;
  }
  for (const [index, zombie] of zombies.entries()) {
    if (!isZombie(zombie, index, activeTimeMs)) return false;
  }
  return true;
}

export function captureRun(coordinator: GameCoordinator): GameSnapshot {
  const { survivor, containers, droppedItems, zombies, activeTimeMs } = coordinator.getState();
  const { gait: _gait, ...savedSurvivor } = survivor;
  return { survivor: savedSurvivor, containers, droppedItems, zombies, activeTimeMs };
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
  const { phase, direction, remainingMs, damageApplied } = attack;
  return { phase, direction: copyPoint(direction), remainingMs, damageApplied };
}

function copySnapshot({ survivor, containers, droppedItems, zombies, activeTimeMs }: GameSnapshot): GameSnapshot {
  const {
    characterId, position, health, stamina, hunger, thirst, inventory, equippedWeaponId,
    facing, facingLeft, attack, lastBiteAtMs, walkDistance,
  } = survivor;
  return {
    activeTimeMs,
    survivor: {
      characterId, position: copyPoint(position), health, stamina, hunger, thirst,
      inventory: inventory.map((item) => item ? copyItem(item) : null), equippedWeaponId,
      facing: copyPoint(facing), facingLeft, attack: copyAttack(attack), lastBiteAtMs, walkDistance,
    },
    containers: Object.fromEntries(Object.keys(initialContainers).map((id) => [
      id, containers[id]!.map(copyItem),
    ])),
    droppedItems: droppedItems.map((drop) => ({ item: copyItem(drop.item), position: copyPoint(drop.position) })),
    zombies: zombies.map((zombie) => {
      const {
        id, appearanceId, position, health, lastBatHitAtMs, attack, facingLeft,
        walkDistance, moving, randomState, behavior, navigationRetry,
      } = zombie;
      return {
        id, appearanceId, position: copyPoint(position), health, lastBatHitAtMs, attack: copyAttack(attack),
        facingLeft, walkDistance, moving, randomState,
        navigationRetry: navigationRetry ? { failures: navigationRetry.failures, nextAttemptAtMs: navigationRetry.nextAttemptAtMs } : null,
        behavior: behavior.kind === 'chase'
          ? { kind: 'chase', lastKnownPosition: copyPoint(behavior.lastKnownPosition), graceRemainingMs: behavior.graceRemainingMs }
          : { kind: 'wander', destination: behavior.destination ? copyPoint(behavior.destination) : null, idleRemainingMs: behavior.idleRemainingMs },
      };
    }),
  };
}

export function inspectSaveRecord(record: unknown): SaveRead {
  if (record === undefined) return { kind: 'empty', revision: 0 };
  if (!isRecord(record) || record.key !== slotKey || !isRevision(record.schemaVersion)) return { kind: 'damaged' };
  if (record.schemaVersion > saveSchemaVersion) return { kind: 'unsupported', reason: 'newer_schema' };
  const revision = readRevision(record);
  if (record.schemaVersion !== saveSchemaVersion || typeof record.worldVersion !== 'string'
    || !record.worldVersion.length || revision === undefined) return { kind: 'damaged' };
  if (record.worldVersion !== saveWorldVersion) return { kind: 'unsupported', reason: 'world' };
  if (record.run === null) return { kind: 'dead', revision };
  if (!isRecord(record.run) || !isRunId(record.run.id) || !isAliveSnapshot(record.run.snapshot)) return { kind: 'damaged' };

  return { kind: 'ready', revision, run: { id: record.run.id, snapshot: copySnapshot(record.run.snapshot) } };
}
