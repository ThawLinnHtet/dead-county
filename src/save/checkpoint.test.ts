import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGameCoordinator } from '../game/gameCoordinator.ts';
import { checkpointDue, checkpointIntervalMs } from './checkpoint.ts';

test('awake runs checkpoint at the active time interval', () => {
  const game = createGameCoordinator({ zombieSpawns: [] });
  const saved = game.getState();
  assert.equal(checkpointDue(game.step(checkpointIntervalMs - 1), saved), false);
  assert.equal(checkpointDue(game.step(1), saved), true);
  game.handleEscape();
  const nextSave = game.getState();
  assert.equal(checkpointDue(game.step(120_000), nextSave), false);
});

test('an inventory action can checkpoint immediately while Loot has paused time', () => {
  const game = createGameCoordinator({ position: { x: 11.9, y: 9.15 }, zombieSpawns: [] });
  assert.equal(game.search('starter_container'), true);
  const saved = game.getState();
  const [bat] = saved.containers.starter_container!;
  assert.ok(bat);
  assert.equal(game.transferItem('starter_container', bat.id).status, 'transferred');
  const changed = game.getState();
  assert.equal(changed.activeTimeMs, saved.activeTimeMs);
  assert.equal(checkpointDue(changed, saved), true);
  assert.equal(checkpointDue(changed, changed), false);
});

test('sleep checkpoints on entering and waking, and death never requests a live checkpoint', () => {
  const awake = createGameCoordinator({ zombieSpawns: [] }).getState();
  const sleeping = { ...awake, sleep: { bedId: 'bed', remainingMs: 150_000 } };
  assert.equal(checkpointDue(sleeping, awake), true);
  const later = { ...sleeping, sleep: { ...sleeping.sleep, remainingMs: 90_000 }, activeTimeMs: 60_000 };
  assert.equal(checkpointDue(later, sleeping), false);
  const woke = { ...later, sleep: null };
  assert.equal(checkpointDue(woke, later), true);
  const dead = { ...woke, gameOver: { survivorId: awake.survivor.characterId, finalActiveTimeMs: 60_000 } };
  assert.equal(checkpointDue(dead, sleeping), false);
});
