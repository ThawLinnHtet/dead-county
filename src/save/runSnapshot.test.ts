import assert from 'node:assert/strict';
import test from 'node:test';
import { createGameCoordinator, restoreGameCoordinator } from '../game/gameCoordinator.ts';
import { captureRun, inspectSaveRecord, saveRecord } from './runSnapshot.ts';

const runId = '87501de8-fe8a-4d77-89fc-58094fd940dd';

test('a committed snapshot restores changed survivor, inventory, loot, drops and fractional time', () => {
  const original = createGameCoordinator({ characterId: 'survivor_female', position: { x: 11.9, y: 9.15 } });
  const starter = original.getInteractionTarget();
  assert(starter?.kind === 'container');
  assert.deepEqual(original.interact(starter), { status: 'searched' });
  const [bat, water] = original.getState().containers[starter.id]!;
  assert.deepEqual(original.transferItem(starter.id, bat!.id), { status: 'transferred', slot: 0 });
  assert.deepEqual(original.transferItem(starter.id, water!.id), { status: 'transferred', slot: 1 });
  assert.equal(original.toggleEquip(0, bat!.id), true);
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
  assert.deepEqual(state.survivor.inventory[0], bat);
  assert.deepEqual(state.containers[starter.id], []);
  assert.deepEqual(state.droppedItems.map(({ item }) => item), [water]);
  assert.equal(state.activeTimeMs, 17.75);
  assert.equal(state.survivor.gait, 'idle');
  restored.step(16);
  assert.deepEqual(restored.getState().survivor.position, state.survivor.position);
});
