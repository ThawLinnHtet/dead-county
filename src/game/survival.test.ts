import assert from 'node:assert/strict';
import test from 'node:test';
import { createGameCoordinator } from './gameCoordinator.ts';
import { survivalPacing } from './survival.ts';

test('needs and duration advance from the first active step and freeze under every hold', () => {
  const game = createGameCoordinator({ position: { x: 11.9, y: 9.15 }, zombieSpawns: [] });
  const first = game.step(1);
  assert.equal(first.activeTimeMs, 1);
  assert.ok(first.survivor.hunger > 0);
  assert.ok(first.survivor.thirst > 0);
  assert.equal(first.survivor.health, 100);
  const before = game.step(48_000 * survivalPacing - 1);
  assert.ok(before.survivor.health < 100);

  assert.equal(game.search('starter_container'), true);
  assert.strictEqual(game.step(90_000), before);
  game.closeInventoryPanel();

  game.toggleInventory();
  assert.strictEqual(game.step(90_000), before);
  game.closeInventoryPanel();
  game.setForegroundPanel('map');
  assert.strictEqual(game.step(90_000), before);

  game.setTabHidden(true);
  assert.strictEqual(game.step(90_000), before);
  game.setTabHidden(false);
  assert.strictEqual(game.step(90_000), before);
  game.handleEscape();
  assert.equal(game.getPauseState().foregroundPanel, 'pause');
  game.handleEscape();
  assert.strictEqual(game.step(90_000), before);
  game.setSavePending(true);
  game.resume();
  assert.strictEqual(game.step(90_000), before);
  game.setSavePending(false);
  assert.strictEqual(game.step(90_000), before);
  game.resume();

  const after = game.step(1000 * survivalPacing);
  assert.equal(after.activeTimeMs, 49_000 * survivalPacing);
  assert.ok(after.survivor.health < before.survivor.health);
  assert.ok(after.survivor.hunger > before.survivor.hunger);
  assert.ok(after.survivor.thirst > before.survivor.thirst);
});

test('critical needs use the stronger drain, never cue a bite, and end the active run', () => {
  const game = createGameCoordinator({ zombieSpawns: [] });
  assert.equal(game.step(40_000 * survivalPacing).survivor.health, 100);
  const thirstOnly = game.step(8000 * survivalPacing);
  assert.equal(thirstOnly.survivor.health, 74);
  assert.equal(thirstOnly.survivor.hunger, 76.8);
  const both = game.step(3000 * survivalPacing);
  assert.equal(both.survivor.health, 64.25);
  assert.ok(both.survivor.hunger >= 80 && both.survivor.thirst >= 80);
  assert.equal(both.survivor.lastBiteAtMs, null);
  assert.equal(both.gameOver, null);

  const dead = game.step(90_000 * survivalPacing);
  assert.equal(dead.survivor.health, 0);
  assert.equal(dead.survivor.lastBiteAtMs, null);
  assert.ok(Math.abs(dead.activeTimeMs / survivalPacing - 70_769.23) < .01);
  assert.equal(dead.gameOver?.survivorId, 'survivor_male');
  assert.equal(dead.gameOver?.finalActiveTimeMs, dead.activeTimeMs);
  assert.strictEqual(game.step(1000), dead);
  game.handleEscape();
  game.toggleInventory();
  game.setForegroundPanel('map');
  game.setTabHidden(true);
  game.setTabHidden(false);
  assert.equal(game.getPauseState().foregroundPanel, null);
  assert.strictEqual(game.getState(), dead);
});

test('Use is eligible only for a benefit and commits exactly the requested instance and resulting stat', () => {
  const cabinet = 'starter_container';
  const game = createGameCoordinator({
    position: { x: 11.9, y: 9.15 },
    zombieSpawns: [],
    containerStock: { [cabinet]: ['canned_food', 'water_bottle', 'bandage', 'bandage', 'water_bottle'] },
  });
  const [can, water, bandage, spare, refill] = game.getState().containers[cabinet]!;
  assert.ok(can && water && bandage && spare && refill);
  assert.equal(game.search(cabinet), true);
  for (const [slot, item] of [can, water, bandage, spare].entries()) {
    assert.deepEqual(game.transferItem(cabinet, item.id), { status: 'transferred', slot });
  }
  const fullHealth = game.getState();
  assert.strictEqual(game.step(90_000), fullHealth);
  for (const [slot, item] of [can, water, bandage].entries()) {
    assert.equal(game.getItemUse(slot, item.id).status, 'no_benefit');
    assert.equal(game.useItem(slot, item.id).status, 'no_benefit');
    assert.strictEqual(game.getState(), fullHealth);
  }
  game.closeInventoryPanel();
  const critical = game.step(51_000 * survivalPacing);
  assert.equal(critical.survivor.health, 64.25);
  assert.equal(game.useItem(1, water.id).status, 'unavailable');
  game.toggleInventory();
  assert.deepEqual(game.useItem(1, water.id), { status: 'used', stat: 'thirst', value: 40 });
  assert.equal(game.getState().survivor.thirst, 40);
  assert.equal(game.useItem(1, water.id).status, 'unavailable');
  game.closeInventoryPanel();

  const slowerDrain = game.step(1000 * survivalPacing);
  assert.equal(slowerDrain.survivor.health, 61.45);
  assert.equal(slowerDrain.survivor.lastBiteAtMs, null);
  assert.equal(game.search(cabinet), true);
  assert.deepEqual(game.transferItem(cabinet, refill.id), { status: 'transferred', slot: 1 });
  assert.equal(game.useItem(1, water.id).status, 'unavailable');
  const ate = game.useItem(0, can.id);
  assert.equal(ate.status, 'used');
  if (ate.status === 'used') {
    assert.equal(ate.stat, 'hunger');
    assert.equal(ate.value, game.getState().survivor.hunger);
  }
  assert.equal(game.getState().survivor.inventory[1], refill);
  game.closeInventoryPanel();

  game.setMovement({ x: 0, y: -1 }, true);
  const sprinted = game.step(250);
  assert.ok(sprinted.survivor.stamina < 100);
  game.setMovement({ x: 0, y: 0 });
  const rested = game.step(100);
  assert.ok(rested.survivor.stamina > sprinted.survivor.stamina);
  assert.equal(rested.survivor.health, slowerDrain.survivor.health);
  game.setMovement({ x: 0, y: -1 });
  const walked = game.step(100);
  assert.equal(walked.survivor.gait, 'walk');
  assert.ok(walked.survivor.stamina > rested.survivor.stamina);
  assert.equal(walked.survivor.health, rested.survivor.health);

  game.toggleInventory();
  let changes = 0;
  const unsubscribe = game.subscribe(() => {
    changes += 1;
    assert.equal(game.getState().survivor.health, 100);
    assert.equal(game.getState().survivor.inventory[2], null);
  });
  assert.deepEqual(game.useItem(2, bandage.id), { status: 'used', stat: 'health', value: 100 });
  assert.equal(game.useItem(2, bandage.id).status, 'unavailable');
  assert.equal(game.useItem(3, spare.id).status, 'no_benefit');
  assert.equal(game.getState().survivor.inventory[3], spare);
  assert.equal(changes, 1);
  unsubscribe();
});

test('either critical need can be lethal while the other is satisfied', () => {
  for (const need of ['hunger', 'thirst'] as const) {
    const cabinet = 'starter_container';
    const supply = need === 'hunger' ? 'water_bottle' : 'canned_food';
    const game = createGameCoordinator({
      position: { x: 11.9, y: 9.15 },
      zombieSpawns: [],
      containerStock: { [cabinet]: [supply, supply] },
    });
    assert.equal(game.search(cabinet), true);
    const items = game.getState().containers[cabinet]!;
    for (const [slot, item] of items.entries()) {
      assert.deepEqual(game.transferItem(cabinet, item.id), { status: 'transferred', slot });
    }
    game.closeInventoryPanel();

    game.step(39_000 * survivalPacing);
    game.toggleInventory();
    assert.equal(game.useItem(0, items[0]!.id).status, 'used');
    game.closeInventoryPanel();
    if (need === 'hunger') {
      game.step(29_000 * survivalPacing);
      game.toggleInventory();
      assert.equal(game.useItem(1, items[1]!.id).status, 'used');
      game.closeInventoryPanel();
    }

    const dead = game.step(90_000 * survivalPacing);
    const expectedDeathMs = need === 'hunger' ? 85_714.29 : 70_769.23;
    assert.equal(dead.survivor.health, 0);
    assert.equal(dead.survivor.lastBiteAtMs, null);
    assert.ok(Math.abs(dead.activeTimeMs / survivalPacing - expectedDeathMs) < .01);
    assert.ok(dead.survivor[need] >= 80);
    assert.ok(dead.survivor[need === 'hunger' ? 'thirst' : 'hunger'] < 80);
  }
});
