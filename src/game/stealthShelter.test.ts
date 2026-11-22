import assert from 'node:assert/strict';
import test from 'node:test';
import { alderShelter } from './district.ts';
import { shoveConfig } from './combat.ts';
import { createGameCoordinator, restoreGameCoordinator } from './gameCoordinator.ts';
import type { GameCoordinator } from './gameCoordinator.ts';
import { canOccupy, initiallyClosed, project } from './world.ts';
import { createZombies } from './zombie.ts';

const inside = { x: 13.3, y: 8.28 };
const doorway = 'house_a_door';

function closeDoor(game: GameCoordinator) {
  const door = game.getInteractionTarget();
  assert.ok(door?.kind === 'opening' && door.id === doorway && !door.closed);
  assert.deepEqual(game.interact(door), { status: 'opening_changed' });
}

test('a closed door hides the zombie while its muffled sounds still reach the survivor', () => {
  const outside = { x: 15.8, y: 8.28 };
  const game = createGameCoordinator({ position: inside, zombieSpawns: [] });
  const door = game.getInteractionTarget();
  assert.ok(door?.kind === 'opening' && door.closed);
  assert.equal(game.interact(door).status, 'opening_changed');
  assert.equal(game.canSee(outside), true);
  const audible = game.listenAt(outside, 8);
  assert.ok(audible && !audible.muffled);
  closeDoor(game);
  assert.equal(game.canSee(outside), false);
  const muffled = game.listenAt(outside, 8);
  assert.ok(muffled?.muffled && muffled.volume > 0 && muffled.volume < audible.volume);
  assert.equal(game.canSee({ x: 9.4, y: 8.28 }), false);
});

test('turning toward an audible off-axis zombie restores distant visibility along a clear line', () => {
  const origin = { x: 18, y: 18.5 };
  const side = { x: 18, y: 23.5 };
  const game = createGameCoordinator({ position: origin, zombieSpawns: [] });
  assert.equal(game.canSee(side), false);
  assert.equal(game.listenAt(side, 8)?.muffled, false);
  game.aimAt(side);
  game.step(16);
  assert.equal(game.canSee(side), true);
});

test('sneaking is slower and can pass outside the shorter zombie detection range', () => {
  const origin = { x: 22.1, y: 20.4 };
  const watcher = { x: 27.65, y: 20.4 };
  function approach(quiet: boolean) {
    const game = createGameCoordinator({ position: origin, zombieSpawns: [{ id: 'watcher', position: watcher, destination: watcher }] });
    game.setMovement(project({ x: 1, y: 0 }), false, quiet);
    return game.step(150);
  }
  const walking = approach(false);
  const sneaking = approach(true);
  assert.equal(walking.zombies[0]?.behavior.kind, 'chase');
  assert.equal(sneaking.zombies[0]?.behavior.kind, 'wander');
  assert.equal(sneaking.survivor.gait, 'sneak');
  assert.ok(walking.survivor.position.x > sneaking.survivor.position.x);
});

test('ready movement retains aim and a paused shove keeps its remaining active time', () => {
  const position = { x: 22.1, y: 20.4 };
  const zombie = { x: 23, y: 20.4 };
  const game = createGameCoordinator({ position, zombieSpawns: [{ id: 'target', position: zombie, destination: zombie }] });
  game.setReady(true);
  game.aimAt(zombie);
  game.setMovement(project({ x: 0, y: -1 }), true);
  game.step(35);
  assert.equal(game.getState().survivor.gait, 'walk');
  assert.equal(game.getState().survivor.stamina, 100);
  assert.ok(game.getState().survivor.facing.x > .99);
  game.setMovement({ x: 0, y: 0 });
  assert.equal(game.startShove(), true);
  const start = game.getState();
  assert.equal(start.survivor.stamina, 100 - shoveConfig.staminaCost);
  game.toggleInventory();
  assert.equal(game.isReady(), false);
  assert.equal(game.startShove(), false);
  assert.strictEqual(game.step(5000), start);
  game.closeInventoryPanel();
  const contact = game.step(shoveConfig.windupMs);
  assert.equal(contact.survivor.attack?.kind, 'shove');
  assert.equal(contact.survivor.stamina, start.survivor.stamina);
  assert.equal(contact.zombies[0]?.health, start.zombies[0]?.health);
  assert.ok(contact.zombies[0]!.position.x > start.zombies[0]!.position.x);
  assert.equal(contact.zombies[0]?.attack?.phase, 'recovery');
});

test('ready side steps and back steps move progressively slower while keeping the same aim', () => {
  const origin = { x: 22.1, y: 20.4 };
  function step(x: number, y: number) {
    const game = createGameCoordinator({ position: origin, zombieSpawns: [] });
    game.setReady(true);
    game.aimAt({ x: origin.x + 8, y: origin.y });
    game.setMovement(project({ x, y }));
    return game.step(160).survivor;
  }
  const [front, side, back] = [step(1, 0), step(0, 1), step(-1, 0)];
  assert.ok(front.walkDistance > side.walkDistance && side.walkDistance > back.walkDistance);
  assert.ok(side.facing.x > .99);
  assert.deepEqual(back.facing, { x: 1, y: 0 });
});

test('a shove uses the available space up to a solid wall', () => {
  const position = { x: 13.33, y: 9.6 };
  const [zombie] = createZombies([{ id: 'wall', position, destination: position }]);
  zombie!.receiveShove({ x: 12.78, y: position.y });
  const displaced = zombie!.getState().position;
  assert.ok(displaced.x > position.x && displaced.x < 13.9);
  assert.ok(canOccupy(displaced));
  assert.equal(zombie!.getState().attack?.kind, 'stagger');
});

test('a pursuer approaches and forces an ordinary door, while one wedge buys extra time', () => {
  const outside = { x: 16.15, y: 8.28 };
  function chase(wedged: boolean) {
    const initial = createGameCoordinator({ position: inside, zombieSpawns: [{ id: 'pursuer', position: outside, destination: outside }] });
    const door = initial.getInteractionTarget();
    assert.ok(door?.kind === 'opening' && door.closed);
    assert.equal(initial.interact(door).status, 'opening_changed');
    assert.equal(initial.step(25).zombies[0]?.behavior.kind, 'chase');
    closeDoor(initial);
    const closed = initial.getState();
    const game = wedged ? restoreGameCoordinator({
      ...closed, survivor: { ...closed.survivor, inventory: [{ id: 'wedge', kind: 'door_wedge' }, ...closed.survivor.inventory.slice(1)] },
    }) : initial;
    if (wedged) {
      game.toggleInventory();
      assert.deepEqual(game.useItem(0, 'wedge'), { status: 'wedged' });
      assert.equal(game.getState().survivor.inventory[0], null);
      assert.equal(game.useItem(0, 'wedge').status, 'unavailable');
      game.closeInventoryPanel();
    }
    for (let frame = 0; frame < 40; frame += 1) game.step(50);
    return game;
  }
  const ordinary = chase(false).getState();
  assert.ok(!ordinary.closedOpeningIds.includes(doorway));
  const reinforced = chase(true);
  const backed = reinforced.getState();
  assert.ok(backed.closedOpeningIds.includes(doorway));
  assert.equal(backed.doorDefenses[doorway]?.wedged, true);
  assert.ok(backed.doorDefenses[doorway]!.pressureMs > 1000);
  reinforced.handleEscape();
  assert.strictEqual(reinforced.step(5000), backed);
  reinforced.resume();
  reinforced.step(50);
  const continued = restoreGameCoordinator(backed).step(50);
  assert.deepEqual(continued.doorDefenses, reinforced.getState().doorDefenses);
});

test('a weakened door reports its strain and reinforcement changes the warning threshold', () => {
  const game = createGameCoordinator({ position: inside, zombieSpawns: [] });
  const closed = game.getState();
  const worn = restoreGameCoordinator({ ...closed, doorDefenses: { [doorway]: { pressureMs: 1130, wedged: false } } });
  const wedged = restoreGameCoordinator({ ...closed, doorDefenses: { [doorway]: { pressureMs: 1130, wedged: true } } });
  const strained = worn.getInteractionTarget();
  const reinforced = wedged.getInteractionTarget();
  assert.ok(strained?.kind === 'opening' && strained.strain === 'failing');
  assert.ok(reinforced?.kind === 'opening' && reinforced.strain === 'intact');
});

test('weight limits preserve container items and a backpack can only be removed safely', () => {
  const cabinet = 'starter_container';
  const game = createGameCoordinator({
    position: { x: 11.9, y: 9.15 }, zombieSpawns: [],
    containerStock: { [cabinet]: ['backpack', 'water_bottle', 'water_bottle', 'water_bottle', 'water_bottle', 'water_bottle'] },
  });
  const [pack, ...bottles] = game.getState().containers[cabinet]!;
  assert.ok(pack);
  assert.ok(game.search(cabinet));
  assert.deepEqual(game.transferItem(cabinet, pack.id), { status: 'transferred', slot: 0 });
  for (const bottle of bottles.slice(0, -1)) assert.equal(game.transferItem(cabinet, bottle.id).status, 'transferred');
  const final = bottles.at(-1)!;
  const before = game.getState();
  assert.deepEqual(game.transferItem(cabinet, final.id), { status: 'too_heavy' });
  assert.strictEqual(game.getState(), before);
  assert.equal(game.togglePack(0, pack.id), 'equipped');
  assert.deepEqual(game.transferItem(cabinet, final.id), { status: 'transferred', slot: 5 });
  assert.equal(game.togglePack(0, pack.id), 'too_heavy');
  assert.equal(game.dropItem(0, pack.id).status, 'dropped');
  assert.equal(game.getState().survivor.equippedPackId, null);
  assert.equal(game.getState().droppedItems[0]?.item.id, pack.id);
});

test('a heavy load drains sprint stamina faster and recovers slower at the same running speed', () => {
  const position = { x: 22.1, y: 20.4 };
  const original = createGameCoordinator({ position, zombieSpawns: [] }).getState();
  const stock = Array.from({ length: 5 }, (_, index) => ({ id: 'water-' + index, kind: 'water_bottle' as const }));
  const heavy = restoreGameCoordinator({
    ...original, survivor: { ...original.survivor, inventory: [...stock, ...original.survivor.inventory.slice(stock.length)] },
  });
  const light = createGameCoordinator({ position, zombieSpawns: [] });
  for (const game of [light, heavy]) {
    game.setMovement(project({ x: 1, y: 0 }), true);
    game.step(330);
    game.setMovement({ x: 0, y: 0 });
  }
  const beforeHeavy = heavy.getState().survivor;
  const beforeLight = light.getState().survivor;
  assert.deepEqual(beforeHeavy.position, beforeLight.position);
  assert.ok(beforeHeavy.stamina < beforeLight.stamina);
  assert.ok(heavy.step(120).survivor.stamina - beforeHeavy.stamina < light.step(120).survivor.stamina - beforeLight.stamina);
});

const alderInside = { x: 68.5, y: 7.2 };
const alderOutside = { x: 68.5, y: 8.58 };
const board = { id: 'board', kind: 'board' } as const;
const hammer = { id: 'hammer', kind: 'hammer' } as const;
const toolsInPockets = [board, hammer, ...Array.from({ length: 10 }, () => null)];

test('a Board requires a reachable closed Alder door from inside and a carried Hammer', () => {
  const { doorId, houseId } = alderShelter;
  const base = createGameCoordinator({ position: alderInside, zombieSpawns: [] }).getState();
  for (const candidate of [
    { position: alderOutside, occupiedHouseId: null, closedOpeningIds: initiallyClosed, hasHammer: true },
    { position: { x: 68.5, y: 4.8 }, occupiedHouseId: houseId, closedOpeningIds: initiallyClosed, hasHammer: true },
    { position: alderInside, occupiedHouseId: houseId, closedOpeningIds: initiallyClosed.filter((id) => id !== doorId), hasHammer: true },
    { position: alderInside, occupiedHouseId: houseId, closedOpeningIds: initiallyClosed, hasHammer: false },
  ]) {
    const { position, occupiedHouseId, closedOpeningIds, hasHammer } = candidate;
    const inventory = [board, hasHammer ? hammer : null, ...toolsInPockets.slice(2)];
    const game = restoreGameCoordinator({ ...base, occupiedHouseId, closedOpeningIds, survivor: { ...base.survivor, position, inventory } });
    game.toggleInventory();
    const before = game.getState();
    assert.equal(game.useItem(0, board.id).status, 'no_benefit');
    assert.strictEqual(game.getState(), before);
  }

  const pack = { id: 'pack', kind: 'backpack' } as const;
  const wedge = { id: 'wedge', kind: 'door_wedge' } as const;
  const setup = createGameCoordinator({
    position: alderInside, zombieSpawns: [{ id: 'listener', position: alderOutside, destination: alderOutside }],
  }).getState();
  const game = restoreGameCoordinator({
    ...setup, packs: { [pack.id]: [hammer] },
    survivor: { ...setup.survivor, inventory: [board, pack, wedge, ...toolsInPockets.slice(3)], equippedPackId: pack.id },
  });
  const staleDoor = game.getInteractionTarget();
  assert.equal(staleDoor?.id, doorId);
  game.toggleInventory();
  assert.equal(game.useItem(0, board.id).status, 'barricaded');
  assert.equal(game.useItem(0, board.id).status, 'unavailable');
  assert.equal(game.useItem(2, wedge.id).status, 'no_benefit');
  const installed = game.getState();
  assert.deepEqual(installed.survivor.inventory.slice(0, 3), [null, pack, wedge]);
  assert.deepEqual(installed.packs[pack.id], [hammer]);
  const heard = installed.zombies[0]!.behavior;
  assert.ok(heard.kind === 'investigate');
  assert.deepEqual(heard.destination, alderInside);
  assert.strictEqual(game.step(10000), installed);

  game.closeInventoryPanel();
  assert.equal(game.interact(staleDoor!).status, 'unavailable');
  const insideDoor = game.getInteractionTarget();
  assert.ok(insideDoor?.kind === 'opening' && insideDoor.barricade === 'inside');
  const outsideGame = restoreGameCoordinator({
    ...installed, occupiedHouseId: null, survivor: { ...installed.survivor, position: alderOutside },
  });
  const outsideDoor = outsideGame.getInteractionTarget();
  assert.ok(outsideDoor?.kind === 'opening' && outsideDoor.barricade === 'outside');
  assert.equal(outsideGame.interact(outsideDoor).status, 'barricade_blocked');
  assert.equal(game.interact(insideDoor).status, 'barricade_removed');
  assert.ok(game.getState().closedOpeningIds.includes(doorId));
  assert.equal(game.getState().doorDefenses[doorId], undefined);

  game.toggleInventory();
  assert.equal(game.useItem(2, wedge.id).status, 'wedged');
  const wedged = game.getState();
  const boarded = restoreGameCoordinator({ ...wedged, survivor: { ...wedged.survivor, inventory: [board, pack, null, ...toolsInPockets.slice(3)] } });
  boarded.toggleInventory();
  assert.equal(boarded.useItem(0, board.id).status, 'no_benefit');
  assert.equal(boarded.getState().survivor.inventory[0], board);
});

test('barricade pressure holds through a pause and a breach wakes the sleeper', () => {
  const { doorId } = alderShelter;
  const setup = createGameCoordinator({
    position: { x: 69.6, y: 4.8 },
    zombieSpawns: [
      { id: 'one', position: { x: 68.2, y: 8.58 }, destination: alderOutside },
      { id: 'two', position: { x: 68.85, y: 8.58 }, destination: alderOutside },
    ],
  }).getState();
  const game = restoreGameCoordinator({
    ...setup, sleep: { bedId: 'lot_1_2_furnishing', remainingMs: 10000 },
    doorDefenses: { [doorId]: { wedged: false, barricaded: true, pressureMs: 3400 } },
    zombies: setup.zombies.map((zombie) => ({
      ...zombie, behavior: { kind: 'chase', graceRemainingMs: 4100, lastKnownPosition: alderInside },
    })),
  });
  game.handleEscape();
  const paused = game.getState();
  assert.strictEqual(game.step(5000), paused);
  game.resume();
  const damaged = game.step(5);
  assert.ok(damaged.sleep);
  assert.ok(damaged.doorDefenses[doorId]!.pressureMs > 3400);
  const door = restoreGameCoordinator({
    ...damaged, sleep: null, survivor: { ...damaged.survivor, position: alderInside },
  }).getInteractionTarget();
  assert.ok(door?.kind === 'opening' && door.strain !== 'intact');
  for (let frame = 0; frame < 50 && game.getState().sleep; frame += 1) game.step(25);
  assert.equal(game.getState().sleep, null);
  assert.equal(game.getState().restNotice, 'danger');
  assert.equal(game.getState().doorDefenses[doorId], undefined);
  assert.ok(!game.getState().closedOpeningIds.includes(doorId));
});
