import { at, box, floor, inset, nearDepth, noise, screenShape, shape, stroke } from './isometricDrawing';
import { lawnVariation } from './terrainTexture';
import { drawParkedCar, drawTree } from './sceneryProps';
import { details, mapWidth, outdoorProps, project } from './world';
import type { MapObject } from './world';

type Art = Phaser.GameObjects.Graphics;

export function drawTerrainDetail(ground: Art, x: number, y: number, tile: number) {
  const seed = x * 123 + y * 793;
  if (tile === 3 && noise(seed) > .88) {
    const p = at(x + .1 + noise(seed + 8) * .55, y + .23 + noise(seed + 16) * .4);
    stroke(ground, 0x272a27, [p, at(p.x + .18, p.y + .12), at(p.x + .2, p.y + .29), at(p.x + .34, p.y + .31)], 1, .5);
  }
  if (tile === 4 && x >= 14 && x <= 23 && y < 22 && noise(seed) > .4) {
    for (let index = 0; index < 4; index += 1) {
      const leaf = seed + index * 71;
      const p = at(x + noise(leaf + 12) * .13, y + .13 + noise(leaf + 19) * .74);
      stroke(ground, index === 0 ? 0x5f6542 : 0x806445, [
        p, at(p.x + .025 + noise(leaf) * .05, p.y + .032),
      ], 1.6, .78);
    }
  }
  if (tile > 2) return;
  const growth = lawnVariation(x + 16, y - 12);
  const patches = noise(seed) > 1 - growth * .67 ? 2 : 0;
  for (let index = 0; index < patches; index += 1) {
    const px = x + .15 + noise(seed + index * 13 + 10) * .7;
    const py = y + .15 + noise(seed - index * 17 - 6) * .7;
    grassTuft(ground, px, py, seed + index * 211, .72 + growth * .38);
  }
}

function grassTuft(art: Art, x: number, y: number, seed: number, size: number) {
  const foot = project({ x, y });
  const base = { x: Math.round(foot.x), y: Math.round(foot.y) };
  art.fillStyle(0x35442f, .35).fillEllipse(base.x + 1, base.y + 1, 8 * size, 3 * size);
  for (let blade = 0; blade < 3; blade += 1) {
    const offset = (blade - 1) * 2;
    const leaning = offset * 1.5 + (noise(seed + blade * 29) - .46) * 4;
    const height = (2.4 + noise(seed + blade * 73) * 4.2) * size;
    screenShape(art, [0x727d4c, 0x8a8e57, 0x52623b][blade]!, [
      { x: base.x + offset, y: base.y }, { x: base.x + offset + 1.25, y: base.y - 1 },
      { x: base.x + leaning, y: base.y - height },
    ], .84);
  }
}

export function drawScenery(scene: Phaser.Scene) {
  const ground = scene.add.graphics().setDepth(-5100);
  for (let y = 1.2; y < 17; y += 1.55) {
    floor(ground, { x: 20.42, y, width: .083, height: .6 }, 0xb29455, 0, .68);
  }
  for (const x of [17.99, 22.98]) {
    stroke(ground, 0x8b877a, [at(x, 0), at(x, 17)], 2, .42);
  }
  for (let x = 18.15; x < 22.9; x += .55) {
    floor(ground, { x, y: 18.12, width: .28, height: .72 }, 0xb4ac92, 0, .52);
  }
  for (let x = 25.4; x < mapWidth - .7; x += 1.55) {
    floor(ground, { x, y: 19.42, width: .6, height: .083 }, 0xb29455, 0, .54);
  }
  for (const detail of details) {
    if (detail.type !== 'overgrowth') continue;
    for (let index = 0; index < detail.width * 14; index += 1) {
      const x = detail.x + noise(index * 61) * detail.width;
      const y = detail.y + noise(index * 23) * detail.height;
      grassTuft(ground, x, y, Math.round(x * 127 + y * 587) + index, 1.25);
    }
  }
  for (const object of outdoorProps) {
    const art = scene.add.graphics().setDepth(nearDepth(object));
    if ((object.type === 'fence' || object.type === 'privacy_fence') && object.x < 18 && object.y < 22) {
      drawStarterFenceGround(ground, object);
    }
    if (object.type === 'tree') drawTree(art, ground, object);
    if (object.type === 'car') drawParkedCar(art, ground, object);
    if (object.type === 'road_barrier') roadBarrier(art, object);
    if (object.type === 'fence') fence(art, object);
    if (object.type === 'privacy_fence') privacyFence(art, object);
    if (object.type === 'porch_rail') porchRail(art, object);
    if (object.type === 'post') box(art, object, 33, [0xac9a79, 0x776a54, 0x9a896c]);
    if (object.type === 'mailbox') {
      box(art, inset(object, .067), 18, [0x9e8d6d, 0x5b5142, 0x897660]);
      box(art, inset(object, -.075), 8, [0x9e9a88, 0x65665b, 0x817e6e], 16);
    }
  }
}

function drawStarterFenceGround(ground: Art, rect: MapObject) {
  const tall = rect.type === 'privacy_fence';
  const alongX = rect.width > rect.height;
  const start = at(rect.x + (alongX ? 0 : rect.width), rect.y + (alongX ? rect.height : 0));
  const end = at(rect.x + rect.width, rect.y + rect.height);
  const east = tall ? .96 : .48;
  const south = tall ? .58 : .29;
  for (const [scale, opacity] of [[1, .26], [.73, .14]] as const) {
    shape(ground, 0x22291e, [start, end,
      at(end.x + east * scale, end.y + south * scale),
      at(start.x + east * scale, start.y + south * scale),
    ], opacity);
  }
  const length = alongX ? rect.width : rect.height;
  const seed = Math.floor(rect.x * 127 + rect.y * 587);
  for (let i = 0; i < length * 7; i += 1) {
    const along = noise(seed + i * 37) * length;
    const verge = -.11 - noise(seed + i * 89) * .23;
    const x = rect.x + (alongX ? along : verge);
    const y = rect.y + (alongX ? verge : along);
    grassTuft(ground, x, y, seed + i * 113, .7 + noise(seed + i * 43) * .48);
  }
}

function roadBarrier(art: Art, rect: MapObject) {
  const alongX = rect.width > rect.height;
  const length = alongX ? rect.width : rect.height;
  box(art, rect, 9, [0x958a73, 0x696559, 0x786e5f]);
  box(art, inset(rect, .065), 10, [0xaaa28b, 0x726e61, 0x827966], 9);
  for (let offset = .25; offset < length - .2; offset += .74) {
    const x = rect.x + (alongX ? offset : rect.width);
    const y = rect.y + (alongX ? rect.height : offset);
    const farX = x + (alongX ? .20 : 0);
    const farY = y + (alongX ? 0 : .20);
    stroke(art, 0xb19a58, [at(x, y, 5), at(farX, farY, 13)], 3);
  }
}

function privacyFence(art: Art, rect: MapObject) {
  const alongX = rect.width > rect.height;
  const length = alongX ? rect.width : rect.height;
  const plank = (offset: number, span: number) => ({
    x: rect.x + (alongX ? offset : 0),
    y: rect.y + (alongX ? 0 : offset),
    width: alongX ? span : rect.width,
    height: alongX ? rect.height : span,
  });
  box(art, rect, 42, [0x9d9176, 0x615b4d, 0x77705d]);
  for (let offset = 0; offset < length - .02; offset += .16) {
    const light = noise(Math.round(offset * 271)) > .52;
    box(art, plank(offset, Math.min(.145, length - offset)), light ? 46 : 44,
      [0xa2967c, 0x6c6656, light ? 0x8b8069 : 0x7e7562]);
  }
  for (let offset = 0; offset < length; offset += 1.68) {
    box(art, inset(plank(offset, .18), -.025), 49, [0xa69b81, 0x625f51, 0x8f8772]);
  }
}

function porchRail(art: Art, rect: MapObject) {
  const color = [0xbab6a5, 0x868279, 0xa29d8f] as const;
  box(art, rect, 3, color, 7);
  box(art, inset(rect, -.025), 3, color, 20);
  for (let offset = .035; offset < rect.width - .02; offset += .19) {
    box(art, { ...rect, x: rect.x + offset, width: Math.min(.055, rect.width - offset) }, 13, color, 8);
  }
}

function fence(art: Art, rect: MapObject) {
  const alongX = rect.width > rect.height;
  const length = alongX ? rect.width : rect.height;
  const interval = (from: number, width: number) => ({
    x: rect.x + (alongX ? from : 0),
    y: rect.y + (alongX ? 0 : from),
    width: alongX ? width : rect.width,
    height: alongX ? rect.height : width,
  });
  for (const base of [6, 17]) box(art, inset(rect, .03), 3, [0x7c7766,0x5e594d,0x6f6a5c], base);
  for (let offset = .03; offset < length - .15; offset += .265) {
    const light = noise(Math.floor(offset * 197)) > .62;
    box(art, interval(offset, .12), light ? 24 : 23, [0xa7a18d, 0x777261, light ? 0x9f9a86 : 0x8d8979]);
  }
}
