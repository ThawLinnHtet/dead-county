import assert from 'node:assert/strict';
import test from 'node:test';
import { createGameCoordinator, restoreGameCoordinator } from '../game/gameCoordinator.ts';
import { captureRun, inspectSaveRecord, saveRecord } from './runSnapshot.ts';
import { expandedStock, seedContainers, starterStock } from '../game/items.ts';
import { starterZombieSpawns, zombieSpawns } from '../game/world.ts';

const runId = '87501de8-fe8a-4d77-89fc-58094fd940dd';

test('Continue preserves the logical house at either side of a doorway threshold', () => {
  const game = createGameCoordinator({ position: { x: 13.99, y: 7.7 } });
  game.setMovement({ x: 2, y: 1 });
  const crossing = game.step(25);
  assert.equal(crossing.occupiedHouseId, 'house_a');
  assert.ok(crossing.survivor.position.x > 14);
  const read = inspectSaveRecord(structuredClone(saveRecord(2, { id: runId, snapshot: captureRun(game) })));
  assert.equal(read.kind, 'ready');
  assert.equal(restoreGameCoordinator(read.run.snapshot).getState().occupiedHouseId, crossing.occupiedHouseId);
});

test('Continue accepts a zero-duration pursuit and lets it expire on the next active step', () => {
  const raw = captureRun(createGameCoordinator({ position: { x: 4, y: 2 } }));
  const [first, ...other] = raw.zombies;
  const snapshot = {
    ...raw,
    zombies: [{
      ...first!, behavior: { kind: 'chase' as const, lastKnownPosition: first!.position, graceRemainingMs: 0 },
    }, ...other],
  };
  const read = inspectSaveRecord(structuredClone(saveRecord(2, { id: runId, snapshot })));
  assert.equal(read.kind, 'ready');
  const continued = restoreGameCoordinator(read.run.snapshot);
  assert.equal(continued.step(16).zombies[0]!.behavior.kind, 'wander');
});

test('schema-one runs migrate without replacing existing loot or encounters', () => {
  const original = captureRun(createGameCoordinator());
  const { closedOpeningIds: _openings, survivor, ...snapshot } = original;
  const { bleeding: _bleeding, ...legacySurvivor } = survivor;
  const containers = { ...seedContainers(starterStock), starter_container: [] };
  const zombies = original.zombies.slice(0, starterZombieSpawns.length).map(({ navigationRetry: _retry, ...zombie }) => zombie);
  const raw = { ...saveRecord(1, null), schemaVersion: 1, worldVersion: 'neighborhood-1', run: {
    id: runId, snapshot: { ...snapshot, containers, survivor: legacySurvivor, zombies },
  } };
  const read = inspectSaveRecord(structuredClone(raw));
  assert.equal(read.kind, 'ready');
  assert.equal(read.revision, 1);
  const restored = restoreGameCoordinator(read.run.snapshot).getState();
  assert.deepEqual(restored.containers.starter_container, []);
  assert.ok(restored.containers.lot_2_1_cabinet?.some(({ kind }) => kind === 'bandage'));
  assert.equal(restored.survivor.bleeding, false);
  assert.equal(restored.zombies.length, zombieSpawns.length);
  assert.ok(restored.zombies.every((actor) => actor.navigationRetry === null));
});

test('schema-two migration adds shelter supplies without refilling a previously depleted item', () => {
  const {
    doorDefenses: _defenses, survivor: { equippedPackId: _pack, ...survivor }, ...snapshot
  } = captureRun(createGameCoordinator());
  const cabinet = 'house_b_living_cabinet';
  const containers = { ...seedContainers(expandedStock), [cabinet]: [] };
  const raw = { ...saveRecord(2, null), schemaVersion: 2, run: { id: runId, snapshot: { ...snapshot, survivor, containers } } };
  const read = inspectSaveRecord(structuredClone(raw));
  assert.equal(read.kind, 'ready');
  assert.equal(read.run.snapshot.survivor.equippedPackId, null);
  assert.deepEqual(read.run.snapshot.doorDefenses, {});
  assert.deepEqual(read.run.snapshot.containers[cabinet]?.map(({ kind }) => kind), ['backpack', 'door_wedge']);
});

test('schema three preserves an equipped backpack, wedged door and unarmed shove through Continue', () => {
  const base = captureRun(createGameCoordinator({ position: { x: 13.3, y: 8.28 } }));
  const cabinet = 'house_b_living_cabinet';
  const items = base.containers[cabinet]!;
  const backpack = items.find(({ kind }) => kind === 'backpack')!;
  const wedge = items.find(({ kind }) => kind === 'door_wedge')!;
  const door = 'house_a_door';
  const game = restoreGameCoordinator({
    ...base, closedOpeningIds: [...base.closedOpeningIds!, door],
    containers: { ...base.containers, [cabinet]: items.filter((item) => item !== backpack && item !== wedge) },
    survivor: { ...base.survivor, inventory: [backpack, wedge, ...base.survivor.inventory.slice(2)] },
  });
  game.toggleInventory();
  assert.equal(game.togglePack(0, backpack.id), 'equipped');
  assert.equal(game.useItem(1, wedge.id).status, 'wedged');
  game.closeInventoryPanel();
  assert.equal(game.startShove(), true);
  game.step(40);
  const saved = captureRun(game);
  const record = saveRecord(7, { id: runId, snapshot: saved });
  const read = inspectSaveRecord(structuredClone(record));
  assert.equal(read.kind, 'ready');
  assert.deepEqual(read.run.snapshot, saved);
  const continued = restoreGameCoordinator(read.run.snapshot);
  assert.deepEqual(continued.step(60), game.step(60));

  const invalid = { ...saved, doorDefenses: { ...saved.doorDefenses, unknown: { wedged: true, pressureMs: 0 } } };
  assert.equal(inspectSaveRecord(saveRecord(7, { id: runId, snapshot: invalid })).kind, 'damaged');
});

test('committed saves keep closed entrances, active bleeding and the time left to investigate noise', () => {
  const game = createGameCoordinator({ position: { x: 13.3, y: 8.28 } });
  const door = game.getInteractionTarget();
  assert.ok(door?.kind === 'opening');
  assert.deepEqual(game.interact(door), { status: 'opening_changed' });
  const base = captureRun(game);
  const [first, ...rest] = base.zombies;
  const snapshot = {
    ...base,
    survivor: { ...base.survivor, health: 78, bleeding: true },
    zombies: [{ ...first!, behavior: { kind: 'investigate' as const, destination: { x: 24, y: 3 }, remainingMs: 1700 } }, ...rest],
  };
  const read = inspectSaveRecord(structuredClone(saveRecord(4, { id: runId, snapshot })));
  assert.equal(read.kind, 'ready');
  const loaded = restoreGameCoordinator(read.run.snapshot);
  assert.ok(loaded.getState().closedOpeningIds.includes(door.id));
  assert.equal(loaded.getState().survivor.bleeding, true);
  assert.deepEqual(loaded.getState().zombies[0]?.behavior, snapshot.zombies[0]?.behavior);
  assert.equal(loaded.getState().activeTimeMs, snapshot.activeTimeMs);
});

test('a committed snapshot restores changed survivor, inventory, loot, drops and fractional time', () => {
  const original = createGameCoordinator({ characterId: 'survivor_female', position: { x: 11.9, y: 9.15 } });
  const starter = original.getInteractionTarget();
  assert(starter?.kind === 'container');
  assert.deepEqual(original.interact(starter), { status: 'searched' });
  const [bat, water] = original.getState().containers[starter.id]!;
  assert.deepEqual(original.transferItem(starter.id, bat!.id), { status: 'transferred', slot: 0 });
  assert.deepEqual(original.transferItem(starter.id, water!.id), { status: 'transferred', slot: 1 });
  assert.equal(original.toggleEquip(0, bat!.id), true);
  assert.equal(original.moveInventoryItem(0, bat!.id, 7), true);
  assert.deepEqual(original.dropItem(1, water!.id), { status: 'dropped' });
  original.closeInventoryPanel();
  original.setMovement({ x: 0, y: 1 }, true);
  original.step(17.75);
  original.handleEscape();

  const captured = captureRun(original);
  const read = inspectSaveRecord(structuredClone(saveRecord(5, { id: runId, snapshot: captured })));
  assert.equal(read.kind, 'ready');
  assert.equal(read.revision, 5);
  const restored = restoreGameCoordinator(read.run.snapshot);
  const state = restored.getState();
  assert.equal(state.occupiedHouseId, 'house_a');
  assert.equal(state.survivor.characterId, 'survivor_female');
  assert.deepEqual(state.survivor.position, original.getState().survivor.position);
  assert.equal(state.survivor.stamina, 99.5385);
  assert.equal(state.survivor.equippedWeaponId, bat!.id);
  assert.equal(state.survivor.inventory[0], null);
  assert.deepEqual(state.survivor.inventory[7], bat);
  assert.deepEqual(state.containers[starter.id], []);
  assert.deepEqual(state.droppedItems.map(({ item }) => item), [water]);
  assert.equal(state.activeTimeMs, 17.75);
  assert.equal(state.survivor.gait, 'idle');
  restored.step(16);
  assert.deepEqual(restored.getState().survivor.position, state.survivor.position);
});
