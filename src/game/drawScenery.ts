import { at, box, floor, inset, nearDepth, noise, screenShape, stroke } from './isometricDrawing';
import { details, groundTiles, mapHeight, mapWidth, outdoorProps, project } from './world';
import type { MapObject } from './world';

type Art = Phaser.GameObjects.Graphics;

export function drawScenery(scene: Phaser.Scene) {
  const ground = scene.add.graphics().setDepth(-5100);
  for (let y = 0; y < mapHeight; y += 1) {
    for (let x = 0; x < mapWidth; x += 1) {
      const seed = x * 123 + y * 793;
      const tile = groundTiles[y * mapWidth + x];
      if (tile === 3 && noise(seed) > .65) {
        const p = at(x + .1 + noise(seed + 8) * .55, y + .23 + noise(seed + 16) * .4);
        stroke(ground, 0x272a27, [p, at(p.x + .18, p.y + .12), at(p.x + .2, p.y + .29), at(p.x + .34, p.y + .31)], 1, .5);
      }
      if (tile > 2) continue;
      const selections = noise(seed) > .72 ? 6 : 2;
      for (let index = 0; index < selections; index += 1) {
        const point = project(at(x + noise(seed + index + 1), y + noise(seed - index - 5)));
        const color = [0x767453, 0x626947, 0x4d5739, 0x91815a][index % 4]!;
        ground.fillStyle(color, .8).fillRect(Math.floor(point.x), Math.floor(point.y), 2 + index % 2, 1);
        if (index % 2 === 0) ground.fillRect(Math.floor(point.x + 1), Math.floor(point.y - 2), 1, 2);
      }
    }
  }

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
      const color = index % 3 === 0 ? 0x8a8156 : 0x535e3e;
      stroke(ground, color, [at(x - .08, y - .05), at(x, y), at(x + .02, y - .15)], 2, .85);
    }
  }
  for (const object of outdoorProps) {
    const art = scene.add.graphics().setDepth(nearDepth(object));
    if (object.type === 'tree') tree(art, ground, object);
    if (object.type === 'car') car(art, ground, object);
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

function tree(art: Art, ground: Art, rect: MapObject) {
  const { x, y } = project({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
  const seed = Math.round(rect.x * 659 + rect.y * 313);
  const height = 57 + noise(seed) * 32;
  ground.fillStyle(0x293327, .33).fillEllipse(x + 20, y + 4, height * 1.17, height * .46);
  box(art, rect, height * .67, [0x635642, 0x544638, 0x63503b]);
  const foliage = [0x353f30, 0x3e4935, 0x485139, 0x545940, 0x626448];
  for (let index = 0; index < 26; index += 1) {
    const angle = index * 2.4;
    const radius = (1 - index / 33) * (.52 + noise(seed + index) * .25);
    const cx = x + Math.cos(angle) * height * radius * .8;
    const cy = y - height + Math.sin(angle) * height * radius * .46;
    const spread = (20 + noise(seed - index) * 13) * height / 70;
    const points = Array.from({ length: 10 }, (_, point) => {
      const turn = point * Math.PI / 5;
      const edge = spread * (.47 + noise(seed + index * 16 + point) * .27);
      return { x: Math.round(cx + Math.cos(turn) * edge), y: Math.round(cy + Math.sin(turn) * edge * .8) };
    });
    screenShape(art, foliage[Math.min(Math.floor(index / 5), 4)]!, points);
    for (let fleck = 0; fleck < 6; fleck += 1) {
      const rx = Math.round(cx + (noise(seed + index * 8 + fleck) - .5) * spread * .7);
      const ry = Math.round(cy + (noise(seed - index * 13 + fleck) - .5) * spread * .5);
      art.fillStyle(fleck % 2 ? 0x727354 : 0x303a2e, .5).fillRect(rx, ry, 3, 2);
    }
  }
}

function car(art: Art, ground: Art, rect: MapObject) {
  floor(ground, inset(rect, -.12), 0x252a27, 0, .5);
  const { x, y, width, height } = rect;
  const rust = [0x896953, 0x61483d, 0x775746] as const;
  for (const offset of [.58, height - .66]) {
    for (const dx of [.02, width - .15]) {
      box(art, { x: x + dx, y: y + offset, width: .2, height: .47 }, 13, [0x343835,0x262827,0x323431]);
    }
  }
  box(art, rect, 13, rust, 5);
  box(art, { x: x + width * .13, y: y + .9, width: width * .74, height: height - 1.91 }, 14,
    [0x7a604f, 0x424f4c, 0x576360], 18);
  box(art, { x: x + width * .18, y: y + 1.12, width: width * .64, height: height - 2.32 }, 2, rust, 32);
  stroke(art, 0xa28b69, [at(x + .07, y + .03, 14), at(x + .28, y + .03, 14)], 3);
  stroke(art, 0x663b30, [at(x + width, y + height - .08, 12), at(x + width - .19, y + height - .08, 12)], 3);
}
