import { artBounds, at, box, floor, inset, nearDepth, noise, shape, stroke } from './isometricDrawing';
import { districtBuildings } from './district';
import { details, houses, openings, project, roofs, walls } from './world';
import type { MapObject, WorldRect } from './world';

const wallHeight = 68;
const cutawayHeight = 14;
type Art = Phaser.GameObjects.Graphics;
type HouseOccluder = { art: Art; houseId: string; bounds: ReturnType<typeof artBounds>; porch?: WorldRect };
type WallOccluder = Omit<HouseOccluder, 'porch'> & { footprint: WorldRect; partition: boolean };

const creamSiding = {
  boards: [0xbead8b, 0x766b59, 0xb39a75], seam: 0x564c3f, highlight: 0xcbaf85,
  weathering: 0x534632, sill: 0x514136, trim: 0xe0c59a,
} as const;
const graySiding = {
  boards: [0xa5a59b, 0x797e7a, 0x969b94], seam: 0x494e4a, highlight: 0xbbbbb0,
  weathering: 0x575b57, sill: 0x474845, trim: 0xc2bdb1,
} as const;

const rustSiding = {
  boards: [0x927765, 0x65463d, 0x865849], seam: 0x493a32, highlight: 0xa57058,
  weathering: 0x4a4033, sill: 0x433b31, trim: 0xada085,
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

const patchedRoof = {
  gables: [0x756056, 0x897161], faces: [0x48433e, 0x564c46], courses: [0x383731, 0x403933],
  lightShingle: 0x887467, darkShingle: 0x393531, joint: 0x3a3732,
  ridge: 0x48433d, fascia: 0x99826a, rake: 0xa89378,
} as const;

type Siding = typeof creamSiding | typeof graySiding | typeof rustSiding;
type RoofPalette = typeof brownRoof | typeof slateRoof | typeof patchedRoof;
const houseMaterials: Readonly<Record<string, { siding: Siding; roof: RoofPalette }>> = {
  house_a: { siding: creamSiding, roof: brownRoof },
  house_b: { siding: graySiding, roof: slateRoof },
  house_c: { siding: rustSiding, roof: patchedRoof },
  ...Object.fromEntries(districtBuildings.map(({ id, palette }) => [id, {
    siding: [creamSiding, graySiding, rustSiding][palette]!, roof: [brownRoof, slateRoof, patchedRoof][palette]!,
  }])),
};

export function drawHouse(scene: Phaser.Scene) {
  const shadows = scene.add.graphics().setDepth(-5250);
  for (const house of houses) {
    const { x, y, width, height } = house;
    const castShadows = house.name === 'house_a'
      ? [[2, 1.25, .17], [1.6, .98, .29]] as const
      : [[.67, .33, .26]] as const;
    for (const [east, south, opacity] of castShadows) {
      shape(shadows, 0x24271e, [at(x + width, y), at(x + width + east, y + south),
        at(x + width + east, y + height + south), at(x + east, y + height + south), at(x, y + height)], opacity);
    }
    floor(shadows, { x: x - .07, y: y - .07, width: width + .22, height: height + .22 }, 0x2d271c, 0, .32);
  }
  const ground = scene.add.graphics().setDepth(-5000);
  for (const detail of details) {
    if (detail.type === 'rug') rug(ground, detail);
    if (detail.type === 'porch') porch(ground, detail);
    if (detail.type === 'tile_floor') kitchenTile(ground, detail);
    if (detail.type === 'covered_porch') coveredPorchFloor(ground, detail);
    if (detail.type === 'risk_stoop') riskStoop(ground, detail);
    if (detail.type === 'concrete_landing') {
      floor(ground, detail, 0x645c50);
      floor(ground, inset(detail, .07), 0x938776);
    }
    if (detail.type === 'floor_debris') floorDebris(ground, detail);
  }
  for (const house of houses) {
    floor(ground, { x: house.x - .09, y: house.y - .09, width: house.width + .18, height: house.height + .18 }, 0x2b271b, 0, .12);
  }
  for (const wall of walls) {
    if (wall.name === 'house_a_west' || wall.name === 'house_a_north') drawStarterWindowLight(ground, wall);
  }

  const nearWalls: WallOccluder[] = [];
  const fixedWalls: { art: Art; bounds: ReturnType<typeof artBounds> }[] = [];
  for (const wall of walls) {
    const house = houses.find((candidate) => wall.name.startsWith(candidate.name + '_'));
    const front = house && (wall.x > house.x + house.width - .3 || wall.y > house.y + house.height - .3);
    const siding = (house && houseMaterials[house.name]?.siding) ?? creamSiding;
    const partition = wall.type === 'partition';
    if (!house || (!front && !partition)) {
      const art = scene.add.graphics().setDepth(nearDepth(wall));
      paintWall(art, wall, wallHeight, 0, siding);
      fixedWalls.push({ art, bounds: artBounds(wall, wallHeight) });
      continue;
    }
    // Local depth keeps the distant end of a long wall from covering actors
    // who are already standing in front of its near face.
    const rise = partition ? 32 : wallHeight;
    const spans = partition ? wallSpans(wall) : wallSpans(wall, wallWindows(wall));
    for (const { footprint, window } of spans) {
      const depth = nearDepth(footprint);
      const base = scene.add.graphics().setDepth(depth);
      const upper = scene.add.graphics().setDepth(depth + .02);
      paintWall(base, footprint, cutawayHeight, 0, siding, []);
      stroke(base, siding.trim, wallEdge(footprint, cutawayHeight), 1, .8);
      paintWall(upper, footprint, rise - cutawayHeight, cutawayHeight, siding, window ? [window] : []);
      fixedWalls.push({ art: base, bounds: artBounds(footprint, cutawayHeight) });
      nearWalls.push({ art: upper, houseId: house.name, footprint, partition, bounds: artBounds(footprint, rise) });
    }
  }

  const roofArt: HouseOccluder[] = roofs.map((roof) => {
    const art = scene.add.graphics().setDepth(nearDepth(roof) + .4);
    paintRoof(art, roof, houseMaterials[roof.name]?.roof ?? brownRoof);
    return { art, houseId: roof.name, bounds: artBounds(roof, 138) };
  });
  for (const detail of details.filter((entry) => entry.type === 'covered_porch')) {
    const art = scene.add.graphics().setDepth(nearDepth(detail) + .45);
    paintPorchCanopy(art, detail);
    const house = houses.find((candidate) => detail.name.startsWith(candidate.name + '_'));
    if (house) roofArt.push({ art, houseId: house.name, bounds: artBounds(detail, 84), porch: detail });
  }
  const signs = districtBuildings.filter(({ featured }) => featured).map(({ id, name, house }) => {
    const point = project({ x: house.x + house.width / 2, y: house.y + house.height });
    const art = scene.add.text(point.x, point.y - 51, name.toUpperCase(), {
      fontFamily: 'Inter, sans-serif', fontSize: '10px', color: '#f1e2c8', backgroundColor: '#303128',
      padding: { x: 4, y: 2 },
    }).setOrigin(.5).setAngle(26.6).setDepth(point.y + .12);
    return { art, houseId: id };
  });
  const openingArt = openings.map((opening) => {
    if (opening.type === 'door') return drawDoor(scene, opening);
    const frame = scene.add.graphics().setDepth(nearDepth(opening) - .01);
    box(frame, opening, 5, [0x9e886a, 0x61523e, 0x796348]);
    const panel = scene.add.graphics().setDepth(nearDepth(opening) + .01);
    box(panel, opening, 42, [0x759290, 0x475e5a, 0x54726e]);
    const vertical = opening.height > opening.width;
    const a = at(opening.x + opening.width, opening.y + opening.height, 23);
    const b = at(vertical ? opening.x + opening.width : opening.x, vertical ? opening.y : opening.y + opening.height, 23);
    stroke(panel, 0xc8b295, [a, b], 2.5);
    return { id: opening.name, panel, openLeaf: null, damage: null };
  });
  return { nearWalls, fixedWalls, roofArt, openingArt, signs };
}

function drawStarterWindowLight(art: Art, wall: MapObject) {
  const vertical = wall.height > wall.width;
  const point = (across: number, height: number) => at(
    wall.x + (vertical ? wall.width : across) + height * .038,
    wall.y + (vertical ? across : wall.height) + height * .023,
  );
  for (const center of wallWindows(wall)) {
    shape(art, 0xe4af6b, [
      point(center - .44, 26), point(center + .44, 26), point(center + .44, 50), point(center - .44, 50),
    ], .19);
    for (const [left, right] of [[-.34, -.033], [.033, .34]] as const) {
      for (const [bottom, top] of [[28, 37], [39, 48]] as const) {
        shape(art, 0xfac67f, [
          point(center + left, bottom), point(center + right, bottom),
          point(center + right, top), point(center + left, top),
        ], .27);
      }
    }
  }
}

const doorHeight = 54;

function drawDoor(scene: Phaser.Scene, opening: MapObject) {
  const { x, y, width, height } = opening;
  const alongY = height > width;
  const length = alongY ? height : width;
  const jamb = .10;
  const depth = nearDepth(opening);
  const trim = [0xc9b896, 0x89765f, 0xa59273] as const;
  const frame = scene.add.graphics().setDepth(depth - .01);
  box(frame, opening, 2, [0x9e886a, 0x61523e, 0x796348]);
  const hingeJamb = alongY ? { x, y, width, height: jamb } : { x, y, width: jamb, height };
  const latchJamb = alongY
    ? { ...hingeJamb, y: y + height - jamb }
    : { ...hingeJamb, x: x + width - jamb };
  box(frame, hingeJamb, doorHeight + 5, trim);
  box(frame, latchJamb, doorHeight + 5, trim);
  box(frame, opening, 5, trim, doorHeight);

  const leaf = alongY
    ? { x, y: y + jamb, width, height: length - jamb * 2 }
    : { x: x + jamb, y, width: length - jamb * 2, height };
  const panel = scene.add.graphics().setDepth(depth - .02);
  paintDoorLeaf(panel, leaf, alongY, false);
  const scuffs = scene.add.graphics().setDepth(depth - .015).setVisible(false);
  const cracks = scene.add.graphics().setDepth(depth - .014).setVisible(false);
  const face = (fraction: number, z: number) => doorFace(leaf, alongY, fraction, z);
  stroke(scuffs, 0x3c2a22, [face(.9, 36), face(.77, 32), face(.79, 25), face(.71, 21)], 2.8);
  stroke(scuffs, 0xd7a269, [face(.9, 37), face(.77, 33), face(.79, 26), face(.71, 22)], 1.4);
  stroke(cracks, 0x302016, [face(.78, 31), face(.63, 34), face(.68, 39), face(.53, 46)], 2.7);
  stroke(cracks, 0x302016, [face(.78, 25), face(.60, 19), face(.62, 16), face(.48, 10)], 2.7);
  stroke(cracks, 0xe2ad70, [face(.78, 32), face(.63, 35), face(.68, 40), face(.53, 47)], 1.4);

  // Hold the wide-open leaf against the wall on the hinge side. The actual
  // walkable passage and the lane beside it remain visibly clear.
  const open = alongY
    ? { x: x + width, y: leaf.y - leaf.height, width: .07, height: leaf.height }
    : { x: leaf.x - leaf.width, y: y + height, width: leaf.width, height: .07 };
  const openLeaf = scene.add.graphics().setDepth(nearDepth(open) + .025);
  paintDoorLeaf(openLeaf, open, alongY, true);
  return { id: opening.name, panel, openLeaf, damage: { scuffs, cracks } };
}

function doorFace(leaf: WorldRect, alongY: boolean, fraction: number, z: number) {
  return alongY
    ? at(leaf.x + leaf.width, leaf.y + leaf.height * fraction, z)
    : at(leaf.x + leaf.width * fraction, leaf.y + leaf.height, z);
}

function paintDoorLeaf(art: Art, leaf: WorldRect, alongY: boolean, hingedAtEnd: boolean) {
  box(art, leaf, doorHeight, [0x9c7557, 0x74513d, 0x856048]);
  const face = (fraction: number, z: number) => doorFace(leaf, alongY, fraction, z);
  for (const [bottom, top] of [[7, 24], [32, 48]] as const) {
    shape(art, 0x523b2e, [face(.13, bottom), face(.87, bottom), face(.87, top), face(.13, top)]);
    shape(art, 0x9b7557, [face(.18, bottom + 2), face(.82, bottom + 2), face(.82, top - 2), face(.18, top - 2)]);
  }
  const latchEnd = hingedAtEnd ? .15 : .85;
  const handleEnd = hingedAtEnd ? .27 : .73;
  stroke(art, 0x402e23, [face(latchEnd, 27), face(handleEnd, 27)], 4);
  stroke(art, 0xe5bd73, [face(latchEnd, 28), face(handleEnd, 28)], 2);
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

function riskStoop(art: Art, rect: WorldRect) {
  floor(art, rect, 0x645c50);
  floor(art, inset(rect, .08), 0x8a7b6a);
  const step = { x: rect.x + .24, y: rect.y + rect.height - .15, width: rect.width - .48, height: .28 };
  floor(art, { ...step, y: step.y + .24 }, 0x6a5c4c);
  floor(art, step, 0xa09580);
  stroke(art, 0x51463b, [
    at(rect.x + .25, rect.y + .25), at(rect.x + .61, rect.y + .42),
    at(rect.x + .58, rect.y + .62), at(rect.x + .89, rect.y + .74),
  ], 1.5);
}

function floorDebris(art: Art, rect: WorldRect) {
  for (let index = 0; index < 12; index += 1) {
    const x = rect.x + noise(index * 17) * (rect.width - .12);
    const y = rect.y + noise(index * 47) * (rect.height - .11);
    floor(art, { x, y, width: .08 + noise(index * 11) * .06, height: .07 },
      index % 3 === 0 ? 0xa5977c : 0x494035, 0, .7);
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

function wallWindows(wall: WorldRect) {
  const length = Math.max(wall.width, wall.height);
  if (length < 1.75) return [];
  const count = length > 4 ? 2 : 1;
  return Array.from({ length: count }, (_, index) => length * (index + 1) / (count + 1));
}

function wallSpans(wall: WorldRect, windows: readonly number[] = []) {
  const vertical = wall.height > wall.width;
  const length = vertical ? wall.height : wall.width;
  const spans: { footprint: WorldRect; window?: number }[] = [];
  let start = 0;
  function append(end: number, window = false) {
    if (end - start < 1e-6) return;
    const span = end - start;
    const footprint = vertical
      ? { ...wall, y: wall.y + start, height: span }
      : { ...wall, x: wall.x + start, width: span };
    spans.push({ footprint, window: window ? span / 2 : undefined });
    start = end;
  }
  function fillTo(end: number) {
    const count = Math.ceil((end - start) / .70);
    const segment = (end - start) / count;
    for (let i = 0; i < count; i += 1) append(i === count - 1 ? end : start + segment);
  }
  for (const center of windows) {
    fillTo(center - .55);
    append(center + .55, true);
  }
  fillTo(length);
  return spans;
}

function wallEdge({ x, y, width, height }: WorldRect, z: number) {
  return width > height ? [at(x, y + height, z), at(x + width, y + height, z)]
    : [at(x + width, y, z), at(x + width, y + height, z)];
}

function paintWall(
  art: Art, wall: WorldRect, rise: number, base: number, siding: Siding, windows = wallWindows(wall),
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

  if (rise < 35) return;
  for (const center of windows) {
    const start = center - .42;
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
    if (siding === rustSiding) {
      for (const z of [30, 41]) {
        const board = [near(start - .13, z + 3), near(end + .12, z)];
        stroke(art, 0x43372e, board, 7);
        stroke(art, 0x85705a, board, 4);
      }
    }
  }
}

function paintRoof(art: Art, rect: WorldRect, palette: RoofPalette) {
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
  if (palette === patchedRoof) {
    const start = height * .65;
    const end = height * .87;
    const left = width * .53;
    const right = width * .75;
    shape(art, 0x3e4744, [peakAt(left, start), peakAt(right, start), peakAt(right, end), peakAt(left, end)]);
    for (const x of [left, right]) stroke(art, 0x797665, [peakAt(x, start), peakAt(x, end)], 1.4, .8);
  }
  stroke(art, palette.ridge, [at(x, midY, ridge), at(farX, midY, ridge)], 3);
  stroke(art, palette.fascia, [at(x, farY, wallHeight), at(farX, farY, wallHeight)], 3);
  stroke(art, palette.rake, [at(farX, y, wallHeight), at(farX, midY, ridge), at(farX, farY, wallHeight)], 2.8);
  const chimney = { x: x + 1.5, y: midY + .92, width: .68, height: .55 };
  box(art, chimney, 38, [0x76665a, 0x684639, 0x835c4a], 98);
  box(art, inset(chimney, -.06), 3, [0x96836e, 0x625246, 0x736153], 134);
}
