import { at, box, floor, inset, nearDepth, noise, shape, stroke } from './isometricDrawing';
import { details, houses, roofs, walls } from './world';
import type { MapObject, WorldRect } from './world';

const wallHeight = 68;
const cutawayHeight = 11;
type Art = Phaser.GameObjects.Graphics;

export function drawHouse(scene: Phaser.Scene) {
  const ground = scene.add.graphics().setDepth(-5000);
  for (const detail of details) {
    if (detail.type === 'rug') rug(ground, detail);
    if (detail.type === 'porch') porch(ground, detail);
  }
  for (const house of houses) {
    floor(ground, { x: house.x - .09, y: house.y - .09, width: house.width + .18, height: house.height + .18 }, 0x2b271b, 0, .12);
  }

  const nearWalls: { art: Art; houseId: string; depth: number }[] = [];
  for (const wall of walls) {
    const house = houses.find((candidate) => wall.name.startsWith(candidate.name + '_'));
    const front = house && (wall.x > house.x + house.width - .3 || wall.y > house.y + house.height - .3);
    const depth = nearDepth(wall);
    if (front) {
      paintWall(scene.add.graphics().setDepth(depth), wall, cutawayHeight, 0);
      const upper = scene.add.graphics().setDepth(depth + .02);
      paintWall(upper, wall, wallHeight - cutawayHeight, cutawayHeight);
      nearWalls.push({ art: upper, houseId: house.name, depth });
    } else {
      paintWall(scene.add.graphics().setDepth(depth), wall, wall.type === 'partition' ? 28 : wallHeight, 0);
    }
  }

  const roofArt = roofs.map((roof) => {
    const art = scene.add.graphics().setDepth(nearDepth(roof) + .4);
    paintRoof(art, roof);
    return { art, houseId: roof.name };
  });
  return { nearWalls, roofArt };
}

function rug(art: Art, rect: WorldRect) {
  floor(art, rect, 0x473328);
  floor(art, inset(rect, .05), 0x86624b);
  floor(art, inset(rect, .13), 0x5d4239);
  floor(art, inset(rect, .19), 0x855747);
  for (let x = .3; x < rect.width - .2; x += .24) {
    for (let y = .28; y < rect.height - .2; y += .24) {
      const t = noise(Math.floor((x + y * 23) * 31));
      floor(art, { x: rect.x + x, y: rect.y + y, width: .11, height: .095 }, t > .55 ? 0xa58063 : 0x63483d, 0, .46);
    }
  }
}

function porch(art: Art, rect: WorldRect) {
  floor(art, rect, 0x43392d);
  floor(art, inset(rect, .045), 0x83745c);
  for (let y = rect.y + .12; y < rect.y + rect.height - .04; y += .145) {
    stroke(art, 0x493e32, [at(rect.x + .04, y), at(rect.x + rect.width - .035, y)], 1, .9);
    stroke(art, 0x97866a, [at(rect.x + .04, y + .025), at(rect.x + rect.width - .035, y + .025)], 1, .6);
  }
  const threshold = { x: rect.x - .18, y: rect.y + .9, width: .38, height: 1.73 };
  floor(art, threshold, 0x55493b);
  floor(art, inset(threshold, .045), 0x9c876a);
  floor(art, { x: rect.x + .22, y: rect.y + 1.26, width: .42, height: .97 }, 0x594935);
}

function paintWall(art: Art, wall: MapObject, rise: number, base: number): void {
  box(art, wall, rise, [0xa69b82, 0x827b68, 0xa4967c], base);
  const vertical = wall.height > wall.width;
  const length = vertical ? wall.height : wall.width;
  const near = (along: number, z: number) => vertical
    ? at(wall.x + wall.width, wall.y + along, z)
    : at(wall.x + along, wall.y + wall.height, z);
  for (let z = base + 5; z < base + rise - 2; z += 6) {
    stroke(art, 0x585448, [near(0, z), near(length, z)], 1, .58);
    stroke(art, 0xb2a58a, [near(0, z + 1), near(length, z + 1)], 1, .52);
    const joint = noise(z * 31 + Math.round(wall.x * 20)) * length;
    stroke(art, 0x534c40, [near(joint, z), near(joint, z + 4)], 1, .55);
  }
  if (base === 0) {
    stroke(art, 0x514537, [near(0, 2), near(length, 2)], 3);
  }

  if (rise < 35 || length < 1.75) return;
  const count = length > 4 ? 2 : 1;
  for (let i = 0; i < count; i += 1) {
    const start = length * (i + 1) / (count + 1) - .42;
    const end = start + .84;
    const window = (l: number, r: number, bottom: number, top: number, color: number) =>
      shape(art, color, [near(l, bottom), near(r, bottom), near(r, top), near(l, top)]);
    window(start - .06, end + .06, 22, 53, 0x51483a);
    window(start, end, 24, 52, 0xc1b393);
    window(start + .07, end - .07, 27, 49, 0x3d4d49);
    window(start + .08, end - .08, 38, 48, 0x637571);
    stroke(art, 0xa69477, [near((start + end) / 2, 25), near((start + end) / 2, 50)], 1.8);
    stroke(art, 0xa68e73, [near(start, 38), near(end, 38)], 1.6);
    stroke(art, 0xd1c09d, [near(start - .09, 23), near(end + .09, 23)], 2.5);
  }
}

function paintRoof(art: Art, rect: WorldRect) {
  const { x, y, width, height } = rect;
  const farX = x + width;
  const farY = y + height;
  const midY = y + height / 2;
  const ridge = wallHeight + 48;
  const trim = wallHeight - 2;
  const peakAt = (along: number, course: number) =>
    at(x + along, y + course, wallHeight + (1 - Math.abs(y + course - midY) / (height / 2)) * 48);
  const face = (xEdge: number, color: number) => shape(art, color, [at(xEdge, y, trim), at(xEdge, farY, trim), at(xEdge, midY, ridge)]);
  face(x, 0x82725d);
  face(farX, 0x978675);
  for (let side = 0; side < 2; side += 1) {
    const start = side * height / 2;
    const end = (side + 1) * height / 2;
    shape(art, side ? 0x705547 : 0x60483e, [peakAt(0, start), peakAt(width, start), peakAt(width, end), peakAt(0, end)]);
    const courses = 10;
    const spacing = (end - start) / courses;
    for (let row = 0; row < courses; row += 1) {
      const course = start + spacing * row;
      stroke(art, side ? 0x4d382f : 0x46352e, [peakAt(0, course), peakAt(width, course)], 1.35);
      for (let col = row % 2 ? -.21 : 0; col < width; col += .43) {
        const left = Math.max(0, col);
        const right = Math.min(width, col + .43);
        const variation = noise(Math.floor(col * 97) + (row + side * courses) * 71);
        shape(art, variation > .56 ? 0xa0846e : 0x44322c,
          [peakAt(left, course + .025), peakAt(right, course + .025),
           peakAt(right, course + spacing), peakAt(left, course + spacing)], .13 + variation * .12);
        stroke(art, 0x45332c, [peakAt(left, course), peakAt(left, course + spacing)], .9, .75);
      }
    }
  }
  stroke(art, 0x574337, [at(x, midY, ridge), at(farX, midY, ridge)], 3);
  stroke(art, 0xb09a80, [at(x, farY, wallHeight), at(farX, farY, wallHeight)], 3);
  stroke(art, 0xc0b093, [at(farX, y, wallHeight), at(farX, midY, ridge), at(farX, farY, wallHeight)], 2.8);
  const chimney = { x: x + 1.5, y: midY + .92, width: .68, height: .55 };
  box(art, chimney, 38, [0x76665a, 0x684639, 0x835c4a], 98);
  box(art, inset(chimney, -.06), 3, [0x96836e, 0x625246, 0x736153], 134);
}
