import assert from 'node:assert/strict';
import test from 'node:test';
import { createGameCoordinator } from './gameCoordinator.ts';
import type { GameCoordinator } from './gameCoordinator.ts';
import { houses, project, roofs } from './world.ts';
import type { WorldPoint } from './world.ts';
import type { ZombieAppearanceId } from './zombie.ts';

const porchA = { x: 15.36, y: 8.3 };
const junction = { x: 15.34, y: 18.51 };
const sidewalkB = { x: 26.55, y: 18.51 };
const kitchenB = { x: 26.55, y: 13.75 };
const kitchenC = { x: 41.05, y: 14.55 };
const streetC = { x: 41.05, y: 18.51 };
const cabinetC = 'house_c_kitchen_cabinet';
// Cross south of the parked car to avoid the zombies on the near sidewalk.
const houseCApproach = [
  { x: 28, y: 18.51 }, { x: 28, y: 24 }, { x: 41.05, y: 24 }, streetC, kitchenC,
];

function walkTo(
  game: GameCoordinator, destination: WorldPoint, options: { sprint?: boolean; observe?: () => void } = {},
) {
  const start = game.getState().survivor.position;
  const offset = { x: destination.x - start.x, y: destination.y - start.y };
  const duration = Math.hypot(offset.x, offset.y) / (options.sprint ? 4.2 : 2.55) * 1000;
  game.setMovement(project(offset), options.sprint);
  for (let elapsed = 0; elapsed < duration; elapsed += 50) {
    game.step(Math.min(50, duration - elapsed));
    options.observe?.();
  }
  game.setMovement({ x: 0, y: 0 });
  const { position } = game.getState().survivor;
  assert.ok(Math.hypot(position.x - destination.x, position.y - destination.y) < .05,
    `Could not reach ${JSON.stringify(destination)} from ${JSON.stringify(start)}. Stopped at ${JSON.stringify(position)}.`);
}

test('a survivor can walk from House A into House C, transfer its essentials, and sprint back to the street', () => {
  assert.deepEqual(houses.map(({ name }) => name), ['house_a', 'house_b', 'house_c']);
  assert.deepEqual(roofs.map(({ name }) => name), houses.map(({ name }) => name));
  const game = createGameCoordinator();
  const food = game.getState().containers[cabinetC]?.find(({ kind }) => kind === 'canned_food');
  const water = game.getState().containers[cabinetC]?.find(({ kind }) => kind === 'water_bottle');
  assert.ok(food && water, 'the fresh kitchen cabinet contains food and water');

  for (const point of [{ x: 10.7, y: 8.3 }, porchA, junction, sidewalkB, ...houseCApproach]) {
    walkTo(game, point);
  }

  assert.equal(game.getState().occupiedHouseId, 'house_c');
  const target = game.getInteractionTarget();
  assert.ok(target?.id === cabinetC);
  assert.deepEqual(game.interact(target), { status: 'searched' });
  assert.deepEqual(game.transferItem(cabinetC, food.id), { status: 'transferred', slot: 0 });
  assert.deepEqual(game.transferItem(cabinetC, water.id), { status: 'transferred', slot: 1 });
  assert.equal(game.getState().survivor.inventory[0], food);
  assert.equal(game.getState().survivor.inventory[1], water);
  assert.deepEqual(game.getState().containers[cabinetC], []);
  game.closeInventoryPanel();
  for (const exitPoint of [{ x: 43.1, y: 14.42 }, { x: 46.2, y: 14.42 }, { x: 46.2, y: 17.85 }]) {
    walkTo(game, exitPoint, { sprint: true });
  }
  const escaped = game.getState();
  assert.equal(escaped.occupiedHouseId, null);
  assert.ok(escaped.survivor.health > 0);
  assert.ok(escaped.survivor.stamina < 100);
});

test('fresh starts for both survivors share one authored roster, roam paths and container stock', () => {
  const male = createGameCoordinator({ characterId: 'survivor_male' });
  const female = createGameCoordinator({ characterId: 'survivor_female' });
  const fresh = male.getState();
  for (const game of [female, createGameCoordinator(), createGameCoordinator({ characterId: 'survivor_female' })]) {
    const state = game.getState();
    assert.equal(state.activeTimeMs, 0);
    assert.deepEqual(state.zombies, fresh.zombies);
    assert.deepEqual(state.containers, fresh.containers);
    assert.deepEqual(state.survivor.position, fresh.survivor.position);
  }

  assert.ok(fresh.zombies.length >= 10 && fresh.zombies.length <= 20);
  assert.deepEqual(new Set(fresh.zombies.map(({ appearanceId }) => appearanceId)), new Set([
    'zombie_civilian', 'zombie_worker', 'zombie_hoodie', 'zombie_female', 'zombie_bloody',
  ]));
  assert.equal(new Set(fresh.zombies.map(({ position }) => JSON.stringify(position))).size, fresh.zombies.length);
  const firstStep = male.step(50);
  assert.deepEqual(firstStep.zombies, female.step(50).zombies);
  for (const zombie of fresh.zombies) {
    assert.equal(zombie.behavior.kind, 'wander');
    assert.ok(zombie.behavior.destination);
    assert.notDeepEqual(firstStep.zombies.find(({ id }) => id === zombie.id)?.position, zombie.position,
      `${zombie.id} can begin its authored wander during the first active step`);
  }
});

test('ordinary pursuit creates more encounter pressure at House C than at House A or either House B approach', () => {
  const starterApproach = [{ x: 10.7, y: 8.3 }, porchA];
  const direct = [...starterApproach, { x: 23.85, y: 10.2 }, { x: 24.1, y: 16.3 }, { x: 26.55, y: 16.95 }, kitchenB];
  const detour = [...starterApproach, junction, sidewalkB, kitchenB];
  const risk = [...starterApproach, junction, sidewalkB, ...houseCApproach];

  function observeRoute(route: readonly WorldPoint[]) {
    const game = createGameCoordinator();
    const seenBy = new Set<string>();
    let peakPursuers = 0;
    function observe() {
      const pursuers = game.getState().zombies.filter(({ behavior }) =>
        behavior.kind === 'chase' && behavior.graceRemainingMs === null,
      );
      peakPursuers = Math.max(peakPursuers, pursuers.length);
      pursuers.forEach(({ id }) => seenBy.add(id));
    }
    for (const point of route) walkTo(game, point, { observe });
    return { peakPursuers, sightings: seenBy.size };
  }

  const houseA = observeRoute([{ x: 11.05, y: 8.68 }]);
  const houseB = [observeRoute(direct), observeRoute(detour)];
  const houseC = observeRoute(risk);
  assert.equal(houseA.sightings, 0);
  assert.ok(houseC.peakPursuers >= 2);
  for (const approach of houseB) {
    assert.ok(houseC.peakPursuers > approach.peakPursuers && houseC.sightings > approach.sightings,
      JSON.stringify({ houseC, houseB }));
  }
});

test('the starter bat is obtainable without combat and an ordinary zombie can later enter', () => {
  const game = createGameCoordinator({ characterId: 'survivor_female' });
  for (let tick = 0; tick < 140; tick += 1) game.step(50);
  walkTo(game, { x: 11.05, y: 8.68 });
  const bat = game.getState().containers.starter_container?.find(({ kind }) => kind === 'baseball_bat');
  assert.ok(bat);
  assert.equal(game.search('starter_container'), true);
  assert.deepEqual(game.transferItem('starter_container', bat.id), { status: 'transferred', slot: 0 });
  assert.equal(game.toggleEquip(0, bat.id), true);
  game.closeInventoryPanel();
  assert.equal(game.getState().survivor.equippedWeaponId, bat.id);
  assert.equal(game.getState().survivor.health, 100);

  for (let tick = 0; tick < 460 && game.getState().survivor.health === 100; tick += 1) game.step(50);
  assert.ok(game.getState().survivor.health < 100, 'an ordinary zombie can later enter and reach the survivor');
});

test('changing only a zombie appearance leaves pursuit, attacks, damage and movement identical', () => {
  const appearances = new Set(createGameCoordinator().getState().zombies.map(({ appearanceId }) => appearanceId));
  function playEncounter(appearanceId: ZombieAppearanceId) {
    const position = { x: 13.3, y: 9.15 };
    const game = createGameCoordinator({
      position: { x: 11.9, y: 9.15 },
      zombieSpawns: [{ id: 'same-zombie', position, destination: position, appearanceId }],
    });
    const bat = game.getState().containers.starter_container![0]!;
    assert.equal(game.search('starter_container'), true);
    assert.deepEqual(game.transferItem('starter_container', bat.id), { status: 'transferred', slot: 0 });
    assert.equal(game.toggleEquip(0, bat.id), true);
    game.closeInventoryPanel();

    return Array.from({ length: 42 }, (_, tick) => {
      if (tick === 20) assert.equal(game.startBatSwing(position), true);
      const { survivor, zombies: [zombie] } = game.step(50);
      assert.ok(zombie);
      const { appearanceId: renderedAppearance, ...gameplay } = zombie;
      assert.equal(renderedAppearance, appearanceId);
      return { zombie: gameplay, survivor };
    });
  }

  const civilian = playEncounter('zombie_civilian');
  assert.ok(civilian.some(({ zombie }) => zombie.moving && zombie.behavior.kind === 'chase'));
  assert.ok(civilian.some(({ zombie }) => zombie.lastBatHitAtMs !== null));
  assert.ok(civilian.some(({ survivor }) => survivor.lastBiteAtMs !== null));
  for (const appearance of appearances) assert.deepEqual(playEncounter(appearance), civilian);
});
