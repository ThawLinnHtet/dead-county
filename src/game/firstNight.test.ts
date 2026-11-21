import assert from 'node:assert/strict';
import test from 'node:test';
import { captureRun, inspectSaveRecord, saveRecord } from '../save/runSnapshot.ts';
import { createGameCoordinator, restoreGameCoordinator } from './gameCoordinator.ts';
import type { GameCoordinator } from './gameCoordinator.ts';
import { carriedLoad } from './items.ts';
import { neighborhoodTime } from './survival.ts';

const runId = '00000000-0000-0000-0000-000000000001';
const cabinet = 'starter_container';
const bedPosition = { x: 8.35, y: 7.85 };
const evening = 360_000;

function preparedRun() {
  return captureRun(createGameCoordinator({ position: bedPosition }));
}

function sleep(game: GameCoordinator) {
  const target = game.getInteractionTarget();
  assert.equal(target?.kind, 'bed');
  assert.ok(target);
  assert.equal(game.interact(target).status, 'sleep_changed');
}

test('the can moves from a backpack into an empty cupboard and stays there through Continue', () => {
  const base = captureRun(createGameCoordinator({ position: { x: 11.9, y: 9.15 } }));
  const kitchen = 'house_b_kitchen_cabinet';
  const living = 'house_b_living_cabinet';
  const [can] = base.containers[kitchen]!;
  const pack = base.containers[living]!.find(({ kind }) => kind === 'backpack')!;
  const game = restoreGameCoordinator({
    ...base, containers: {
      ...base.containers, [kitchen]: [], [cabinet]: [], [living]: base.containers[living]!.filter((item) => item !== pack),
    },
    survivor: { ...base.survivor, inventory: [pack, can!, ...base.survivor.inventory.slice(2)] },
  });
  game.toggleInventory();
  game.togglePack(0, pack.id);
  const packLocation = { kind: 'pack', id: pack.id } as const;
  const pockets = { kind: 'inventory' } as const;
  assert.equal(game.transferStorage(pockets, can!.id, packLocation).status, 'transferred');
  const packed = game.getState();
  assert.equal(carriedLoad(packed.survivor.inventory, pack.id, packed.packs).weight, 1.4);
  assert.equal(game.transferStorage(pockets, can!.id, packLocation).status, 'unavailable');
  const packedSave = inspectSaveRecord(saveRecord(1, { id: runId, snapshot: captureRun(game) }));
  assert.equal(packedSave.kind, 'ready');
  if (packedSave.kind !== 'ready') return;
  const continued = restoreGameCoordinator(packedSave.run.snapshot);
  const empty = continued.getInteractionTarget();
  assert.ok(empty?.kind === 'container' && empty.empty);
  assert.equal(continued.interact(empty).status, 'searched');
  const cupboard = { kind: 'container', id: cabinet } as const;
  assert.equal(continued.transferStorage(pockets, pack.id, cupboard).status, 'unequip_first');
  continued.setTabHidden(true);
  assert.equal(continued.transferStorage(packLocation, can!.id, cupboard).status, 'unavailable');
  continued.setTabHidden(false);
  continued.closeInventoryPanel();
  continued.resume();
  continued.interact(empty);
  assert.equal(continued.transferStorage(packLocation, can!.id, cupboard).status, 'transferred');
  const snapshot = captureRun(continued);
  const stored = inspectSaveRecord(saveRecord(2, { id: runId, snapshot }));
  assert.ok(stored.kind === 'ready');
  assert.deepEqual(stored.run.snapshot.containers[cabinet], [can]);
  assert.deepEqual(stored.run.snapshot.packs?.[pack.id], []);
  const duplicated = { ...snapshot, packs: { [pack.id]: [can!] } };
  assert.equal(inspectSaveRecord(saveRecord(3, { id: runId, snapshot: duplicated })).kind, 'damaged');
});

test('a packed bag keeps its contents on the ground and can be picked up again', () => {
  const game = createGameCoordinator({
    position: { x: 11.9, y: 9.15 }, zombieSpawns: [],
    containerStock: { [cabinet]: ['backpack', 'water_bottle', 'water_bottle', 'water_bottle', 'water_bottle', 'water_bottle'] },
  });
  assert.ok(game.search(cabinet));
  const [pack, ...water] = game.getState().containers[cabinet]!;
  assert.ok(pack);
  assert.equal(game.transferItem(cabinet, pack.id).status, 'transferred');
  game.togglePack(0, pack.id);
  const source = { kind: 'container', id: cabinet } as const;
  const destination = { kind: 'pack', id: pack.id } as const;
  for (const bottle of water) assert.equal(game.transferStorage(source, bottle.id, destination).status, 'transferred');
  assert.equal(game.dropItem(0, pack.id).status, 'pack_too_heavy');
  assert.equal(game.transferStorage(destination, water[0]!.id, source).status, 'transferred');
  assert.equal(game.dropItem(0, pack.id).status, 'dropped');
  game.closeInventoryPanel();
  const drop = game.getInteractionTarget();
  assert.ok(drop?.kind === 'drop');
  assert.equal(game.interact(drop).status, 'picked_up');
  assert.deepEqual(game.getState().packs[pack.id], water.slice(1));
});

test('sleep uses active simulation only and Continue wakes a prepared survivor at dawn', () => {
  const base = preparedRun();
  const game = restoreGameCoordinator({
    ...base, activeTimeMs: evening, survivor: { ...base.survivor, health: 70, fatigue: 60 },
  });
  sleep(game);
  game.step(16);
  game.handleEscape();
  const before = game.getState();
  assert.strictEqual(game.step(90_000), before);
  const saved = inspectSaveRecord(saveRecord(1, { id: runId, snapshot: captureRun(game) }));
  assert.ok(saved.kind === 'ready');
  const resumed = restoreGameCoordinator(saved.run.snapshot);
  game.resume();
  while (game.getState().sleep) {
    game.step(16);
    resumed.step(16);
  }
  assert.deepEqual(resumed.getState(), game.getState());
  const morning = resumed.getState();
  assert.equal(neighborhoodTime(morning.activeTimeMs).time, '06:00');
  assert.equal(neighborhoodTime(morning.activeTimeMs).day, 2);
  assert.equal(morning.survivor.fatigue, 0);
  assert.equal(morning.survivor.health, 70);
  assert.ok(morning.survivor.thirst > before.survivor.thirst);
});

test('an ordinary pursuer forces a shelter door and wakes the survivor', () => {
  const base = preparedRun();
  const outside = { x: 14.65, y: 8.28 };
  const game = restoreGameCoordinator({
    ...base,
    survivor: { ...base.survivor, fatigue: 45 },
    doorDefenses: { house_a_door: { wedged: false, pressureMs: 1430 } },
    zombies: [{
      ...base.zombies[0]!, position: outside,
      behavior: { kind: 'chase', lastKnownPosition: { x: 12.8, y: 8.28 }, graceRemainingMs: 4000 },
    }],
  });
  sleep(game);
  const result = game.step(16);
  assert.equal(result.sleep, null);
  assert.equal(result.restNotice, 'danger');
  assert.ok(!result.closedOpeningIds.includes('house_a_door'));
  assert.equal(result.activeTimeMs, 50, 'the frame stops fast-forwarding when the door gives way');
});

test('critical thirst interrupts sleep before it can damage health', () => {
  const base = preparedRun();
  const game = restoreGameCoordinator({
    ...base, zombies: [], survivor: { ...base.survivor, fatigue: 35, thirst: 79.99 },
  });
  sleep(game);
  const result = game.step(16);
  assert.equal(result.sleep, null);
  assert.equal(result.restNotice, 'needs');
  assert.equal(result.survivor.thirst, 80);
  assert.equal(result.survivor.health, 100);
});
