import assert from 'node:assert/strict';
import test from 'node:test';
import { captureRun, inspectSaveRecord, saveRecord } from '../save/runSnapshot.ts';
import { createGameCoordinator, restoreGameCoordinator } from './gameCoordinator.ts';
import { firstSafehouseDawnMs, firstSafehouseDuskMs } from './safehouse.ts';
import { dayLengthMs } from './survival.ts';
import { initiallyClosed } from './world.ts';

const runId = '87501de8-fe8a-4d77-89fc-58094fd940dd';
const houseB = { x: 26.3, y: 15.12 };

function justBefore(time: number) {
  const snapshot = captureRun(createGameCoordinator({ position: houseB }));
  return restoreGameCoordinator({
    ...snapshot, activeTimeMs: time - 50,
    zombies: snapshot.zombies.map((zombie) => ({ ...zombie, health: 0, attack: null })),
  });
}

test('a chosen house earns three nights and continues the first night after saving', () => {
  const game = justBefore(firstSafehouseDuskMs);
  assert.equal(game.chooseSafehouse('house_c'), false);
  game.toggleInventory();
  assert.equal(game.chooseSafehouse('house_b'), false);
  game.closeInventoryPanel();
  assert.equal(game.chooseSafehouse('house_b'), true);
  assert.equal(game.chooseSafehouse('house_b'), false);
  game.step(50);
  assert.deepEqual(game.getState().safehouse, { houseId: 'house_b', nights: 0, dawnMs: firstSafehouseDawnMs });
  const saved = inspectSaveRecord(saveRecord(1, { id: runId, snapshot: captureRun(game) }));
  assert.equal(saved.kind, 'ready');
  const continued = restoreGameCoordinator(saved.run.snapshot);
  continued.handleEscape();
  assert.equal(continued.step(200).activeTimeMs, game.getState().activeTimeMs);
  continued.resume();
  continued.step(firstSafehouseDawnMs - firstSafehouseDuskMs);
  assert.deepEqual(continued.getState().safehouse, { houseId: 'house_b', nights: 1, dawnMs: null });

  let snapshot = captureRun(continued);
  for (const night of [2, 3]) {
    // Start the next dusk with the needs handled and all accumulated progress intact.
    const next = restoreGameCoordinator({
      ...snapshot, activeTimeMs: firstSafehouseDuskMs + (night - 1) * dayLengthMs - 50,
      survivor: { ...snapshot.survivor, hunger: 0, thirst: 0 },
    });
    next.step(firstSafehouseDawnMs - firstSafehouseDuskMs + 50);
    snapshot = captureRun(next);
    assert.equal(snapshot.safehouse?.nights, night);
    assert.equal(snapshot.safehouse?.dawnMs, null);
  }
});

test('leaving before dawn forfeits the night, even after returning', () => {
  const game = justBefore(firstSafehouseDuskMs);
  assert.equal(game.chooseSafehouse('house_b'), true);
  const started = game.step(50);
  const openDoor = restoreGameCoordinator({
    ...started, closedOpeningIds: initiallyClosed.filter((id) => id !== 'house_b_door'),
  });
  openDoor.setMovement({ x: -2, y: 1 });
  for (let i = 0; i < 40; i += 1) openDoor.step(50);
  assert.equal(openDoor.getState().occupiedHouseId, null);
  assert.equal(openDoor.getState().safehouse?.dawnMs, null);

  const returned = restoreGameCoordinator({
    ...captureRun(openDoor), activeTimeMs: firstSafehouseDawnMs - 50,
    occupiedHouseId: 'house_b', survivor: { ...openDoor.getState().survivor, position: houseB },
  });
  assert.equal(returned.step(50).safehouse?.nights, 0);
});

test('a board installed at House B retains its identity and cannot also appear in a cupboard', () => {
  const fresh = justBefore(firstSafehouseDuskMs);
  const snapshot = captureRun(fresh);
  const cabinet = 'house_b_living_cabinet';
  const tools = snapshot.containers[cabinet]!.filter(({ kind }) => kind === 'board' || kind === 'hammer');
  const board = tools.find(({ kind }) => kind === 'board')!;
  const game = restoreGameCoordinator({
    ...snapshot, containers: { ...snapshot.containers, [cabinet]: snapshot.containers[cabinet]!.filter((item) => !tools.includes(item)) },
    survivor: { ...snapshot.survivor, inventory: [...tools, ...snapshot.survivor.inventory.slice(2)] },
  });
  game.toggleInventory();
  assert.equal(game.useItem(tools.indexOf(board), board.id).status, 'barricaded');
  game.closeInventoryPanel();
  const saved = captureRun(game);
  assert.equal(saved.doorDefenses?.house_b_door?.boardItemId, board.id);
  const read = (snapshot: typeof saved) => inspectSaveRecord(saveRecord(1, { id: runId, snapshot }));
  assert.equal(read(saved).kind, 'ready');
  assert.equal(read({ ...saved, containers: snapshot.containers }).kind, 'damaged');
});
