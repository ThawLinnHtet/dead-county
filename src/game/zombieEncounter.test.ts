import assert from 'node:assert/strict';
import test from 'node:test';
import { createGameCoordinator } from './gameCoordinator.ts';
import { canOccupy, contains, houses } from './world.ts';

test('the authored street zombie wanders through House A’s open doorway without a sighting', () => {
  const game = createGameCoordinator({ position: { x: 27, y: 21 } });
  const house = houses[0]!;
  const [start] = game.getState().zombies;

  assert.equal(start?.id, 'street_zombie');
  assert.ok(!contains(house, start.position));
  for (let tick = 0; tick < 400; tick += 1) {
    const [zombie] = game.step(50).zombies;
    assert.ok(zombie && canOccupy(zombie.position));
    assert.equal(zombie.behavior.kind, 'wander');
    if (contains(house, zombie.position)) return;
  }
  assert.fail('the zombie stayed outside for 20 seconds of active play');
});

test('a zombie that sees the survivor beyond the open doorway chases through it', () => {
  const game = createGameCoordinator({
    position: { x: 10.7, y: 8.2 },
    zombieSpawns: [{ id: 'porch_zombie', position: { x: 16.2, y: 8.2 }, destination: { x: 19, y: 8.2 } }],
  });
  for (let tick = 0; tick < 22; tick += 1) {
    const [zombie] = game.step(50).zombies;
    assert.ok(zombie && canOccupy(zombie.position));
    assert.equal(zombie.behavior.kind, 'chase');
  }
  assert.ok(contains(houses[0]!, game.getState().zombies[0]!.position));
});

test('a solid wall blocks detection at close range', () => {
  const game = createGameCoordinator({
    position: { x: 13.3, y: 6.9 },
    zombieSpawns: [{ id: 'porch_zombie', position: { x: 15.5, y: 6.9 }, destination: { x: 16, y: 6.9 } }],
  });
  assert.equal(game.step(50).zombies[0]?.behavior.kind, 'wander');
});

test('a clear sight line outside detection range does not start chase', () => {
  const game = createGameCoordinator({
    position: { x: 26, y: 6 },
    zombieSpawns: [{ id: 'street_zombie', position: { x: 18, y: 6 }, destination: { x: 19, y: 6 } }],
  });
  assert.equal(game.step(50).zombies[0]?.behavior.kind, 'wander');
});

function loseSightBehindHouseAWall() {
  const game = createGameCoordinator({
    position: { x: 13.3, y: 8.89 },
    zombieSpawns: [{ id: 'porch_zombie', position: { x: 16.3, y: 8.5 }, destination: { x: 19, y: 8.5 } }],
  });
  let state = game.step(20);
  assert.equal(state.zombies[0]?.behavior.kind, 'chase');
  game.setMovement({ x: -2, y: 1 });
  for (let tick = 0; tick < 24; tick += 1) {
    const previous = state;
    state = game.step(20);
    const behavior = state.zombies[0]?.behavior;
    if (behavior?.kind === 'chase' && behavior.graceRemainingMs !== null) {
      assert.deepEqual(behavior.lastKnownPosition, previous.survivor.position);
      return game;
    }
  }
  assert.fail('the survivor could not break sight behind the wall by the doorway');
}

test('concealed movement leaves the last known position fixed until the first fresh sighting', () => {
  const game = loseSightBehindHouseAWall();
  const lost = game.getState().zombies[0]!.behavior;
  assert.equal(lost.kind, 'chase');
  assert.ok(lost.graceRemainingMs !== null && lost.graceRemainingMs > 0);

  const hidden = game.step(80);
  const hiddenBehavior = hidden.zombies[0]!.behavior;
  assert.equal(hiddenBehavior.kind, 'chase');
  assert.deepEqual(hiddenBehavior.lastKnownPosition, lost.lastKnownPosition);
  assert.notDeepEqual(hidden.survivor.position, lost.lastKnownPosition);
  assert.equal(hiddenBehavior.graceRemainingMs, lost.graceRemainingMs - 80);

  game.setMovement({ x: 2, y: -1 });
  for (let tick = 0; tick < 24; tick += 1) {
    const state = game.step(20);
    const behavior = state.zombies[0]!.behavior;
    if (behavior.kind === 'chase' && behavior.graceRemainingMs === null) {
      assert.deepEqual(behavior.lastKnownPosition, state.survivor.position);
      return;
    }
  }
  assert.fail('the zombie did not reacquire the survivor at the open doorway');
});

test('pursuit grace counts active time and expiry abandons the target in place', () => {
  const game = createGameCoordinator({
    position: { x: 26, y: 8 },
    zombieSpawns: [{ id: 'street_zombie', position: { x: 26, y: 2 }, destination: { x: 26, y: 3 } }],
  });
  assert.equal(game.step(20).zombies[0]?.behavior.kind, 'chase');
  game.setMovement({ x: -2, y: 1 }, true);
  let state = game.getState();
  for (let tick = 0; tick < 55; tick += 1) state = game.step(50);
  const lost = state.zombies[0]!.behavior;
  assert.equal(lost.kind, 'chase');
  assert.ok(lost.graceRemainingMs !== null && lost.graceRemainingMs > 50);
  assert.equal(game.getState(), state);
  assert.equal(game.step(0), state);
  game.handleEscape();
  assert.equal(game.step(lost.graceRemainingMs + 1000), state);
  game.resume();
  game.setMovement({ x: -2, y: 1 }, true);

  state = game.step(lost.graceRemainingMs - 1);
  const oneMillisecondLeft = state.zombies[0]!;
  assert.equal(oneMillisecondLeft.behavior.kind, 'chase');
  assert.equal(oneMillisecondLeft.behavior.graceRemainingMs, 1);
  const expired = game.step(1).zombies[0]!;
  assert.equal(expired.behavior.kind, 'wander');
  assert.deepEqual(expired.position, oneMillisecondLeft.position);

  const roaming = game.step(100).zombies[0]!;
  assert.equal(roaming.behavior.kind, 'wander');
  assert.ok(canOccupy(roaming.position));
  assert.notDeepEqual(roaming.position, expired.position);
});

function distanceBetweenActors(game: ReturnType<typeof createGameCoordinator>): number {
  const { survivor, zombies } = game.getState();
  const zombie = zombies[0]!;
  return Math.hypot(zombie.position.x - survivor.position.x, zombie.position.y - survivor.position.y);
}

test('a pursuer gains on walking but sprinting spends Stamina and opens a gap during chase', () => {
  for (const sprintHeld of [false, true]) {
    const game = createGameCoordinator({
      position: { x: 21, y: 6 },
      zombieSpawns: [{ id: 'street_zombie', position: { x: 18, y: 6 }, destination: { x: 18, y: 6 } }],
    });
    game.setMovement({ x: 2, y: 1 }, sprintHeld);
    const initialGap = distanceBetweenActors(game);
    for (let tick = 0; tick < 12; tick += 1) game.step(50);
    const gap = distanceBetweenActors(game);

    assert.equal(game.getState().zombies[0]?.behavior.kind, 'chase');
    assert.equal(game.getState().survivor.gait, sprintHeld ? 'sprint' : 'walk');
    if (sprintHeld) {
      assert.ok(gap > initialGap && game.getState().survivor.stamina < 100);
    } else {
      assert.ok(gap < initialGap);
      assert.equal(game.getState().survivor.stamina, 100);
    }
  }
});

test('sprint exhaustion requires a new Shift press even after Stamina recovers', () => {
  const game = createGameCoordinator({ position: { x: 26, y: 1 }, zombieSpawns: [] });
  const direction = { x: -2, y: 1 };
  game.setMovement(direction, true);

  let { survivor } = game.step(50);
  assert.equal(survivor.gait, 'sprint');
  for (let tick = 0; tick < 100 && survivor.stamina > 0; tick += 1) {
    ({ survivor } = game.step(50));
  }
  assert.equal(survivor.stamina, 0);
  assert.equal(survivor.gait, 'walk');

  for (let tick = 0; tick < 20; tick += 1) {
    game.setMovement(direction, true);
    ({ survivor } = game.step(50));
    assert.equal(survivor.gait, 'walk');
  }
  assert.ok(survivor.stamina > 0);
  game.setMovement(direction, false);
  game.setMovement(direction, true);
  assert.equal(game.step(50).survivor.gait, 'sprint');
});

test('an obstructed wander goal waits for a retry before choosing a reachable local route', () => {
  const position = { x: 16.2, y: 6.9 };
  const game = createGameCoordinator({
    position: { x: 27, y: 21 },
    zombieSpawns: [{ id: 'porch_zombie', position, destination: { x: 13.97, y: 6.9 } }],
  });
  assert.deepEqual(game.step(50).zombies[0]?.position, position);
  assert.deepEqual(game.step(300).zombies[0]?.position, position);

  for (let tick = 0; tick < 50; tick += 1) {
    const zombie = game.step(50).zombies[0]!;
    assert.ok(canOccupy(zombie.position));
    assert.equal(zombie.behavior.kind, 'wander');
  }
  assert.notDeepEqual(game.getState().zombies[0]?.position, position);
});
