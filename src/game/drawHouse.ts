import { at, box, floor, inset, nearDepth, noise, shape, stroke } from './isometricDrawing';
import { details, houses, roofs, walls } from './world';
import type { MapObject, WorldRect } from './world';

const wallHeight = 68;
const cutawayHeight = 11;
type Art = Phaser.GameObjects.Graphics;

const creamSiding = {
  boards: [0xa69b82, 0x827b68, 0xa4967c], seam: 0x585448, highlight: 0xb2a58a,
  weathering: 0x534c40, sill: 0x514537, trim: 0xc1b393,
} as const;
const graySiding = {
  boards: [0xa5a59b, 0x797e7a, 0x969b94], seam: 0x494e4a, highlight: 0xbbbbb0,
  weathering: 0x575b57, sill: 0x474845, trim: 0xc2bdb1,
} as const;

const brownRoof = {
  gables: [0x82725d, 0x978675], faces: [0x60483e, 0x705547], courses: [0x46352e, 0x4d382f],
  lightShingle: 0xa0846e, darkShingle: 0x44322c, joint: 0x45332c,
  ridge: 0x574337, fascia: 0xb09a80, rake: 0xc0b093,
} as const;
const slateRoof = {
  gables: [0x737b79, 0x8e9491], faces: [0x3f474b, 0x515b5d], courses: [0x30373a, 0x3a4143],
  lightShingle: 0x8b9190, darkShingle: 0x333a40, joint: 0x2b3237,
  ridge: 0x41494b, fascia: 0xa29e91, rake: 0xb7b5a6,
} as const;

export function drawHouse(scene: Phaser.Scene) {
  const ground = scene.add.graphics().setDepth(-5000);
  for (const detail of details) {
    if (detail.type === 'rug') rug(ground, detail);
    if (detail.type === 'porch') porch(ground, detail);
    if (detail.type === 'tile_floor') kitchenTile(ground, detail);
    if (detail.type === 'covered_porch') coveredPorchFloor(ground, detail);
  }
  for (const house of houses) {
    floor(ground, { x: house.x - .09, y: house.y - .09, width: house.width + .18, height: house.height + .18 }, 0x2b271b, 0, .12);
  }

  const nearWalls: { art: Art; houseId: string; depth: number }[] = [];
  for (const wall of walls) {
    const house = houses.find((candidate) => wall.name.startsWith(candidate.name + '_'));
    const front = house && (wall.x > house.x + house.width - .3 || wall.y > house.y + house.height - .3);
    const depth = nearDepth(wall);
    const siding = house?.name === 'house_b' ? graySiding : creamSiding;
    if (front) {
      paintWall(scene.add.graphics().setDepth(depth), wall, cutawayHeight, 0, siding);
      const upper = scene.add.graphics().setDepth(depth + .02);
      paintWall(upper, wall, wallHeight - cutawayHeight, cutawayHeight, siding);
      nearWalls.push({ art: upper, houseId: house.name, depth });
    } else {
      paintWall(scene.add.graphics().setDepth(depth), wall, wall.type === 'partition' ? 28 : wallHeight, 0, siding);
    }
  }

  const roofArt = roofs.map((roof) => {
    const art = scene.add.graphics().setDepth(nearDepth(roof) + .4);
    paintRoof(art, roof, roof.name === 'house_b' ? slateRoof : brownRoof);
    return { art, houseId: roof.name };
  });
  for (const detail of details.filter((entry) => entry.type === 'covered_porch')) {
    const art = scene.add.graphics().setDepth(nearDepth(detail) + .45);
    paintPorchCanopy(art, detail);
    const house = houses.find((candidate) => detail.name.startsWith(candidate.name + '_'));
    if (house) roofArt.push({ art, houseId: house.name });
  }
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

function kitchenTile(art: Art, rect: WorldRect) {
  const size = .45;
  for (let row = 0; row * size < rect.height - .015; row += 1) {
    for (let col = 0; col * size < rect.width - .015; col += 1) {
      const tile = {
        x: rect.x + col * size, y: rect.y + row * size,
        width: Math.min(rect.width - col * size, size) - .015,
        height: Math.min(rect.height - row * size, size) - .015,
      };
      floor(art, tile, (row + col) % 2 === 0 ? 0xa79c86 : 0x777568);
    }
  }
}

function coveredPorchFloor(art: Art, rect: WorldRect) {
  floor(art, rect, 0x403b33);
  floor(art, inset(rect, .045), 0x8a8170);
  for (let y = rect.y + .14; y < rect.y + rect.height - .07; y += .16) {
    stroke(art, 0x555148, [at(rect.x + .05, y), at(rect.x + rect.width - .05, y)], 1);
  }
  const step = { x: rect.x + 1.07, y: rect.y + rect.height - .12, width: 1.58, height: .31 };
  floor(art, { ...step, y: step.y + .33 }, 0x767265);
  floor(art, { ...step, y: step.y + .16 }, 0x9b907c, 1);
  floor(art, step, 0xb1a58e, 2);
}

function paintPorchCanopy(art: Art, rect: WorldRect) {
  const { x, y, width, height } = rect;
  const front = y + height;
  const middle = x + width * .46;
  const eave = 48;
  const peak = 77;
  const rake = [at(x, front, eave), at(middle, front, peak), at(x + width, front, eave)];
  for (const offset of [.21, 2.72, 5.13]) {
    const column = { x: x + offset, y: front - .23, width: .14, height: .13 };
    box(art, column, eave, [0xbbb8a6, 0x85847a, 0xb5ad97]);
    box(art, inset(column, -.04), 3, [0xc4bca8, 0x838176, 0xaca491]);
    box(art, inset(column, -.035), 3, [0xc6bfab, 0x858477, 0xa9a38f], eave - 3);
  }
  shape(art, 0x93958a, rake);
  shape(art, 0x4d585b, [at(middle, y, peak), at(x + width, y, eave), rake[2]!, rake[1]!]);
  shape(art, 0x424b4e, [at(x, y, eave), at(middle, y, peak), rake[1]!, rake[0]!]);
  for (let course = 1; course < 7; course += 1) {
    const t = course / 7;
    const z = eave + (peak - eave) * t;
    for (const end of [x, x + width]) {
      const along = end + (middle - end) * t;
      stroke(art, 0x363e41, [at(along, y, z), at(along, front, z)], 1);
    }
  }
  stroke(art, 0xc0bbab, rake, 4);
  stroke(art, 0xb1a892, [rake[0]!, rake[2]!], 3);
  floor(art, { x: middle - .18, y: front + .005, width: .35, height: .01 }, 0x706f68, eave + 7);
}

function paintWall(
  art: Art, wall: MapObject, rise: number, base: number, siding: typeof creamSiding | typeof graySiding,
): void {
  box(art, wall, rise, siding.boards, base);
  const vertical = wall.height > wall.width;
  const length = vertical ? wall.height : wall.width;
  const near = (along: number, z: number) => vertical
    ? at(wall.x + wall.width, wall.y + along, z)
    : at(wall.x + along, wall.y + wall.height, z);
  for (let z = base + 5; z < base + rise - 2; z += 6) {
    stroke(art, siding.seam, [near(0, z), near(length, z)], 1, .58);
    stroke(art, siding.highlight, [near(0, z + 1), near(length, z + 1)], 1, .52);
    const joint = noise(z * 31 + Math.round(wall.x * 20)) * length;
    stroke(art, siding.weathering, [near(joint, z), near(joint, z + 4)], 1, .55);
  }
  if (base === 0) {
    stroke(art, siding.sill, [near(0, 2), near(length, 2)], 3);
  }

  if (rise < 35 || length < 1.75) return;
  const count = length > 4 ? 2 : 1;
  for (let i = 0; i < count; i += 1) {
    const start = length * (i + 1) / (count + 1) - .42;
    const end = start + .84;
    const window = (l: number, r: number, bottom: number, top: number, color: number) =>
      shape(art, color, [near(l, bottom), near(r, bottom), near(r, top), near(l, top)]);
    window(start - .06, end + .06, 22, 53, 0x51483a);
    window(start, end, 24, 52, siding.trim);
    window(start + .07, end - .07, 27, 49, 0x3d4d49);
    window(start + .08, end - .08, 38, 48, 0x637571);
    stroke(art, 0xa69477, [near((start + end) / 2, 25), near((start + end) / 2, 50)], 1.8);
    stroke(art, 0xa68e73, [near(start, 38), near(end, 38)], 1.6);
    stroke(art, 0xd1c09d, [near(start - .09, 23), near(end + .09, 23)], 2.5);
  }
}

function paintRoof(art: Art, rect: WorldRect, palette: typeof brownRoof | typeof slateRoof) {
  const { x, y, width, height } = rect;
  const farX = x + width;
  const farY = y + height;
  const midY = y + height / 2;
  const ridge = wallHeight + 48;
  const trim = wallHeight - 2;
  const peakAt = (along: number, course: number) =>
    at(x + along, y + course, wallHeight + (1 - Math.abs(y + course - midY) / (height / 2)) * 48);
  const face = (xEdge: number, color: number) => shape(art, color, [at(xEdge, y, trim), at(xEdge, farY, trim), at(xEdge, midY, ridge)]);
  face(x, palette.gables[0]);
  face(farX, palette.gables[1]);
  for (let side = 0; side < 2; side += 1) {
    const start = side * height / 2;
    const end = (side + 1) * height / 2;
    shape(art, palette.faces[side]!, [peakAt(0, start), peakAt(width, start), peakAt(width, end), peakAt(0, end)]);
    const courses = 10;
    const spacing = (end - start) / courses;
    for (let row = 0; row < courses; row += 1) {
      const course = start + spacing * row;
      stroke(art, palette.courses[side]!, [peakAt(0, course), peakAt(width, course)], 1.35);
      for (let col = row % 2 ? -.21 : 0; col < width; col += .43) {
        const left = Math.max(0, col);
        const right = Math.min(width, col + .43);
        const variation = noise(Math.floor(col * 97) + (row + side * courses) * 71);
        shape(art, variation > .56 ? palette.lightShingle : palette.darkShingle,
          [peakAt(left, course + .025), peakAt(right, course + .025),
           peakAt(right, course + spacing), peakAt(left, course + spacing)], .13 + variation * .12);
        stroke(art, palette.joint, [peakAt(left, course), peakAt(left, course + spacing)], .9, .75);
      }
    }
  }
  stroke(art, palette.ridge, [at(x, midY, ridge), at(farX, midY, ridge)], 3);
  stroke(art, palette.fascia, [at(x, farY, wallHeight), at(farX, farY, wallHeight)], 3);
  stroke(art, palette.rake, [at(farX, y, wallHeight), at(farX, midY, ridge), at(farX, farY, wallHeight)], 2.8);
  const chimney = { x: x + 1.5, y: midY + .92, width: .68, height: .55 };
  box(art, chimney, 38, [0x76665a, 0x684639, 0x835c4a], 98);
  box(art, inset(chimney, -.06), 3, [0x96836e, 0x625246, 0x736153], 134);
}
