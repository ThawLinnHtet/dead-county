import assert from 'node:assert/strict';
import test from 'node:test';
import { createGameCoordinator, restoreGameCoordinator } from './gameCoordinator.ts';
import type { GameCoordinator } from './gameCoordinator.ts';
import type { WorldPoint } from './world.ts';
import { zombieConfig } from './zombie.ts';
import type { ZombieSpawn } from './zombie.ts';
import { bleedingDamagePerMs } from './survival.ts';
import { batConfig, beginAttack, lowStaminaRecoveryMs, meleeWeapons, shoveConfig } from './combat.ts';
import { knifeCabinetId } from './items.ts';
import { project } from './world.ts';

const survivorPosition = { x: 11.9, y: 9.15 };
const cabinet = 'starter_container';

function spawn(id: string, position: WorldPoint): ZombieSpawn {
  return { id, position, destination: position };
}

function equipBat(game: GameCoordinator) {
  const bat = game.getState().containers[cabinet]![0]!;
  assert.equal(game.search(cabinet), true);
  assert.deepEqual(game.transferItem(cabinet, bat.id), { status: 'transferred', slot: 0 });
  assert.equal(game.toggleEquip(0, bat.id), true);
  game.closeInventoryPanel();
}

test('a living zombie physically blocks the survivor during its bite wind-up', () => {
  const position = { x: 12.5, y: 9.15 };
  const game = createGameCoordinator({ position: survivorPosition, zombieSpawns: [spawn('blocking-zombie', position)] });
  game.step(1);
  assert.equal(game.getState().zombies[0]!.attack?.phase, 'windup');
  game.setMovement({ x: 2, y: 1 });
  for (let tick = 0; tick < 25; tick += 1) game.step(16);
  assert.equal(game.getState().survivor.health, 100);
  assert.ok(game.getState().survivor.position.x <= position.x - .46);
});

test('the kitchen knife equips from the quick strip and its faster swing uses shorter reach', () => {
  const knife = meleeWeapons.kitchen_knife;
  const origin = { x: 22.1, y: 20.4 };
  for (const [distance, hits] of [[.65, true], [1.06, false]] as const) {
    const target = { x: origin.x + distance, y: origin.y };
    const fresh = createGameCoordinator({ position: origin, zombieSpawns: [spawn('target', target)] });
    const state = fresh.getState();
    const item = state.containers[knifeCabinetId]!.find(({ kind }) => kind === 'kitchen_knife')!;
    const game = restoreGameCoordinator({
      ...state,
      zombies: state.zombies.map((zombie) => ({ ...zombie, attack: beginAttack({ x: -1, y: 0 }, zombieConfig.bite) })),
      containers: { ...state.containers, [knifeCabinetId]: state.containers[knifeCabinetId]!.filter(({ id }) => id !== item.id) },
      survivor: { ...state.survivor, inventory: [item, ...state.survivor.inventory.slice(1)] },
    });
    assert.equal(game.activateQuickSlot(0, item.id), 'equipped');
    game.setReady(true);
    game.aimAt(target);
    const preview = game.getMeleeAimPreview();
    assert.ok(preview?.center);
    assert.ok(Math.abs(preview.center.x - origin.x - knife.reach) < 1e-9);
    assert.equal(!!preview.target, hits);
    const health = state.zombies[0]!.health;
    assert.equal(game.startMeleeSwing(target), true);
    assert.equal(game.step(knife.windupMs - 1).zombies[0]!.health, health);
    assert.equal(game.step(1).zombies[0]!.health, health - (hits ? knife.damage : 0));
    assert.equal(game.step(knife.contactMs + knife.recoveryMs).survivor.attack, null);
  }
});

test('a shove interrupts a bite and gives a short opening for an ordinary swing', () => {
  const target = { x: 12.48, y: 9.15 };
  const game = createGameCoordinator({ position: survivorPosition, zombieSpawns: [spawn('target', target)] });
  equipBat(game);
  game.aimAt(target);
  assert.equal(game.step(1).zombies[0]!.attack?.phase, 'windup');
  assert.equal(game.startShove(), true);
  const down = game.step(shoveConfig.windupMs);
  assert.equal(down.zombies[0]!.attack?.kind, 'knockdown');
  game.setMovement(project({ x: 1, y: 0 }));
  game.step(shoveConfig.contactMs + shoveConfig.recoveryMs);
  game.setMovement({ x: 0, y: 0 });
  assert.equal(game.startMeleeSwing(down.zombies[0]!.position), true);
  const hit = game.step(batConfig.windupMs);
  assert.equal(hit.survivor.health, 100);
  assert.equal(hit.zombies[0]!.health, down.zombies[0]!.health - batConfig.damage);
  assert.deepEqual(hit.zombies[0]!.position, down.zombies[0]!.position);
  assert.equal(hit.zombies[0]!.attack?.kind, 'knockdown');
  game.step(hit.zombies[0]!.attack!.remainingMs);
  assert.notEqual(game.getState().zombies[0]!.attack?.kind, 'knockdown');
});

test('world pointer movement aims without attacking and cannot redirect a committed swing', () => {
  const game = createGameCoordinator({ position: survivorPosition, zombieSpawns: [] });
  const left = { x: 10.9, y: 9.15 };
  const right = { x: 12.9, y: 9.15 };
  game.aimAt(left);
  const idle = game.step(16).survivor;
  assert.deepEqual(idle.facing, { x: -1, y: 0 });
  assert.equal(idle.facingLeft, true);
  assert.equal(idle.attack, null);
  game.aimAt(survivorPosition);
  assert.deepEqual(game.step(16).survivor.facing, idle.facing);

  equipBat(game);
  assert.equal(game.startMeleeSwing(right), true);
  game.aimAt(left);
  assert.deepEqual(game.step(800).survivor.facing, { x: 1, y: 0 });
  game.step(16);
  assert.deepEqual(game.getState().survivor.facing, { x: 1, y: 0 });
  game.aimAt(left);
  game.toggleInventory();
  game.aimAt(left);
  game.closeInventoryPanel();
  assert.deepEqual(game.step(16).survivor.facing, { x: 1, y: 0 });
  game.aimAt(left);
  assert.deepEqual(game.step(16).survivor.facing, idle.facing);
});

test('the bat commits world aim and damages only the ordinal winner among equal targets', () => {
  const target = { x: 12.7, y: 9.15 };
  const zombies = [spawn('a-zombie', target), spawn('Z-zombie', target)];
  for (const zombieSpawns of [zombies, [...zombies].reverse()]) {
    const game = createGameCoordinator({ position: survivorPosition, zombieSpawns });
    equipBat(game);
    const initial = game.getState().zombies[0]!.health;
    assert.equal(game.startMeleeSwing(target), true);
    assert.equal(game.startMeleeSwing({ x: 11, y: 9.15 }), false);
    game.step(100);
    assert.ok(game.getState().zombies.every(({ health }) => health === initial));
    assert.equal(game.getLastBatContact(), null);
    game.step(250);
    const damage = game.getState().zombies.filter(({ health }) => health < initial);
    assert.deepEqual(damage.map(({ id }) => id), ['Z-zombie']);
    const contact = game.getLastBatContact();
    assert.ok(contact);
    assert.equal(contact.zombieId, damage[0]!.id);
    assert.equal(contact.timeMs, damage[0]!.lastBatHitAtMs);
    assert.deepEqual(contact.origin, survivorPosition);
    assert.ok(contact.position.x < damage[0]!.position.x);
    game.step(250);
    assert.equal(game.getState().zombies.find(({ id }) => id === 'Z-zombie')?.health, damage[0]!.health);
    assert.strictEqual(game.getLastBatContact(), contact);
  }
});

test('the bat guide previews manual aim, commits through wind-up, and clears during pause or contact', () => {
  const right = { x: 12.7, y: 9.15 };
  const left = { x: 10.9, y: 9.15 };
  const game = createGameCoordinator({
    position: survivorPosition, zombieSpawns: [spawn('a-zombie', right), spawn('Z-zombie', right)],
  });
  game.setReady(true);
  assert.equal(game.getMeleeAimPreview(), null);
  equipBat(game);
  assert.equal(game.getMeleeAimPreview(), null);
  game.setReady(true);
  game.aimAt(right);
  const preview = game.getMeleeAimPreview();
  assert.ok(preview?.center);
  assert.ok(Math.abs(preview.center.x - survivorPosition.x - batConfig.reach) < 1e-9);
  assert.equal(preview.target?.id, 'Z-zombie');
  game.aimAt(left);
  assert.equal(game.getMeleeAimPreview()?.target, null);
  assert.ok(game.getMeleeAimPreview()!.center!.x < survivorPosition.x);

  game.toggleInventory();
  assert.equal(game.getMeleeAimPreview(), null);
  game.closeInventoryPanel();
  assert.equal(game.getMeleeAimPreview(), null);
  game.setReady(true);
  assert.equal(game.startMeleeSwing(right), true);
  game.aimAt(left);
  const locked = game.getMeleeAimPreview();
  assert.ok(locked?.committed);
  assert.deepEqual(locked.center, preview.center);
  assert.equal(locked.target, null);
  const contact = game.step(batConfig.windupMs);
  assert.equal(game.getMeleeAimPreview(), null);
  assert.deepEqual(contact.zombies.filter(({ lastBatHitAtMs }) => lastBatHitAtMs !== null).map(({ id }) => id), ['Z-zombie']);
  game.step(batConfig.contactMs + batConfig.recoveryMs);
  assert.ok(game.getMeleeAimPreview());
  game.setReady(false);
  assert.equal(game.getMeleeAimPreview(), null);
});

test('a closed door clips the bat guide and hides a target inside the nominal swing radius', () => {
  const position = { x: 13.36, y: 8.28 };
  const target = { x: 14.48, y: 8.28 };
  const fresh = createGameCoordinator({ position: survivorPosition, zombieSpawns: [spawn('porch', target)] });
  equipBat(fresh);
  const initial = fresh.getState();
  const game = restoreGameCoordinator({ ...initial, survivor: { ...initial.survivor, position } });
  game.setReady(true);
  game.aimAt(target);
  const blocked = game.getMeleeAimPreview();
  assert.ok(blocked?.center && blocked.center.x < 13.9);
  assert.equal(blocked.arc[Math.floor(blocked.arc.length / 2)], null);
  assert.equal(blocked.target, null);
  const door = game.getInteractionTarget();
  assert.ok(door?.kind === 'opening' && door.closed);
  assert.equal(game.interact(door).status, 'opening_changed');
  assert.equal(game.getMeleeAimPreview()?.target?.id, 'porch');
});

test('two simultaneous bites reach contact once each and a nonlethal bite preserves the swing', () => {
  const game = createGameCoordinator({
    position: survivorPosition,
    zombieSpawns: [
      spawn('first', { x: 12.5, y: 9.15 }),
      spawn('second', { x: 12.5, y: 9.24 }),
    ],
  });
  equipBat(game);
  game.step(200);
  assert.equal(game.getState().survivor.health, 100);
  assert.ok(game.getState().zombies.every(({ attack }) => attack?.phase === 'windup'));
  game.step(250);
  assert.equal(game.startMeleeSwing({ x: 12.5, y: 9.15 }), true);
  game.step(175);
  const { survivor, zombies } = game.getState();
  assert.equal(survivor.health, 56);
  assert.equal(survivor.attack?.phase, 'windup');
  assert.ok(zombies.every(({ attack }) => attack?.phase === 'contact' && attack.damageApplied));
  game.step(75);
  assert.ok(Math.abs(game.getState().survivor.health - (56 - 75 * bleedingDamagePerMs)) < 1e-8);
  assert.equal(game.getState().survivor.attack?.damageApplied, true);
});


test('the locked arc favors centerline then distance, while a wall blocks an otherwise reachable target', () => {
  const game = createGameCoordinator({
    position: survivorPosition,
    zombieSpawns: [
      spawn('closer-but-off-center', { x: 12.42, y: 8.9 }),
      spawn('center-farther', { x: 12.645, y: 9.15 }),
      spawn('center-nearer', { x: 12.55, y: 9.15 }),
    ],
  });
  equipBat(game);
  game.step(1);
  assert.equal(game.startMeleeSwing({ x: 13, y: 9.15 }), true);
  assert.deepEqual(game.step(250).zombies.filter(({ lastBatHitAtMs }) => lastBatHitAtMs !== null).map(({ id }) => id),
    ['center-nearer']);

  const blocked = createGameCoordinator({
    position: { x: 13.62, y: 9.6 },
    zombieSpawns: [spawn('outside', { x: 14.30, y: 9.6 })],
  });
  equipBat(blocked);
  assert.equal(blocked.startMeleeSwing({ x: 14.30, y: 9.6 }), true);
  assert.equal(blocked.step(250).survivor.attack?.damageApplied, false);
  assert.equal(blocked.getState().zombies[0]!.lastBatHitAtMs, null);
  assert.equal(blocked.getLastBatContact(), null);
});

test('strike knockback leaves a living zombie committed, and bite contact rechecks its new reach', () => {
  const game = createGameCoordinator({
    position: survivorPosition,
    zombieSpawns: [
      spawn('knocked-back', { x: 12.55, y: 9.15 }),
      spawn('still-in-reach', { x: 12.56, y: 9.24 }),
    ],
  });
  equipBat(game);
  game.step(1);
  assert.equal(game.startMeleeSwing({ x: 13, y: 9.15 }), true);
  const wounded = game.step(250).zombies[0]!;
  assert.ok(wounded.health > 0 && wounded.lastBatHitAtMs !== null);
  assert.equal(wounded.attack?.phase, 'windup');
  const contact = game.step(175);
  assert.equal(contact.survivor.health, 78);
  assert.equal(contact.zombies[0]!.attack?.phase, 'contact');
  assert.equal(contact.zombies[0]!.attack?.damageApplied, false);
  assert.equal(contact.zombies[1]!.attack?.damageApplied, true);
});

test('an empty Stamina meter permits a swing and slow steps through recovery', () => {
  const game = createGameCoordinator({ position: survivorPosition, zombieSpawns: [] });
  equipBat(game);
  for (let tick = 0; game.getState().survivor.stamina > 0 && tick < 100; tick += 1) {
    const side = tick % 2 === 0 ? 1 : -1;
    game.setMovement({ x: 2 * side, y: side }, true);
    game.step(50);
  }
  const exhausted = game.getState().survivor;
  assert.equal(exhausted.stamina, 0);
  assert.equal(game.startMeleeSwing(exhausted.position), true);
  assert.equal(game.getState().survivor.stamina, 0);
  assert.deepEqual(game.getState().survivor.attack?.direction, exhausted.facing);

  game.setMovement({ x: 2, y: 1 }, false);
  const slowStep = game.step(50).survivor;
  assert.equal(slowStep.gait, 'walk');
  assert.ok(slowStep.position.x > exhausted.position.x && slowStep.position.x - exhausted.position.x < .12);
  game.setMovement({ x: 0, y: 0 });
  const recovery = game.step(450).survivor;
  assert.equal(recovery.attack?.phase, 'recovery');
  game.setMovement({ x: -2, y: -1 }, true);
  assert.equal(game.step(50).survivor.gait, 'walk');
  game.step(250);
  assert.equal(game.getState().survivor.attack?.remainingMs, lowStaminaRecoveryMs);
  game.step(lowStaminaRecoveryMs);
  assert.equal(game.getState().survivor.attack, null);
  assert.equal(game.step(50).survivor.gait, 'walk');
  game.setMovement({ x: 0, y: 0 }, false);
  game.step(900);
  game.setMovement({ x: 2, y: 1 }, true);
  assert.equal(game.step(50).survivor.gait, 'sprint');
});

test('a swing immediately slows a sprint without spending Stamina, and held Shift resumes it after recovery', () => {
  const game = createGameCoordinator({ position: survivorPosition, zombieSpawns: [] });
  equipBat(game);
  game.setMovement({ x: 2, y: 1 }, true);
  const sprinting = game.step(50).survivor;
  assert.equal(sprinting.gait, 'sprint');
  assert.equal(game.startMeleeSwing({ x: 13, y: 9.15 }), true);
  assert.equal(game.getState().survivor.gait, 'walk');
  const slowStep = game.step(50).survivor;
  assert.equal(slowStep.gait, 'walk');
  assert.ok(slowStep.stamina >= sprinting.stamina);
  assert.ok(slowStep.position.x - sprinting.position.x < .12);
  game.setMovement({ x: 0, y: 0 }, true);
  game.step(750);
  game.setMovement({ x: 2, y: 1 }, true);
  assert.equal(game.step(50).survivor.gait, 'sprint');
});

test('overlays freeze committed attacks and reject attack commands until play resumes', () => {
  const game = createGameCoordinator({ position: survivorPosition, zombieSpawns: [] });
  const pointer = { x: 13, y: 9.15 };
  assert.equal(game.startMeleeSwing(pointer), false);
  equipBat(game);
  for (const panel of ['inventory', 'loot', 'map'] as const) {
    game.setForegroundPanel(panel);
    assert.equal(game.startMeleeSwing(pointer), false);
    game.handleEscape();
  }
  game.handleEscape();
  assert.equal(game.startMeleeSwing(pointer), false);
  game.resume();

  assert.equal(game.startMeleeSwing(pointer), true);
  game.step(150);
  game.handleEscape();
  const paused = game.getState();
  assert.strictEqual(game.step(1500), paused);
  game.resume();
  assert.equal(game.step(99).survivor.attack?.phase, 'windup');
  assert.equal(game.step(1).survivor.attack?.phase, 'contact');
});

test('a killed zombie and a dead survivor cannot complete or start further attacks', () => {
  const target = { x: 12.5, y: 9.15 };
  const fighter = createGameCoordinator({ position: survivorPosition, zombieSpawns: [spawn('target', target)] });
  equipBat(fighter);
  for (let swing = 0; swing < 3; swing += 1) {
    assert.equal(fighter.startMeleeSwing(target), true);
    for (let frame = 0; frame < 16; frame += 1) fighter.step(50);
  }
  const corpse = fighter.getState().zombies[0]!;
  assert.equal(corpse.health, 0);
  assert.equal(corpse.attack, null);
  assert.equal(corpse.moving, false);
  const afterDeath = fighter.getState().survivor.health;
  assert.equal(fighter.getState().survivor.bleeding, true);
  assert.strictEqual(fighter.step(1500).zombies[0], corpse);
  assert.ok(Math.abs(fighter.getState().survivor.health - (afterDeath - 1500 * bleedingDamagePerMs)) < 1e-8);

  const bitten = createGameCoordinator({
    position: survivorPosition,
    characterId: 'survivor_female',
    zombieSpawns: Array.from({ length: 5 }, (_, index) => spawn('biter-' + index, target)),
  });
  equipBat(bitten);
  bitten.step(50);
  bitten.step(350);
  assert.equal(bitten.startMeleeSwing(target), true);
  const deaths: NonNullable<ReturnType<GameCoordinator['getState']>['gameOver']>[] = [];
  const unsubscribe = bitten.subscribe(() => {
    const { gameOver } = bitten.getState();
    if (gameOver) deaths.push(gameOver);
  });
  // Feed a long frame across contact and verify that none of its remaining time counts.
  const final = bitten.step(5000);
  assert.equal(final.survivor.health, 0);
  assert.equal(final.survivor.attack, null);
  assert.deepEqual(final.gameOver, { survivorId: 'survivor_female', finalActiveTimeMs: 475 });
  assert.equal(bitten.startMeleeSwing(target), false);
  bitten.toggleMap();
  bitten.toggleInventory();
  bitten.handleEscape();
  assert.equal(bitten.getPauseState().foregroundPanel, null);
  assert.strictEqual(bitten.step(1000), final);
  assert.deepEqual(deaths, [final.gameOver]);
  unsubscribe();
});
