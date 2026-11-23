import assert from 'node:assert/strict';
import test from 'node:test';
import { createGameCoordinator, restoreGameCoordinator } from '../game/gameCoordinator.ts';
import { alderShelter, workshopLock } from '../game/district.ts';
import { captureRun, inspectSaveRecord, saveRecord } from './runSnapshot.ts';
import { containerSlots, expandedStock, knifeCabinetId, preSafehouseStock, seedContainers, starterStock } from '../game/items.ts';
import { initiallyClosed, starterZombieSpawns, zombieSpawns } from '../game/world.ts';

const runId = '87501de8-fe8a-4d77-89fc-58094fd940dd';

test('Continue preserves the logical house at either side of a doorway threshold', () => {
  const game = createGameCoordinator({
    position: { x: 13.99, y: 7.7 }, closedOpeningIds: initiallyClosed.filter((id) => id !== 'house_a_door'),
  });
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
  assert.ok(!restored.closedOpeningIds.includes('house_a_door'));
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
  assert.deepEqual(read.run.snapshot.containers[cabinet]?.map(({ kind }) => kind), ['backpack', 'door_wedge', 'hammer', 'board']);
});

test('the current schema preserves equipped gear and migrates schema three with empty pack storage', () => {
  const base = captureRun(createGameCoordinator({ position: { x: 13.3, y: 8.28 } }));
  const cabinet = 'house_b_living_cabinet';
  const items = base.containers[cabinet]!;
  const backpack = items.find(({ kind }) => kind === 'backpack')!;
  const wedge = items.find(({ kind }) => kind === 'door_wedge')!;
  const game = restoreGameCoordinator({
    ...base,
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

  const {
    packs: _packs, sleep: _sleep, lockedDoorIds: _locks, containers, survivor: { fatigue: _fatigue, ...oldSurvivor }, ...rest
  } = saved;
  const oldContainers = Object.fromEntries(Object.entries(containers).map(([id, items]) => [
    id, items.filter(({ kind }) => kind !== workshopLock.keyKind && kind !== 'board' && kind !== 'hammer' && kind !== 'kitchen_knife'),
  ]));
  const legacy = inspectSaveRecord({
    ...record, schemaVersion: 3, run: { id: runId, snapshot: { ...rest, containers: oldContainers, survivor: oldSurvivor } },
  });
  assert.equal(legacy.kind, 'ready');
  assert.equal(legacy.run.snapshot.survivor.equippedPackId, backpack.id);
  assert.equal(legacy.run.snapshot.survivor.fatigue, 0);
  assert.deepEqual(legacy.run.snapshot.packs, {});
  assert.equal(legacy.run.snapshot.sleep, null);
  assert.deepEqual(legacy.run.snapshot.lockedDoorIds, []);

  const invalid = { ...saved, doorDefenses: { ...saved.doorDefenses, unknown: { wedged: true, pressureMs: 0 } } };
  assert.equal(inspectSaveRecord(saveRecord(7, { id: runId, snapshot: invalid })).kind, 'damaged');
});

test('committed saves keep closed entrances, active bleeding and the time left to investigate noise', () => {
  const game = createGameCoordinator({ position: { x: 13.3, y: 8.28 } });
  const door = game.getInteractionTarget();
  assert.ok(door?.kind === 'opening' && door.closed);
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

test('schema five supplies migrate once without moving the contents of a full cupboard', () => {
  const original = captureRun(createGameCoordinator());
  const { boardCabinetId, doorId } = alderShelter;
  const containers = Object.fromEntries(Object.entries(original.containers).map(([id, items]) => [
    id, items.filter(({ kind }) => kind !== 'board' && kind !== 'hammer' && kind !== 'kitchen_knife'),
  ]));
  const filled = [...containers[boardCabinetId]!];
  for (const [id, contents] of Object.entries(containers)) {
    if (id === boardCabinetId) continue;
    filled.push(...contents.splice(0, containerSlots - filled.length));
  }
  containers[boardCabinetId] = filled;
  const previous = { ...saveRecord(2, { id: runId, snapshot: { ...original, containers } }), schemaVersion: 5 };
  const migrated = inspectSaveRecord(previous);
  assert.equal(migrated.kind, 'ready');
  const { snapshot } = migrated.run;
  assert.deepEqual(snapshot.containers[boardCabinetId], filled);
  assert.equal(snapshot.doorDefenses?.[doorId], undefined);
  for (const id of [alderShelter.boardCabinetId, alderShelter.hammerCabinetId]) {
    const kind = id === boardCabinetId ? 'board' : 'hammer';
    const supply = original.containers[id]!.find((item) => item.kind === kind)!;
    assert.equal(Object.values(snapshot.containers).flat().filter((item) => item.id === supply.id).length, 1);
  }
  const reread = inspectSaveRecord(saveRecord(3, migrated.run));
  assert.equal(reread.kind, 'ready');
  assert.deepEqual(reread.run.snapshot.containers, snapshot.containers);
});

test('schema six adds the knife once and preserves an in-progress bat swing', () => {
  const original = captureRun(createGameCoordinator());
  const bat = original.containers.starter_container![0]!;
  const containers = {
    ...seedContainers(preSafehouseStock),
    [knifeCabinetId]: [],
    starter_container: original.containers.starter_container!.slice(1),
  };
  const game = restoreGameCoordinator({
    ...original, containers,
    survivor: { ...original.survivor, inventory: [bat, ...original.survivor.inventory.slice(1)], equippedWeaponId: bat.id },
  });
  assert.equal(game.startMeleeSwing({ x: 12, y: 9 }), true);
  game.step(30);
  const snapshot = captureRun(game);
  const old = { ...saveRecord(2, { id: runId, snapshot }), schemaVersion: 6 };
  const migrated = inspectSaveRecord(old);
  assert.equal(migrated.kind, 'ready');
  assert.deepEqual(migrated.run.snapshot.survivor, snapshot.survivor);
  assert.deepEqual(migrated.run.snapshot.containers[knifeCabinetId]?.map(({ kind }) => kind), ['kitchen_knife']);
  const roundTrip = inspectSaveRecord(saveRecord(3, migrated.run));
  assert.equal(roundTrip.kind, 'ready');
  assert.deepEqual(roundTrip.run, migrated.run);
});

test('Continue restores a strained barricade and rejects impossible defenses', () => {
  const original = captureRun(createGameCoordinator({ position: { x: 68.5, y: 7.2 } }));
  const { hammerCabinetId, boardCabinetId, doorId, windowId } = alderShelter;
  const hammer = original.containers[hammerCabinetId]!.find(({ kind }) => kind === 'hammer')!;
  const board = original.containers[boardCabinetId]!.find(({ kind }) => kind === 'board')!;
  const coordinator = restoreGameCoordinator({
    ...original,
    containers: {
      ...original.containers,
      [hammerCabinetId]: original.containers[hammerCabinetId]!.filter((item) => item !== hammer),
      [boardCabinetId]: original.containers[boardCabinetId]!.filter((item) => item !== board),
    },
    survivor: { ...original.survivor, inventory: [board, hammer, ...original.survivor.inventory.slice(2)] },
  });
  coordinator.toggleInventory();
  assert.equal(coordinator.useItem(0, board.id).status, 'barricaded');
  coordinator.closeInventoryPanel();
  const captured = captureRun(coordinator);
  const defense = { wedged: false, barricaded: true, pressureMs: 3500, boardItemId: board.id } as const;
  const read = (snapshot: typeof captured) => inspectSaveRecord(saveRecord(2, { id: runId, snapshot }));
  const continued = read({ ...captured, doorDefenses: { [doorId]: defense } });
  assert.equal(continued.kind, 'ready');
  const restored = restoreGameCoordinator(continued.run.snapshot);
  assert.deepEqual(restored.getState().doorDefenses[doorId], defense);
  assert.deepEqual(restored.getState().survivor.inventory.slice(0, 2), [null, hammer]);
  assert.equal(read({ ...captured, doorDefenses: { [windowId]: defense } }).kind, 'damaged');
  assert.equal(read({ ...captured, doorDefenses: { [doorId]: { ...defense, wedged: true } } }).kind, 'damaged');
  assert.equal(read({ ...captured, doorDefenses: { [doorId]: { ...defense, pressureMs: 5300 } } }).kind, 'damaged');
  assert.equal(read({
    ...captured, doorDefenses: { [doorId]: defense }, containers: original.containers,
    survivor: original.survivor,
  }).kind, 'damaged');

  const previousIds = new Set(Object.values(seedContainers(preSafehouseStock)).flat().map(({ id }) => id));
  const previousContainers = Object.fromEntries(Object.entries(captured.containers).map(([id, items]) =>
    [id, items.filter((item) => previousIds.has(item.id))]));
  const { boardItemId: _boardItemId, ...previousDefense } = defense;
  const previousSnapshot = { ...captured, containers: previousContainers, doorDefenses: { [doorId]: previousDefense } };
  const upgraded = inspectSaveRecord({ ...saveRecord(2, { id: runId, snapshot: previousSnapshot }), schemaVersion: 7 });
  assert.equal(upgraded.kind, 'ready');
  assert.deepEqual(upgraded.run.snapshot.doorDefenses?.[doorId], defense);
  assert.deepEqual(upgraded.run.snapshot.survivor.inventory.slice(0, 2), [null, hammer]);
  assert.equal(upgraded.run.snapshot.safehouse, null);
});
