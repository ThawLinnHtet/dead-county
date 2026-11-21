import assert from 'node:assert/strict';
import test from 'node:test';
import { shoveConfig } from './combat.ts';
import { createGameCoordinator, restoreGameCoordinator } from './gameCoordinator.ts';
import type { GameCoordinator } from './gameCoordinator.ts';
import { project } from './world.ts';

const inside = { x: 13.3, y: 8.28 };
const doorway = 'house_a_door';

function closeDoor(game: GameCoordinator) {
  const door = game.getInteractionTarget();
  assert.ok(door?.kind === 'opening' && door.id === doorway);
  assert.deepEqual(game.interact(door), { status: 'opening_changed' });
}

test('a closed door hides the zombie while its muffled sounds still reach the survivor', () => {
  const outside = { x: 15.8, y: 8.28 };
  const game = createGameCoordinator({ position: inside, zombieSpawns: [] });
  assert.equal(game.canSee(outside), true);
  const audible = game.canHear(outside, 8);
  closeDoor(game);
  assert.equal(game.canSee(outside), false);
  assert.ok(game.canHear(outside, 8) > 0 && game.canHear(outside, 8) < audible);
  assert.equal(game.canSee({ x: 9.4, y: 8.28 }), false);
});

test('sneaking is slower and can pass outside the shorter zombie detection range', () => {
  const origin = { x: 22.1, y: 20.4 };
  const watcher = { x: 27.65, y: 20.4 };
  function approach(quiet: boolean) {
    const game = createGameCoordinator({ position: origin, zombieSpawns: [{ id: 'watcher', position: watcher, destination: watcher }] });
    game.setMovement(project({ x: 1, y: 0 }), false, quiet);
    return game.step(150);
  }
  const walking = approach(false);
  const sneaking = approach(true);
  assert.equal(walking.zombies[0]?.behavior.kind, 'chase');
  assert.equal(sneaking.zombies[0]?.behavior.kind, 'wander');
  assert.equal(sneaking.survivor.gait, 'sneak');
  assert.ok(walking.survivor.position.x > sneaking.survivor.position.x);
});

test('ready movement retains aim and a paused shove keeps its remaining active time', () => {
  const position = { x: 22.1, y: 20.4 };
  const zombie = { x: 23, y: 20.4 };
  const game = createGameCoordinator({ position, zombieSpawns: [{ id: 'target', position: zombie, destination: zombie }] });
  game.setReady(true);
  game.aimAt(zombie);
  game.setMovement(project({ x: 0, y: -1 }), true);
  game.step(35);
  assert.equal(game.getState().survivor.gait, 'walk');
  assert.equal(game.getState().survivor.stamina, 100);
  assert.ok(game.getState().survivor.facing.x > .99);
  game.setMovement({ x: 0, y: 0 });
  assert.equal(game.startShove(), true);
  const start = game.getState();
  assert.equal(start.survivor.stamina, 100 - shoveConfig.staminaCost);
  game.toggleInventory();
  assert.equal(game.isReady(), false);
  assert.equal(game.startShove(), false);
  assert.strictEqual(game.step(5000), start);
  game.closeInventoryPanel();
  const contact = game.step(shoveConfig.windupMs);
  assert.equal(contact.survivor.attack?.kind, 'shove');
  assert.equal(contact.zombies[0]?.health, start.zombies[0]?.health);
  assert.ok(contact.zombies[0]!.position.x > start.zombies[0]!.position.x);
  assert.equal(contact.zombies[0]?.attack?.phase, 'recovery');
});

test('a pursuer approaches and forces an ordinary door, while one wedge buys extra time', () => {
  const outside = { x: 16.15, y: 8.28 };
  function chase(wedged: boolean) {
    const initial = createGameCoordinator({ position: inside, zombieSpawns: [{ id: 'pursuer', position: outside, destination: outside }] });
    assert.equal(initial.step(25).zombies[0]?.behavior.kind, 'chase');
    closeDoor(initial);
    const closed = initial.getState();
    const game = wedged ? restoreGameCoordinator({
      ...closed, survivor: { ...closed.survivor, inventory: [{ id: 'wedge', kind: 'door_wedge' }, ...closed.survivor.inventory.slice(1)] },
    }) : initial;
    if (wedged) {
      game.toggleInventory();
      assert.deepEqual(game.useItem(0, 'wedge'), { status: 'wedged' });
      assert.equal(game.getState().survivor.inventory[0], null);
      assert.equal(game.useItem(0, 'wedge').status, 'unavailable');
      game.closeInventoryPanel();
    }
    for (let frame = 0; frame < 40; frame += 1) game.step(50);
    return game;
  }
  const ordinary = chase(false).getState();
  assert.ok(!ordinary.closedOpeningIds.includes(doorway));
  const reinforced = chase(true);
  const backed = reinforced.getState();
  assert.ok(backed.closedOpeningIds.includes(doorway));
  assert.equal(backed.doorDefenses[doorway]?.wedged, true);
  assert.ok(backed.doorDefenses[doorway]!.pressureMs > 1000);
  reinforced.handleEscape();
  assert.strictEqual(reinforced.step(5000), backed);
  reinforced.resume();
  reinforced.step(50);
  const continued = restoreGameCoordinator(backed).step(50);
  assert.deepEqual(continued.doorDefenses, reinforced.getState().doorDefenses);
});

test('weight limits preserve container items and a backpack can only be removed safely', () => {
  const cabinet = 'starter_container';
  const game = createGameCoordinator({
    position: { x: 11.9, y: 9.15 }, zombieSpawns: [],
    containerStock: { [cabinet]: ['backpack', 'water_bottle', 'water_bottle', 'water_bottle', 'water_bottle', 'water_bottle'] },
  });
  const [pack, ...bottles] = game.getState().containers[cabinet]!;
  assert.ok(pack);
  assert.ok(game.search(cabinet));
  assert.deepEqual(game.transferItem(cabinet, pack.id), { status: 'transferred', slot: 0 });
  for (const bottle of bottles.slice(0, -1)) assert.equal(game.transferItem(cabinet, bottle.id).status, 'transferred');
  const final = bottles.at(-1)!;
  const before = game.getState();
  assert.deepEqual(game.transferItem(cabinet, final.id), { status: 'too_heavy' });
  assert.strictEqual(game.getState(), before);
  assert.equal(game.togglePack(0, pack.id), 'equipped');
  assert.deepEqual(game.transferItem(cabinet, final.id), { status: 'transferred', slot: 5 });
  assert.equal(game.togglePack(0, pack.id), 'too_heavy');
  assert.equal(game.dropItem(0, pack.id).status, 'dropped');
  assert.equal(game.getState().survivor.equippedPackId, null);
  assert.equal(game.getState().droppedItems[0]?.item.id, pack.id);
});
