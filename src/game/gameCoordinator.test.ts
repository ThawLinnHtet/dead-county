import assert from 'node:assert/strict';
import test from 'node:test';
import { createGameCoordinator } from './gameCoordinator.ts';
import { initiallyClosed, project } from './world.ts';

test('a new run starts on unobstructed floor inside House A', () => {
  const game = createGameCoordinator();
  const { survivor, occupiedHouseId } = game.getState();

  assert.equal(occupiedHouseId, 'house_a');
  assert.deepEqual(survivor.position, { x: 10.7, y: 7.2 });
  assert.equal(survivor.gait, 'idle');
});

test('WASD follows the screen while cardinal and diagonal travel share a logical speed', () => {
  const start = { x: 19, y: 10 };
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

  for (let ticks = 0; ticks < 22; ticks += 1) {
    game.step(100);
    const target = game.getInteractionTarget();
    if (target?.kind === 'opening' && target.id === 'house_a_door' && target.closed) game.interact(target);
  }
  const outside = game.getState();

  assert.equal(outside.occupiedHouseId, null);
  assert.ok(outside.survivor.position.x > 15);
  assert.equal(outside.activeTimeMs, 2200);

  game.setMovement({ x: -1, y: -1 });
  for (let ticks = 0; ticks < 22; ticks += 1) game.step(100);
  const inside = game.getState();

  assert.equal(inside.occupiedHouseId, 'house_a');
  assert.ok(Math.hypot(inside.survivor.position.x - start.x, inside.survivor.position.y - start.y) < .0001);
  assert.equal(inside.activeTimeMs, 4400);
});

test('occupancy stays stable while the survivor shuffles across the threshold', () => {
  const game = createGameCoordinator({
    position: { x: 13.99, y: 7.7 }, closedOpeningIds: initiallyClosed.filter((id) => id !== 'house_a_door'),
  });
  assert.equal(game.getState().occupiedHouseId, 'house_a');

  game.setMovement({ x: 2, y: 1 });
  assert.equal(game.step(25).occupiedHouseId, 'house_a');
  assert.equal(game.step(22).occupiedHouseId, null);

  game.setMovement({ x: -2, y: -1 });
  assert.equal(game.step(47).occupiedHouseId, null);
  assert.equal(game.step(25).occupiedHouseId, 'house_a');
});

test('both survivors start with the same fresh state and retain their selected identity in play', () => {
  for (const characterId of ['survivor_male', 'survivor_female'] as const) {
    const game = createGameCoordinator({ characterId });
    const { survivor, occupiedHouseId, activeTimeMs } = game.getState();

    assert.equal(survivor.characterId, characterId);
    assert.equal(occupiedHouseId, 'house_a');
    assert.equal(activeTimeMs, 0);
    assert.equal(survivor.health, 100);
    assert.equal(survivor.stamina, 100);
    assert.equal(survivor.hunger, 0);
    assert.equal(survivor.thirst, 0);
    assert.deepEqual(survivor.inventory, Array(12).fill(null));
    assert.equal(survivor.equippedWeaponId, null);

    game.setMovement({ x: 1, y: 1 });
    assert.equal(game.step(100).survivor.characterId, characterId);
  }
});

test('Pause freezes the current run and Resume clears held movement', () => {
  const game = createGameCoordinator();
  game.setMovement({ x: 1, y: 1 }, true);
  const before = game.step(100);

  game.handleEscape();
  assert.equal(game.getPauseState().foregroundPanel, 'pause');
  assert.strictEqual(game.step(2000), before);
  game.setMovement({ x: 1, y: 1 }, true);

  game.resume();
  const resumed = game.step(100);
  assert.equal(resumed.activeTimeMs, 200);
  assert.deepEqual(resumed.survivor.position, before.survivor.position);
  game.setMovement({ x: 1, y: 1 });
  assert.notDeepEqual(game.step(100).survivor.position, resumed.survivor.position);
});

test('returning restores the foreground panel before offering explicit Resume', () => {
  for (const panel of ['inventory', 'loot', 'map'] as const) {
    const game = createGameCoordinator();
    game.setForegroundPanel(panel);
    game.setTabHidden(true);
    game.setTabHidden(true);
    game.setTabHidden(false);
    game.setTabHidden(false);
    assert.equal(game.getPauseState().foregroundPanel, panel);

    game.resume();
    game.handleEscape();
    assert.equal(game.getPauseState().foregroundPanel, 'pause');
    game.handleEscape();
    assert.equal(game.step(100).activeTimeMs, 0);

    game.resume();
    assert.equal(game.step(100).activeTimeMs, 100);
  }
});

test('save completion clears only the save hold after a tab interruption', () => {
  const game = createGameCoordinator();
  game.handleEscape();
  game.setSavePending(true);
  game.setTabHidden(true);
  game.setSavePending(false);
  game.resume();
  assert.equal(game.step(100).activeTimeMs, 0);
  game.setTabHidden(false);
  assert.equal(game.getPauseState().foregroundPanel, 'pause');
  assert.equal(game.getPauseState().resumeRequired, true);

  game.setSavePending(true);
  game.resume();
  assert.equal(game.step(100).activeTimeMs, 0);
  game.setSavePending(false);
  assert.equal(game.step(100).activeTimeMs, 0);
  game.resume();
  assert.equal(game.step(100).activeTimeMs, 100);
});

test('ordinary Escape dismisses one foreground panel in a continuously visible tab', () => {
  const game = createGameCoordinator();
  game.setForegroundPanel('inventory');
  game.setForegroundPanel('map');
  assert.equal(game.getPauseState().foregroundPanel, 'inventory');

  game.handleEscape();
  assert.equal(game.getPauseState().foregroundPanel, null);
  assert.equal(game.step(100).activeTimeMs, 100);
  game.handleEscape();
  assert.equal(game.step(100).activeTimeMs, 100);
  game.handleEscape();
  assert.equal(game.step(100).activeTimeMs, 200);
});

test('the map freezes the run and closes without releasing independent holds', () => {
  const game = createGameCoordinator();
  game.setMovement({ x: 1, y: 1 }, true);
  const before = game.step(100);

  game.toggleMap();
  assert.equal(game.getPauseState().foregroundPanel, 'map');
  game.setMovement({ x: 1, y: 1 }, true);
  assert.strictEqual(game.step(2500), before);
  assert.equal(game.getInteractionTarget(), null);

  game.setSavePending(true);
  game.closeMap();
  assert.equal(game.getPauseState().foregroundPanel, null);
  assert.equal(game.getPauseState().savePending, true);
  assert.strictEqual(game.step(2500), before);

  game.setSavePending(false);
  assert.deepEqual(game.step(100).survivor.position, before.survivor.position);
  assert.equal(game.getState().activeTimeMs, 200);
});

test('toggling the map keeps other foreground panels and restores interrupted maps before Resume', () => {
  const game = createGameCoordinator();
  game.toggleInventory();
  game.toggleMap();
  game.closeMap();
  assert.equal(game.getPauseState().foregroundPanel, 'inventory');
  game.closeInventoryPanel();

  game.toggleMap();
  game.setTabHidden(true);
  game.setTabHidden(false);
  assert.equal(game.getPauseState().foregroundPanel, 'map');
  game.toggleMap();
  assert.equal(game.getPauseState().foregroundPanel, 'pause');
  assert.equal(game.step(1250).activeTimeMs, 0);
  game.resume();
  assert.equal(game.step(100).activeTimeMs, 100);
});
