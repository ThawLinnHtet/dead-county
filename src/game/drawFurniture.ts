import { at, box, floor, inset, nearDepth, stroke } from './isometricDrawing';
import { contains, furniture, houses, project } from './world';
import type { MapObject, WorldRect } from './world';

type Art = Phaser.GameObjects.Graphics;
const wood = [0x8e684b, 0x5e4334, 0x74513b] as const;
const timber = [0x624935, 0x45382c, 0x584331] as const;

export function drawFurniture(scene: Phaser.Scene) {
  const shadows = scene.add.graphics().setDepth(-4900);
  return furniture.map((object) => {
    const center = { x: object.x + object.width / 2, y: object.y + object.height / 2 };
    const houseId = houses.find((house) => contains(house, center))?.name;
    floor(shadows, { ...object, x: object.x + .04, y: object.y + .075 }, 0x30261e, 0, .36);
    const art = scene.add.graphics().setDepth(nearDepth(object));
    if (object.type === 'cabinet') cabinet(art, object);
    if (object.type === 'table') table(art, object);
    if (object.type === 'sofa') sofa(art, object);
    if (object.type === 'bed') bed(art, object);
    if (object.type === 'counter') counter(art, object);
    if (object.type === 'fridge') fridge(art, object);
    return { art, houseId };
  });
}

function cabinet(art: Art, rect: MapObject) {
  box(art, rect, 25, wood);
  box(art, inset(rect, -.035), 3, [0xa17953, 0x684c37, 0x825c43], 24);
  const { x, y, width, height } = rect;
  for (let row = 0; row <= 2; row += 1) {
    const z = 6 + row * 7;
    stroke(art, 0x473629, [at(x + .04, y + height, z - 3), at(x + width, y + height, z - 3)], 1.25);
    stroke(art, 0xc3a37b, [at(x + width * .39, y + height, z + 1), at(x + width * .58, y + height, z + 1)], 1.5);
  }
  box(art, { x: x + .65, y: y + .3, width: .29, height: .22 }, 1, [0xaba084, 0x665b46, 0x746953], 27);
  const p = project(at(x + .25, y + .32));
  art.fillStyle(0x424237).fillEllipse(p.x, p.y - 28, 8, 3);
}

function table(art: Art, rect: WorldRect) {
  const { x, y, width, height } = rect;
  for (const dx of [.08, width - .2]) {
    for (const dy of [.07, height - .17]) {
      box(art, { x: x + dx, y: y + dy, width: .12, height: .09 }, 15, timber);
    }
  }
  box(art, rect, 4, wood, 13);
  const papers = { x: x + .22, y: y + .17, width: .53, height: .3 };
  floor(art, papers, 0xb1a48a, 17);
  for (let row = 0; row < 4; row += 1) {
    stroke(art, 0x766e61, [at(x + .28, y + .22 + row * .054, 17), at(x + .61, y + .22 + row * .054, 17)], .7);
  }
  const p = project(at(x + .96, y + .42));
  art.fillStyle(0x433d33).fillEllipse(p.x, p.y - 17, 8, 4);
  art.fillStyle(0xac9b79).fillEllipse(p.x, p.y - 19, 7, 4);
}

function sofa(art: Art, rect: WorldRect) {
  const { x, y, width, height } = rect;
  const cushion = [0x986854, 0x664335, 0x795243] as const;
  box(art, rect, 10, [0x765040,0x4a362e,0x624338], 3);
  box(art, { x, y, width, height: .27 }, 23, [0x93604c, 0x55382c, 0x795040], 12);
  for (let index = 0; index < 3; index += 1) {
    box(art, { x: x + .2 + index * .57, y: y + .22, width: .55, height: height - .22 }, 6, cushion, 13);
  }
  for (const end of [x, x + width - .2]) {
    box(art, { x: end, y, width: .2, height }, 12, cushion, 13);
  }
  box(art, { x: x + .25, y: y + .23, width: .35, height: .32 }, 6, [0x9c8f68, 0x696149, 0x827752], 19);
}

function bed(art: Art, rect: WorldRect) {
  const { x, y, width, height } = rect;
  box(art, rect, 7, timber, 3);
  box(art, inset(rect, .055), 8, [0xa59d86, 0x77715f, 0x8b806a], 10);
  const blanket = { x: x + .6, y: y + .06, width: width - .66, height: height - .12 };
  box(art, blanket, 2, [0x777e79, 0x4d5756, 0x616863], 18);
  for (let row = .08; row <= blanket.width; row += .13) {
    stroke(art, 0x525f5d, [at(blanket.x + row, blanket.y, 20), at(blanket.x + row, blanket.y + blanket.height, 20)], 1, .55);
  }
  for (const dy of [.13, .92]) {
    box(art, { x: x + .11, y: y + dy, width: .42, height: .63 }, 5, [0xbcb4a5, 0x8f8778, 0xa29a8b], 18);
  }
  box(art, { x, y, width: .08, height }, 30, wood);
}

function counter(art: Art, rect: WorldRect) {
  box(art, rect, 27, timber);
  box(art, inset(rect, -.025), 2, [0x959083, 0x5f6056, 0x79786c], 27);
  const { x, y, width, height } = rect;
  const sink = { x: x + .38, y: y + .12, width: .54, height: .4 };
  floor(art, sink, 0xb5b1a0, 29.1);
  floor(art, inset(sink, .06), 0x4b504b, 29.1);
  stroke(art, 0xc0bdb0, [at(x + .62, y + .19, 30), at(x + .62, y + .19, 37), at(x + .62, y + .28, 37)], 1.7);
  for (let along = .12; along < width - .26; along += .48) {
    stroke(art, 0x342b25, [at(x + along, y + height, 3), at(x + along, y + height, 25)]);
    stroke(art, 0x9b866c, [at(x + along + .09, y + height, 22), at(x + along + .31, y + height, 22)], 1.45);
  }
}

function fridge(art: Art, rect: WorldRect) {
  box(art, rect, 51, [0xa09e8d, 0x71756a, 0x8c897a]);
  const { x, y, width, height } = rect;
  stroke(art, 0x575b51, [at(x + width, y, 31), at(x + width, y + height, 31), at(x, y + height, 31)]);
  stroke(art, 0xbebaa6, [at(x + width, y + .13, 34), at(x + width, y + .13, 46)], 2);
  stroke(art, 0xbebaa6, [at(x + width, y + .13, 18), at(x + width, y + .13, 29)], 2);
}
