import assert from 'node:assert/strict';
import test from 'node:test';
import { captureRun, inspectSaveRecord, saveRecord } from '../save/runSnapshot.ts';
import { workshopLock } from './district.ts';
import { createGameCoordinator, restoreGameCoordinator } from './gameCoordinator.ts';
import type { GameCoordinator } from './gameCoordinator.ts';
import { project } from './world.ts';

const runId = '87501de8-fe8a-4d77-89fc-58094fd940dd';
const front = { x: 106, y: 8.8 };
const inside = { x: 106, y: 7.1 };

function workshopDoor(game: GameCoordinator) {
  const target = game.getInteractionTarget();
  assert.ok(target?.kind === 'opening' && target.id === workshopLock.doorId);
  return target;
}

function commit(game: GameCoordinator) {
  const saved = inspectSaveRecord(saveRecord(1, { id: runId, snapshot: captureRun(game) }));
  assert.equal(saved.kind, 'ready');
  return restoreGameCoordinator(saved.run.snapshot);
}

test('the workshop requires the Cedar House key from outside and keeps the item after unlocking', () => {
  const exterior = commit(createGameCoordinator({ position: front }));
  assert.deepEqual(exterior.getState().lockedDoorIds, [workshopLock.doorId]);
  assert.equal(workshopDoor(exterior).lock, 'locked');
  exterior.setMovement(project({ x: 0, y: -1 }));
  exterior.step(500);
  const locked = workshopDoor(exterior);
  assert.deepEqual(exterior.interact(locked), { status: 'opening_locked' });
  assert.equal(exterior.getState().occupiedHouseId, null);
  const beforeTrip = captureRun(exterior);
  const cedarHouse = restoreGameCoordinator({
    ...beforeTrip, occupiedHouseId: 'lot_3_2',
    survivor: { ...beforeTrip.survivor, position: { x: 114.3, y: 5.15 } },
  });
  assert.ok(cedarHouse.search(workshopLock.keyCabinetId));
  const key = cedarHouse.getState().containers[workshopLock.keyCabinetId]!.find(({ kind }) => kind === workshopLock.keyKind);
  assert.ok(key);
  assert.deepEqual(cedarHouse.transferItem(workshopLock.keyCabinetId, key.id), { status: 'transferred', slot: 0 });
  const trip = captureRun(cedarHouse);
  const returned = restoreGameCoordinator({ ...trip, occupiedHouseId: null, survivor: { ...trip.survivor, position: front } });
  const unlock = workshopDoor(returned);
  assert.equal(unlock.lock, 'key');
  returned.toggleInventory();
  assert.equal(returned.interact(unlock).status, 'unavailable');
  assert.equal(returned.dropItem(0, key.id).status, 'dropped');
  returned.closeInventoryPanel();
  assert.equal(returned.interact(unlock).status, 'opening_locked');
  const onGround = returned.getInteractionTarget();
  assert.ok(onGround?.kind === 'drop');
  assert.equal(returned.interact(onGround).status, 'picked_up');

  assert.equal(returned.interact(workshopDoor(returned)).status, 'opening_changed');
  assert.equal(workshopDoor(returned).closed, false);
  assert.equal(returned.interact(workshopDoor(returned)).status, 'opening_changed');
  const reloaded = commit(returned);
  assert.equal(workshopDoor(reloaded).lock, null);
  assert.equal(workshopDoor(reloaded).closed, true);
  assert.deepEqual(reloaded.getState().survivor.inventory[0], key);
  assert.ok(!reloaded.getState().containers[workshopLock.keyCabinetId]!.some(({ id }) => id === key.id));
});

test('the workshop side window gives access to the inside latch without a key', () => {
  const game = createGameCoordinator({ position: { x: 110.66, y: 4.2 }, zombieSpawns: [] });
  const window = game.getInteractionTarget();
  assert.ok(window?.kind === 'opening' && window.object.type === 'window' && window.closed);
  assert.equal(game.interact(window).status, 'opening_changed');
  game.setMovement(project({ x: -1, y: 0 }));
  game.step(760);
  assert.equal(game.getState().occupiedHouseId, workshopLock.houseId);
  const position = game.getState().survivor.position;
  const direction = { x: inside.x - position.x, y: inside.y - position.y };
  game.setMovement(project(direction));
  game.step(Math.hypot(direction.x, direction.y) / 2.55 * 1000);
  const door = workshopDoor(game);
  assert.equal(door.lock, 'inside');
  assert.equal(game.interact(door).status, 'opening_changed');
  assert.equal(workshopDoor(game).closed, false);
  assert.deepEqual(game.getState().lockedDoorIds, []);
});

test('a locked doorway must be the authored workshop door and must be closed', () => {
  const fresh = captureRun(createGameCoordinator());
  const openWorkshop = fresh.closedOpeningIds!.filter((id) => id !== workshopLock.doorId);
  for (const snapshot of [
    { ...fresh, closedOpeningIds: openWorkshop },
    { ...fresh, lockedDoorIds: ['house_a_door'] },
  ]) {
    assert.equal(inspectSaveRecord(saveRecord(1, { id: runId, snapshot })).kind, 'damaged');
  }

  const { lockedDoorIds: _locks, containers, ...old } = fresh;
  const snapshot = {
    ...old, closedOpeningIds: openWorkshop,
    containers: Object.fromEntries(Object.entries(containers).map(([id, items]) => [
      id, items.filter(({ kind }) => kind !== workshopLock.keyKind && kind !== 'board' && kind !== 'hammer'),
    ])),
  };
  const previous = { ...saveRecord(1, { id: runId, snapshot }), schemaVersion: 4 };
  const read = inspectSaveRecord(previous);
  assert.equal(read.kind, 'ready');
  assert.deepEqual(read.run.snapshot.lockedDoorIds, []);
  assert.deepEqual(read.run.snapshot.closedOpeningIds, openWorkshop);
  assert.deepEqual(Object.fromEntries(Object.entries(read.run.snapshot.containers).map(([id, items]) => [
    id, items.filter(({ kind }) => kind !== 'board' && kind !== 'hammer'),
  ])), snapshot.containers);
});
