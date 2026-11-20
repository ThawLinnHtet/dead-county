import assert from 'node:assert/strict';
import test from 'node:test';
import { createGameCoordinator } from './gameCoordinator.ts';
import { project } from './world.ts';

test('a new run starts on unobstructed floor inside House A', () => {
  const game = createGameCoordinator();
  const { survivor, occupiedHouseId } = game.getState();

  assert.equal(occupiedHouseId, 'house_a');
  assert.deepEqual(survivor.position, { x: 10.7, y: 7.2 });
  assert.equal(survivor.gait, 'idle');
});

test('WASD follows the screen while cardinal and diagonal travel share a logical speed', () => {
  const start = { x: 17, y: 11 };
  const origin = project(start);
  const directions = [
    { x: 0, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 0 },
    { x: 1, y: 1 }, { x: -1, y: -1 },
  ];

  for (const direction of directions) {
    const game = createGameCoordinator({ position: start });
    game.setMovement(direction);
    const { position, gait } = game.step(400).survivor;
    const screen = project(position);
    const dx = screen.x - origin.x;
    const dy = screen.y - origin.y;

    assert.ok(Math.abs(Math.hypot(position.x - start.x, position.y - start.y) - 1.02) < .0001);
    assert.ok(Math.abs(dx * direction.y - dy * direction.x) < .0001);
    assert.ok(dx * direction.x + dy * direction.y > 0);
    assert.equal(gait, 'walk');
  }
});

test('the front wall outside the opening stops travel and walking settles to idle', () => {
  const game = createGameCoordinator({ position: { x: 13.3, y: 6.2 } });
  game.setMovement({ x: 2, y: 1 });
  const atWall = game.step(1200);
  const blocked = game.step(1200);

  assert.ok(atWall.survivor.position.x > 13.3 && atWall.survivor.position.x < 13.9);
  assert.deepEqual(blocked.survivor.position, atWall.survivor.position);
  assert.equal(blocked.survivor.gait, 'idle');
  assert.equal(blocked.occupiedHouseId, 'house_a');
});

test('the starter cabinet is a solid prop on the living room floor', () => {
  const game = createGameCoordinator({ position: { x: 11.9, y: 9.15 } });
  game.setMovement({ x: -2, y: 1 });
  game.step(1200);
  const { survivor } = game.step(1200);

  assert.equal(survivor.position.x, 11.9);
  assert.ok(survivor.position.y > 9.15 && survivor.position.y < 9.81);
  assert.equal(survivor.gait, 'idle');
});

test('the same open doorway connects House A to the street and back', () => {
  const game = createGameCoordinator();
  const start = game.getState().survivor.position;
  game.setMovement({ x: 1, y: 1 });

  for (let ticks = 0; ticks < 34; ticks += 1) game.step(100);
  const outside = game.getState();

  assert.equal(outside.occupiedHouseId, null);
  assert.ok(outside.survivor.position.x > 18);
  assert.equal(outside.activeTimeMs, 3400);

  game.setMovement({ x: -1, y: -1 });
  for (let ticks = 0; ticks < 34; ticks += 1) game.step(100);
  const inside = game.getState();

  assert.equal(inside.occupiedHouseId, 'house_a');
  assert.ok(Math.hypot(inside.survivor.position.x - start.x, inside.survivor.position.y - start.y) < .0001);
  assert.equal(inside.activeTimeMs, 6800);
});

test('occupancy stays stable while the survivor shuffles across the threshold', () => {
  const game = createGameCoordinator({ position: { x: 13.99, y: 7.7 } });
  assert.equal(game.getState().occupiedHouseId, 'house_a');

  game.setMovement({ x: 2, y: 1 });
  assert.equal(game.step(25).occupiedHouseId, 'house_a');
  assert.equal(game.step(22).occupiedHouseId, null);

  game.setMovement({ x: -2, y: -1 });
  assert.equal(game.step(47).occupiedHouseId, null);
  assert.equal(game.step(25).occupiedHouseId, 'house_a');
});
