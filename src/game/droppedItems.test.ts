import assert from 'node:assert/strict';
import test from 'node:test';
import { createGameCoordinator } from './gameCoordinator.ts';
import type { GameCoordinator } from './gameCoordinator.ts';
import { project } from './world.ts';

const cabinet = 'starter_container';
const position = { x: 11.9, y: 9.15 };

function equipStarterBat(game: GameCoordinator) {
  const bat = game.getState().containers[cabinet]![0]!;
  assert.equal(game.search(cabinet), true);
  assert.deepEqual(game.transferItem(cabinet, bat.id), { status: 'transferred', slot: 0 });
  assert.equal(game.toggleEquip(0, bat.id), true);
  return bat;
}

test('drop and E recovery move the same equipped bat between the world and the first free slot', () => {
  const game = createGameCoordinator({ position, zombieSpawns: [] });
  const bat = equipStarterBat(game);
  const updates: ReturnType<typeof game.getState>[] = [];
  game.subscribe(() => updates.push(game.getState()));

  assert.equal(game.dropItem(0, bat.id).status, 'dropped');
  assert.equal(game.dropItem(0, bat.id).status, 'unavailable');
  assert.equal(updates.length, 1);
  assert.equal(updates[0]!.survivor.inventory[0], null);
  assert.equal(updates[0]!.survivor.equippedWeaponId, null);
  assert.deepEqual(updates[0]!.droppedItems, [{ item: bat, position }]);

  assert.equal(game.getInteractionTarget(), null);
  game.closeInventoryPanel();
  const target = game.getInteractionTarget()!;
  assert.equal(target.kind, 'drop');
  assert.equal(target.id, bat.id);
  assert.deepEqual(game.interact(target), { status: 'picked_up', slot: 0 });
  assert.equal(game.interact(target).status, 'unavailable');
  assert.equal(game.getInteractionTarget()?.kind, 'container');
  assert.deepEqual(game.getState().droppedItems, []);
  assert.strictEqual(game.getState().survivor.inventory[0], bat);
  assert.equal(game.getState().survivor.equippedWeaponId, null);
  assert.equal(game.startMeleeSwing(position), false);
});

test('a drop beside a wall finds the nearest free space on the reachable side', () => {
  const besideWall = { x: 13.62, y: 9.6 };
  const game = createGameCoordinator({ position: besideWall, zombieSpawns: [] });
  const bat = equipStarterBat(game);
  const bottle = game.getState().containers[cabinet]![0]!;
  assert.deepEqual(game.transferItem(cabinet, bottle.id), { status: 'transferred', slot: 1 });
  assert.equal(game.dropItem(0, bat.id).status, 'dropped');
  assert.equal(game.dropItem(1, bottle.id).status, 'dropped');
  const [first, second] = game.getState().droppedItems;
  assert.deepEqual(first?.position, besideWall);
  assert.equal(second?.item, bottle);
  assert.ok(second.position.x < 13.9, 'the drop stays inside the wall');
  assert.ok(Math.abs(Math.hypot(second.position.x - besideWall.x, second.position.y - besideWall.y) - .34) < 1e-6);
  game.closeInventoryPanel();
  assert.equal(game.interact(game.getInteractionTarget()!).status, 'picked_up');
  const reachable = game.getInteractionTarget()!;
  assert.equal(reachable.id, bottle.id);

  // Walk around the wall through the open doorway and approach from outdoors.
  for (const [direction, distance] of [[{ x: 0, y: -1 }, 1.4], [{ x: 1, y: 0 }, .9], [{ x: 0, y: 1 }, 1.4]] as const) {
    if (direction.x === 1) {
      const door = game.getInteractionTarget();
      assert.ok(door?.kind === 'opening' && door.closed);
      assert.equal(game.interact(door).status, 'opening_changed');
    }
    game.setMovement(project(direction));
    game.step(distance / 2.55 * 1000);
  }
  assert.ok(game.getState().survivor.position.x > 14.04);
  assert.equal(game.getInteractionTarget(), null);
  assert.equal(game.interact(reachable).status, 'unavailable');
});

test('wind-up and recovery protect the equipped bat while another carried item can be dropped', () => {
  const game = createGameCoordinator({ position, zombieSpawns: [] });
  const bat = equipStarterBat(game);
  const bottle = game.getState().containers[cabinet]![0]!;
  assert.deepEqual(game.transferItem(cabinet, bottle.id), { status: 'transferred', slot: 1 });
  game.closeInventoryPanel();
  assert.equal(game.startMeleeSwing(position), true);

  for (const phase of ['windup', 'recovery'] as const) {
    assert.equal(game.getState().survivor.attack?.phase, phase);
    game.toggleInventory();
    const before = game.getState();
    assert.equal(game.toggleEquip(0, bat.id), false);
    assert.equal(game.dropItem(0, bat.id).status, 'swing_in_progress');
    assert.strictEqual(game.step(1000), before);
    if (phase === 'windup') assert.equal(game.dropItem(1, bottle.id).status, 'dropped');
    assert.strictEqual(game.getState().survivor.inventory[0], bat);
    assert.equal(game.getState().survivor.equippedWeaponId, bat.id);
    game.closeInventoryPanel();
    game.step(400);
  }
  assert.equal(game.getState().survivor.attack, null);
  game.toggleInventory();
  assert.equal(game.toggleEquip(0, bat.id), true);
  assert.equal(game.dropItem(0, bat.id).status, 'dropped');
});

test('one contextual target follows distance, preferring a drop when its distance ties a container', () => {
  const game = createGameCoordinator({ position, zombieSpawns: [] });
  const bat = equipStarterBat(game);
  assert.equal(game.dropItem(0, bat.id).status, 'dropped');
  game.closeInventoryPanel();

  game.setMovement(project({ x: 0, y: 1 }));
  game.step(.325 / 2.55 * 1000);
  const tied = game.getInteractionTarget()!;
  assert.equal(tied.id, bat.id);
  game.step(40);
  const nearer = game.getInteractionTarget()!;
  assert.equal(nearer.id, cabinet);
  assert.equal(game.interact(nearer).status, 'searched');
  assert.equal(game.getOpenContainer()?.name, cabinet);
  assert.strictEqual(game.getState().droppedItems[0]?.item, bat);
});

test('equal-distance drops are offered in stable item ID order', () => {
  const game = createGameCoordinator({ position, zombieSpawns: [] });
  const [bat, bottle] = game.getState().containers[cabinet]!;
  assert.equal(game.search(cabinet), true);
  assert.equal(game.transferItem(cabinet, bat!.id).status, 'transferred');
  assert.equal(game.transferItem(cabinet, bottle!.id).status, 'transferred');
  assert.equal(game.dropItem(1, bottle!.id).status, 'dropped');
  game.closeInventoryPanel();
  game.setMovement(project({ x: 1, y: 0 }));
  game.step(.8 / 2.55 * 1000);
  game.toggleInventory();
  assert.equal(game.dropItem(0, bat!.id).status, 'dropped');
  game.closeInventoryPanel();
  game.setMovement(project({ x: -1, y: 0 }));
  game.step(.4 / 2.55 * 1000);

  assert.equal(game.getInteractionTarget()?.id, bat!.id);
  assert.deepEqual(game.interact(game.getInteractionTarget()!), { status: 'picked_up', slot: 0 });
  assert.equal(game.getInteractionTarget()?.id, bottle!.id);
});

test('a full inventory leaves the prompted drop available until a slot is freed', () => {
  const game = createGameCoordinator({
    position,
    zombieSpawns: [],
    containerStock: { [cabinet]: ['baseball_bat', ...Array<'bandage'>(12).fill('bandage')] },
  });
  const [bat, ...bandages] = game.getState().containers[cabinet]!;
  assert.equal(game.search(cabinet), true);
  for (const bandage of bandages.slice(0, 3)) assert.equal(game.transferItem(cabinet, bandage.id).status, 'transferred');
  assert.deepEqual(game.transferItem(cabinet, bat!.id), { status: 'transferred', slot: 3 });
  assert.equal(game.toggleEquip(3, bat!.id), true);
  for (const bandage of bandages.slice(3, 11)) assert.equal(game.transferItem(cabinet, bandage.id).status, 'transferred');

  assert.equal(game.dropItem(3, bat!.id).status, 'dropped');
  assert.deepEqual(game.transferItem(cabinet, bandages[11]!.id), { status: 'transferred', slot: 3 });
  game.closeInventoryPanel();
  const displayed = game.getInteractionTarget()!;
  assert.equal(displayed.id, bat!.id);
  const full = game.getState();
  assert.equal(game.interact(displayed).status, 'inventory_full');
  assert.strictEqual(game.getState(), full);
  assert.equal(game.getInteractionTarget()?.id, bat!.id);

  game.toggleInventory();
  assert.equal(game.dropItem(5, full.survivor.inventory[5]!.id).status, 'dropped');
  game.closeInventoryPanel();
  assert.deepEqual(game.interact(game.getInteractionTarget()!), { status: 'picked_up', slot: 5 });
  assert.strictEqual(game.getState().survivor.inventory[5], bat);
  assert.equal(game.getState().survivor.equippedWeaponId, null);
  assert.strictEqual(game.getState().survivor.inventory[3], full.survivor.inventory[3]);
});

test('when reachable placement is blocked, an equipped item stays in place and can be retried once space clears', () => {
  const game = createGameCoordinator({
    position: { x: 13.62, y: 9.6 },
    zombieSpawns: [],
    containerStock: { [cabinet]: ['baseball_bat', ...Array<'water_bottle'>(60).fill('water_bottle')] },
  });
  const bat = equipStarterBat(game);
  for (const bottle of game.getState().containers[cabinet]!) {
    assert.equal(game.transferItem(cabinet, bottle.id).status, 'transferred');
    if (game.dropItem(1, bottle.id).status === 'cannot_drop') break;
  }
  const blocked = game.getState();
  assert.ok(blocked.survivor.inventory[1], 'nearby ground has run out of valid placement spots');
  assert.equal(game.dropItem(0, bat.id).status, 'cannot_drop');
  assert.strictEqual(game.getState(), blocked);
  assert.strictEqual(blocked.survivor.inventory[0], bat);
  assert.equal(blocked.survivor.equippedWeaponId, bat.id);

  game.closeInventoryPanel();
  const drop = game.getInteractionTarget()!;
  assert.equal(drop.kind, 'drop');
  assert.equal(game.interact(drop).status, 'picked_up');
  game.toggleInventory();
  assert.equal(game.dropItem(0, bat.id).status, 'dropped');
  assert.equal(game.dropItem(0, bat.id).status, 'unavailable');
  assert.equal(game.getState().droppedItems.filter(({ item }) => item.id === bat.id).length, 1);
  assert.equal(game.getState().survivor.equippedWeaponId, null);
});
