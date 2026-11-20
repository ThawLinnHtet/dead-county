import assert from 'node:assert/strict';
import test from 'node:test';
import { createGameCoordinator } from './gameCoordinator.ts';

const cabinet = 'starter_container';

test('both survivors can walk to the same starter supplies and transfer each instance once', () => {
  for (const characterId of ['survivor_male', 'survivor_female'] as const) {
    const game = createGameCoordinator({ characterId });
    const [bat, bottle] = game.getState().containers[cabinet]!;
    assert.deepEqual(game.getState().containers[cabinet]?.map(item => item.kind), ['baseball_bat', 'water_bottle']);
    assert.equal(game.search(cabinet), false);

    game.setMovement({ x: 0, y: 1 });
    for (let tick = 0; tick < 18 && !game.getSearchTarget(); tick += 1) game.step(50);
    assert.equal(game.getSearchTarget()?.name, cabinet);
    assert.equal(game.search('another_container'), false);
    assert.equal(game.search(cabinet), true);
    const opening = game.getState();
    assert.strictEqual(game.step(1000), opening);

    assert.deepEqual(game.transferItem(cabinet, bat!.id), { status: 'transferred', slot: 0 });
    assert.equal(game.getState().survivor.equippedWeaponId, null);
    assert.deepEqual(game.getState().containers[cabinet], [bottle]);
    assert.deepEqual(game.transferItem(cabinet, bat!.id), { status: 'unavailable' });
    game.handleEscape();
    assert.equal(game.search(cabinet), true);
    assert.deepEqual(game.transferItem(cabinet, bottle!.id), { status: 'transferred', slot: 1 });
    assert.deepEqual(game.getState().survivor.inventory.slice(0, 3), [bat, bottle, null]);

    game.handleEscape();
    assert.equal(game.getSearchTarget(), null);
    assert.equal(game.search(cabinet), false);
    assert.equal(game.toggleEquip(0, bat!.id), false);
    game.toggleInventory();
    assert.equal(game.toggleEquip(0, bat!.id), true);
    assert.equal(game.getState().survivor.equippedWeaponId, bat!.id);
    assert.equal(game.toggleEquip(1, bottle!.id), false);
    assert.equal(game.getState().survivor.thirst, 0);
  }
});

test('a full inventory preserves the selected container item and reports capacity', () => {
  const game = createGameCoordinator({
    position: { x: 11.9, y: 9.15 },
    containerStock: { [cabinet]: Array<'water_bottle'>(13).fill('water_bottle') },
  });
  const items = game.getState().containers[cabinet]!;
  assert.equal(game.search(cabinet), true);
  for (const [slot, item] of items.slice(0, 12).entries()) {
    assert.deepEqual(game.transferItem(cabinet, item.id), { status: 'transferred', slot });
  }
  const full = game.getState();
  assert.deepEqual(game.transferItem(cabinet, items[12]!.id), { status: 'inventory_full' });
  assert.strictEqual(game.getState(), full);
  assert.deepEqual(full.containers[cabinet], [items[12]]);
});

test('search rejects an exterior approach and closing Loot preserves a visibility pause', () => {
  const outside = createGameCoordinator({ position: { x: 11.9, y: 11.6 } });
  assert.equal(outside.search(cabinet), false);

  const game = createGameCoordinator({ position: { x: 11.9, y: 9.15 } });
  assert.equal(game.search(cabinet), true);
  game.setTabHidden(true);
  assert.deepEqual(game.transferItem(cabinet, game.getState().containers[cabinet]![0]!.id), { status: 'unavailable' });
  game.setTabHidden(false);
  game.closeInventoryPanel();
  assert.equal(game.getPauseState().foregroundPanel, 'pause');
  assert.equal(game.step(1000).activeTimeMs, 0);
  game.resume();
  assert.equal(game.step(100).activeTimeMs, 100);
});
