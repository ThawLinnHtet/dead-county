import assert from 'node:assert/strict';
import test from 'node:test';
import { createGameCoordinator, restoreGameCoordinator } from '../game/gameCoordinator.ts';
import type { GameCoordinator } from '../game/gameCoordinator.ts';
import { canOccupy, contains, houses, initiallyClosed } from '../game/world.ts';
import type { WorldPoint } from '../game/world.ts';
import type { ZombieState } from '../game/zombie.ts';
import { captureRun, inspectSaveRecord, saveRecord } from './runSnapshot.ts';
import { bleedingDamagePerMs } from '../game/survival.ts';

const runId = '87501de8-fe8a-4d77-89fc-58094fd940dd';
const farAway = { x: 4, y: 2 };
// The navigation grid cell is half a world tile.
const positionTolerance = .001 * .5;

function encounter(survivor: WorldPoint, firstZombie: Partial<ZombieState>, openDoor?: string) {
  const initial = captureRun(createGameCoordinator({
    position: survivor, closedOpeningIds: initiallyClosed.filter((id) => id !== openDoor),
  }));
  return restoreGameCoordinator({
    ...initial,
    zombies: initial.zombies.map((zombie, index) => index === 0 ? { ...zombie, ...firstZombie } : zombie),
  });
}

function pauseAndContinue(original: GameCoordinator) {
  original.handleEscape();
  const saved = captureRun(original);
  const committedRecord = structuredClone(saveRecord(2, { id: runId, snapshot: saved }));
  const read = inspectSaveRecord(committedRecord);
  assert.equal(read.kind, 'ready');
  const continued = restoreGameCoordinator(read.run.snapshot);
  assert.deepEqual(captureRun(continued), saved);
  assert.equal(original.step(60_000).activeTimeMs, saved.activeTimeMs);
  original.resume();
  return continued;
}

function matchedStep(original: GameCoordinator, continued: GameCoordinator, durationMs: number) {
  const resumed = original.step(durationMs);
  const loaded = continued.step(durationMs);
  assert.deepEqual(loaded.survivor, resumed.survivor);
  assert.equal(loaded.activeTimeMs, resumed.activeTimeMs);
  for (const [index, actor] of resumed.zombies.entries()) {
    const { position, walkDistance, ...logicalState } = actor;
    const { position: loadedPosition, walkDistance: loadedWalkDistance, ...loadedState } = loaded.zombies[index]!;
    assert.deepEqual(loadedState, logicalState);
    assert.ok(Math.hypot(loadedPosition.x - position.x, loadedPosition.y - position.y) <= positionTolerance,
      `${actor.id} moved differently at ${loaded.activeTimeMs} ms`);
    assert.ok(Math.abs(loadedWalkDistance - walkDistance) <= positionTolerance);
    assert.ok(canOccupy(loadedPosition));
  }
  return loaded;
}

test('Continue matches Pause and Resume for committed attacks before and after contact', () => {
  const target = { x: 12.4, y: 9.15 };
  for (const elapsed of [130, 460]) {
    const original = encounter({ x: 11.9, y: 9.15 }, { position: target });
    assert.equal(original.search('starter_container'), true);
    const bat = original.getState().containers.starter_container![0]!;
    assert.equal(original.transferItem('starter_container', bat.id).status, 'transferred');
    assert.equal(original.toggleEquip(0, bat.id), true);
    original.closeInventoryPanel();
    original.step(1);
    assert.equal(original.startBatSwing(target), true);
    original.step(elapsed);
    original.setMovement({ x: 0, y: -1 }, true);
    const continued = pauseAndContinue(original);
    const frozen = continued.getState();
    assert.equal(frozen.survivor.attack?.damageApplied, elapsed === 460);
    assert.equal(frozen.zombies[0]!.attack?.damageApplied, elapsed === 460);
    const after = matchedStep(original, continued, 20);
    assert.deepEqual(after.survivor.position, frozen.survivor.position);
    const expected = frozen.survivor.health - (frozen.survivor.bleeding ? 20 * bleedingDamagePerMs : 0);
    assert.ok(Math.abs(after.survivor.health - expected) < 1e-8);
    assert.equal(after.zombies[0]!.health, frozen.zombies[0]!.health);
    for (let tick = 0; tick < 40; tick += 1) matchedStep(original, continued, 20);
  }
});

test('an unreachable wander target keeps its retry interval and chooses again only on active steps', () => {
  const original = encounter(farAway, {
    position: { x: 16.2, y: 6.9 },
    behavior: { kind: 'wander', destination: { x: 13.97, y: 6.9 }, idleRemainingMs: 0 },
  });
  original.step(50);
  original.step(200);
  const continued = pauseAndContinue(original);
  for (let tick = 0; tick < 35; tick += 1) matchedStep(original, continued, 50);
  assert.notEqual(continued.getState().zombies[0]!.behavior.kind, 'chase');
});

test('a saved pursuit toward unreachable cover expires in place on the same active step', () => {
  const original = encounter(farAway, {
    position: { x: 16.2, y: 6.9 },
    behavior: { kind: 'chase', lastKnownPosition: { x: 13.97, y: 6.9 }, graceRemainingMs: 215 },
  });
  original.step(50);
  const continued = pauseAndContinue(original);
  const tracked = continued.getState().zombies[0]!;
  assert.equal(tracked.behavior.kind, 'chase');
  for (const remaining of [115, 65, 15]) {
    const behavior = matchedStep(original, continued, 50).zombies[0]!.behavior;
    assert.equal(behavior.kind, 'chase');
    assert.equal(behavior.graceRemainingMs, remaining);
  }
  const expired = matchedStep(original, continued, 15).zombies[0]!;
  assert.equal(expired.behavior.kind, 'wander');
  assert.deepEqual(expired.position, tracked.position);
});

test('a returning sight line reacquires on the same active step after Continue', () => {
  const visibleSurvivor = { x: 13.3, y: 8.2 };
  const original = encounter(visibleSurvivor, {
    position: { x: 16.3, y: 8.2 },
    behavior: { kind: 'chase', lastKnownPosition: { x: 14.75, y: 8.2 }, graceRemainingMs: 400 },
  }, 'house_a_door');
  const continued = pauseAndContinue(original);
  const acquired = matchedStep(original, continued, 20).zombies[0]!;
  assert.deepEqual(acquired.behavior, { kind: 'chase', lastKnownPosition: visibleSurvivor, graceRemainingMs: null });
});

test('a wandering zombie keeps its doorway route and an idle zombie retains its chosen wait', () => {
  const original = encounter(farAway, {
    position: { x: 16.2, y: 8.2 },
    behavior: { kind: 'wander', destination: { x: 7.2, y: 8.1 }, idleRemainingMs: 0 },
  }, 'house_a_door');
  const idleSnapshot = captureRun(original);
  const game = restoreGameCoordinator({
    ...idleSnapshot,
    zombies: idleSnapshot.zombies.map((actor, index) => index === 1
      ? { ...actor, behavior: { kind: 'wander', destination: null, idleRemainingMs: 625 } }
      : actor),
  });
  game.step(200);
  const continued = pauseAndContinue(game);
  const idle = continued.getState().zombies[1]!;
  assert.deepEqual(idle.behavior, { kind: 'wander', destination: null, idleRemainingMs: 425 });
  const house = houses.find(({ name }) => name === 'house_a')!;
  for (let tick = 0; tick < 90; tick += 1) matchedStep(game, continued, 50);
  const visitor = continued.getState().zombies[0]!;
  assert.ok(contains(house, visitor.position));
  assert.equal(visitor.behavior.kind, 'wander');
  assert.notEqual(continued.getState().zombies[1]!.randomState, idle.randomState);
});
