import assert from 'node:assert/strict';
import test from 'node:test';
import { createGameCoordinator } from './gameCoordinator.ts';
import type { GameCoordinator } from './gameCoordinator.ts';
import { hasLineOfSight, project } from './world.ts';
import type { WorldPoint } from './world.ts';
import { zombieConfig } from './zombie.ts';

const porchA = { x: 15.36, y: 8.3 };
const porchB = { x: 26.55, y: 16.95 };
const kitchen = { x: 26.55, y: 13.75 };
const cabinet = 'house_b_kitchen_cabinet';
const direct = [{ x: 23.85, y: 10.2 }, { x: 24.1, y: 16.3 }, porchB];
const detour = [{ x: 15.34, y: 18.51 }, { x: 26.55, y: 18.51 }, porchB];

function walkTo(game: GameCoordinator, destination: WorldPoint, observe?: (elapsed: number) => void) {
  const start = game.getState().survivor.position;
  const offset = { x: destination.x - start.x, y: destination.y - start.y };
  const duration = Math.hypot(offset.x, offset.y) / 2.55 * 1000;
  game.setMovement(project(offset));
  for (let elapsed = 0; elapsed < duration; elapsed += 50) {
    const delta = Math.min(50, duration - elapsed);
    game.step(delta);
    observe?.(delta);
  }
  game.setMovement({ x: 0, y: 0 });
  const { position } = game.getState().survivor;
  assert.ok(Math.hypot(position.x - destination.x, position.y - destination.y) < .05,
    `The survivor could not walk to ${JSON.stringify(destination)} from ${JSON.stringify(start)} (stopped at ${JSON.stringify(position)})`);
}

test('both fresh survivors can walk to the kitchen, transfer its guaranteed can and leave', () => {
  for (const [index, route] of [direct, detour].entries()) {
    const game = createGameCoordinator({ characterId: index === 0 ? 'survivor_male' : 'survivor_female' });
    const can = game.getState().containers[cabinet]?.find(item => item.kind === 'canned_food');
    assert.ok(can, 'a fresh House B kitchen cabinet has a can');

    if (route === detour) {
      for (let tick = 0; tick < 60; tick += 1) game.step(50);
    }
    game.setMovement({ x: 0, y: 1 });
    for (let tick = 0; tick < 18 && !game.getSearchTarget(); tick += 1) game.step(50);
    const [bat] = game.getState().containers.starter_container!;
    assert.equal(game.search('starter_container'), true);
    assert.ok(bat);
    assert.deepEqual(game.transferItem('starter_container', bat.id), { status: 'transferred', slot: 0 });
    game.closeInventoryPanel();
    game.toggleInventory();
    assert.equal(game.toggleEquip(0, bat.id), true);
    game.closeInventoryPanel();
    const opening = game.getState();
    assert.equal(opening.survivor.health, 100);
    if (route === detour) {
      game.handleEscape();
      assert.strictEqual(game.step(90_000), opening);
      game.resume();
    }

    for (const point of [{ x: 10.7, y: 8.3 }, porchA, ...route, kitchen]) walkTo(game, point);
    assert.equal(game.getState().occupiedHouseId, 'house_b');
    assert.equal(game.getSearchTarget()?.name, cabinet);
    assert.equal(game.search(cabinet), true);
    assert.deepEqual(game.transferItem(cabinet, can.id), { status: 'transferred', slot: 1 });
    const supplied = game.getState();
    assert.equal(supplied.survivor.inventory[1], can);
    assert.ok(!supplied.containers[cabinet]?.some(item => item.id === can.id));
    if (route === detour) {
      assert.ok(supplied.activeTimeMs >= 15_000 && supplied.activeTimeMs < 40_000);
      assert.ok(supplied.survivor.hunger > opening.survivor.hunger);
      assert.ok(supplied.survivor.thirst > opening.survivor.thirst);
      assert.equal(supplied.survivor.health, 100);
    }
    game.closeInventoryPanel();
    walkTo(game, porchB);
    assert.equal(game.getState().occupiedHouseId, null);
    assert.ok(game.getState().survivor.health > 0);
  }
});

test('the longer detour breaks pursuit and spends less time in sight than the direct crossing', () => {
  function takeRoute(route: readonly WorldPoint[]) {
    const zombiePosition = { x: 17.15, y: 10 };
    const game = createGameCoordinator({
      position: porchA,
      zombieSpawns: [{ id: 'observer', position: zombiePosition, destination: zombiePosition }],
    });
    game.step(50);

    let visibleMs = 0;
    let brokeSight = false;
    let reacquired = false;
    for (const point of route) {
      walkTo(game, point, (elapsed) => {
        const behavior = game.getState().zombies[0]!.behavior;
        if (behavior.kind === 'chase') {
          if (behavior.graceRemainingMs === null) {
            visibleMs += elapsed;
            if (brokeSight) reacquired = true;
          } else {
            brokeSight = true;
          }
        }
      });
    }
    return { elapsed: game.getState().activeTimeMs, visibleMs, brokeSight, reacquired };
  }
  const crossing = takeRoute(direct);
  const covered = takeRoute(detour);
  assert.ok(crossing.elapsed < covered.elapsed);
  assert.ok(covered.brokeSight);
  assert.ok(covered.reacquired);
  assert.ok(covered.visibleMs < crossing.visibleMs, JSON.stringify({ crossing, covered }));
});

test('the detour’s yard fence hides a survivor who is still within detection range', () => {
  const position = { x: 20, y: 10 };
  const game = createGameCoordinator({
    position: porchA,
    zombieSpawns: [{ id: 'fence_pursuer', position, destination: position }],
  });
  assert.ok(hasLineOfSight(position, porchA));
  assert.equal(game.step(50).zombies[0]?.behavior.kind, 'chase');

  let hidden = false;
  walkTo(game, { x: 15.36, y: 9.27 }, () => {
    const { survivor, zombies: [zombie] } = game.getState();
    assert.ok(zombie);
    assert.ok(Math.hypot(zombie.position.x - survivor.position.x, zombie.position.y - survivor.position.y)
      < zombieConfig.detectionDistance);
    if (zombie.behavior.kind === 'chase' && zombie.behavior.graceRemainingMs !== null) {
      assert.ok(!hasLineOfSight(zombie.position, survivor.position));
      assert.notDeepEqual(zombie.behavior.lastKnownPosition, survivor.position);
      hidden = true;
    }
  });
  assert.ok(hidden);
});

test('a pursuer can follow the survivor through House B’s entrance onto the kitchen floor', () => {
  const position = { x: 26.55, y: 19.2 };
  const game = createGameCoordinator({
    position: kitchen,
    zombieSpawns: [{ id: 'supply_pursuer', position, destination: position }],
  });
  for (let step = 0; step < 35; step += 1) {
    const [zombie] = game.step(50).zombies;
    assert.equal(zombie?.behavior.kind, 'chase');
  }
  assert.ok(game.getState().zombies[0]!.position.y < 15);
});
