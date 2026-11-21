import assert from 'node:assert/strict';
import test from 'node:test';
import { districtBuildings } from './district.ts';
import { createGameCoordinator, restoreGameCoordinator } from './gameCoordinator.ts';
import { findRoute } from './navigation.ts';
import { dayLengthMs, neighborhoodTime } from './survival.ts';
import { canTraverse, hasLineOfSight, houses, openings, project } from './world.ts';

test('the avenue connects the starter block to six blocks with enterable destinations and finite stock', () => {
  assert.equal(houses.length, 21);
  assert.equal(districtBuildings.filter(({ featured }) => featured).length, 6);
  assert.ok(canTraverse({ x: 48.6, y: 20.4 }, { x: 124, y: 20.4 }));
  for (const { id, name, house, stock } of districtBuildings) {
    const doorstep = { x: house.x + house.width / 2, y: house.y + house.height + 1 };
    const kitchen = { x: house.x + 1.3, y: house.y + 2.15 };
    assert.ok(findRoute(doorstep, kitchen), name);
    const game = createGameCoordinator({ position: kitchen, zombieSpawns: [] });
    const target = game.getInteractionTarget();
    assert.equal(target?.id, `${id}_cabinet`);
    assert.ok(target);
    assert.deepEqual(game.interact(target), { status: 'searched' });
    assert.deepEqual(game.getState().containers[target.id]?.map(({ kind }) => kind), stock);
  }
});

test('closing a door blocks movement and vision only within that run and survives Continue', () => {
  const inside = { x: 13.3, y: 8.28 };
  const outside = { x: 14.55, y: 8.28 };
  const game = createGameCoordinator({ position: inside, zombieSpawns: [] });
  const door = game.getInteractionTarget();
  assert.ok(door?.kind === 'opening' && !door.closed);
  assert.deepEqual(game.interact(door), { status: 'opening_changed' });
  assert.deepEqual(game.interact(door), { status: 'unavailable' });
  const record = game.getState();
  const resumed = restoreGameCoordinator(record);
  assert.ok(resumed.getState().closedOpeningIds.includes(door.id));
  assert.ok(!hasLineOfSight(inside, outside, [door.object]));
  for (const run of [game, resumed]) {
    run.setMovement(project({ x: 1, y: 0 }));
    run.step(1000);
    assert.ok(run.getState().survivor.position.x < door.object.x);
    const closed = run.getInteractionTarget();
    assert.equal(closed?.id, door.id);
    assert.ok(closed?.kind === 'opening' && closed.closed);
    assert.deepEqual(run.interact(closed), { status: 'opening_changed' });
    run.step(1000);
    assert.equal(run.getState().occupiedHouseId, null);
  }
  assert.ok(!createGameCoordinator().getState().closedOpeningIds.includes(door.id));
});

test('a window is a second route into a building after it is opened from outside', () => {
  const opening = openings.find(({ name }) => name === 'lot_2_1_window')!;
  const game = createGameCoordinator({ position: { x: opening.x + .8, y: opening.y + .6 }, zombieSpawns: [] });
  const prompt = game.getInteractionTarget();
  assert.ok(prompt?.kind === 'opening' && prompt.closed);
  assert.equal(prompt.id, opening.name);
  assert.deepEqual(game.interact(prompt), { status: 'opening_changed' });
  game.setMovement(project({ x: -1, y: 0 }));
  game.step(800);
  assert.equal(game.getState().occupiedHouseId, 'lot_2_1');
});

test('sprinting behind cover produces a last heard position and an active-time investigation', () => {
  const start = { x: 15.2, y: 6.2 };
  const hiddenZombie = { x: 13.1, y: 5.8 };
  function run(sprint: boolean) {
    const game = createGameCoordinator({ position: start, zombieSpawns: [{ id: 'listener', position: hiddenZombie, destination: hiddenZombie }] });
    game.setMovement(project({ x: 0, y: 1 }), sprint);
    for (let frame = 0; frame < 9; frame += 1) game.step(50);
    game.setMovement({ x: 0, y: 0 });
    return game;
  }
  assert.equal(run(false).getState().zombies[0]?.behavior.kind, 'wander');
  const heard = run(true);
  const before = heard.getState();
  assert.ok(!hasLineOfSight(before.zombies[0]!.position, before.survivor.position));
  assert.equal(before.zombies[0]?.behavior.kind, 'investigate');
  heard.toggleInventory();
  assert.strictEqual(heard.step(60_000), before);
  const continued = restoreGameCoordinator(before);
  assert.deepEqual(continued.getState().zombies[0]?.behavior, before.zombies[0]?.behavior);
});

test('the run crosses midnight and bandages stop bleeding without advancing paused time', () => {
  const game = createGameCoordinator({ position: { x: 11.9, y: 9.15 }, zombieSpawns: [], containerStock: {
    starter_container: ['bandage', 'water_bottle'],
  } });
  const prompt = game.getInteractionTarget();
  assert.ok(prompt);
  game.interact(prompt);
  const [bandage, water] = game.getState().containers.starter_container!;
  assert.ok(bandage && water);
  game.transferItem(prompt.id, bandage.id);
  game.transferItem(prompt.id, water.id);
  game.closeInventoryPanel();
  assert.deepEqual(neighborhoodTime(0), { day: 1, time: '08:00', darkness: 0 });
  const wounded = restoreGameCoordinator({ ...game.getState(), survivor: { ...game.getState().survivor, health: 84, bleeding: true } });
  wounded.step(3000);
  assert.ok(wounded.getState().survivor.health < 84);
  wounded.toggleInventory();
  assert.deepEqual(wounded.useItem(0, bandage.id), { status: 'used', stat: 'health', value: 100 });
  assert.equal(wounded.getState().survivor.bleeding, false);
  assert.equal(wounded.getState().survivor.inventory[0], null);
  assert.equal(wounded.step(dayLengthMs).activeTimeMs, 3000);
  wounded.closeInventoryPanel();
  wounded.step(dayLengthMs * .41);
  wounded.toggleInventory();
  assert.equal(wounded.useItem(1, water.id).status, 'used');
  wounded.closeInventoryPanel();
  wounded.step(dayLengthMs * .27);
  const nextDay = neighborhoodTime(wounded.getState().activeTimeMs);
  assert.equal(nextDay.day, 2);
  assert.equal(nextDay.darkness, 1);
  assert.ok(wounded.getState().survivor.health > 0);
});
