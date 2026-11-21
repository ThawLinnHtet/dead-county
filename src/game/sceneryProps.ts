import type Phaser from 'phaser';
import { at, noise, screenShape, shape, stroke } from './isometricDrawing';
import { project } from './world';
import type { MapObject, WorldPoint, WorldRect } from './world';

type Art = Phaser.GameObjects.Graphics;

const crowns = [
  [-.22, -.22, .29], [.13, -.29, .28], [.36, -.13, .25],
  [-.42, -.02, .24], [.43, .10, .23], [.25, .24, .26],
  [-.24, .22, .29], [.00, .30, .27], [-.08, -.04, .27],
  [.14, .04, .23], [-.32, .04, .19], [.31, -.05, .18],
] as const;
const leaves = [
  [0x293b2b, 0x3e5132, 0x566b3e, 0x728451, 0x92965c],
  [0x323b29, 0x485131, 0x62663b, 0x7d7d48, 0xa19459],
  [0x2a3a2c, 0x3f5238, 0x536845, 0x6b8251, 0x899961],
] as const;

function foliageShape(art: Art, x: number, y: number, size: number, seed: number, color: number) {
  const points: WorldPoint[] = [];
  for (let index = 0; index < 18; index += 1) {
    const turn = index * Math.PI / 9;
    const edge = size * (.83 + noise(seed + index * 43) * .21);
    points.push({ x: Math.round(x + Math.cos(turn) * edge), y: Math.round(y + Math.sin(turn) * edge * .74) });
  }
  screenShape(art, color, points);
}

export function drawTree(art: Art, ground: Art, rect: WorldRect) {
  const foot = project({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
  const x = Math.round(foot.x);
  const y = Math.round(foot.y);
  const seed = Math.round(rect.x * 919 + rect.y * 673);
  const height = 62 + Math.round(noise(seed) * 23);
  const trunk = Math.round(height * .68);
  const lean = Math.round((noise(seed + 37) - .5) * 13);
  const palette = leaves[Math.floor(noise(seed + 97) * leaves.length)]!;

  ground.fillStyle(0x253328, .22).fillEllipse(x + 21, y + 5, height * 1.4, height * .55);
  for (const [offsetX, offsetY, size] of crowns.slice(0, 8)) {
    ground.fillStyle(0x30392a, .10).fillEllipse(
      x + 22 + offsetX * height, y + 5 + offsetY * height * .47, height * size * 1.9, height * size * .8,
    );
  }
  const baseWidth = Math.round(Math.min(rect.width, rect.height) * 25);
  screenShape(ground, 0x3c4230, [
    { x: x - baseWidth, y: y + 3 }, { x: x - 3, y: y - 6 }, { x: x + 4, y: y - 5 },
    { x: x + baseWidth + 4, y: y + 5 }, { x: x + 3, y: y + 8 }, { x: x - 4, y: y + 5 },
  ], .67);
  screenShape(art, 0x44382c, [
    { x: x - baseWidth * .63, y }, { x: x - 4, y: y - trunk * .54 },
    { x: x + lean - 2, y: y - trunk }, { x: x + lean + 3, y: y - trunk },
    { x: x + 5, y: y - trunk * .43 }, { x: x + baseWidth * .62, y: y + 2 },
    { x: x + 1, y: y + 5 },
  ]);
  screenShape(art, 0x715b42, [
    { x: x - baseWidth * .51, y: y + 1 }, { x: x - 2, y: y - trunk * .57 },
    { x: x + lean, y: y - trunk + 2 }, { x: x + 1, y: y - trunk * .39 }, { x: x - 1, y: y + 4 },
  ]);
  for (const [side, rise] of [[-1, .64], [1, .76], [-1, .93]] as const) {
    const shoulder = y - trunk * rise;
    art.lineStyle(6, 0x44382c).beginPath().moveTo(x, shoulder + 9)
      .lineTo(x + side * 11, shoulder).lineTo(x + side * 20 + lean, shoulder - 10).strokePath();
    art.lineStyle(2, 0x7f694d).lineBetween(x + side * 2, shoulder + 5, x + side * 15, shoulder - 6);
  }
  art.lineStyle(1.2, 0x917456, .8).lineBetween(x - 3, y - 4, x - 1, y - 22);
  art.lineStyle(1.1, 0x302c23, .78).lineBetween(x + 3, y - 2, x + 1, y - 26);

  for (const [index, [offsetX, offsetY, size]] of crowns.entries()) {
    const key = seed + index * 227;
    const cx = Math.round(x + lean + (offsetX + (noise(key) - .5) * .09) * height);
    const cy = Math.round(y - height + offsetY * height * .75);
    const radius = size * height * (.93 + noise(key + 173) * .2);
    const lit = offsetX + offsetY < .08;
    foliageShape(art, cx, cy, radius, key, palette[0]);
    foliageShape(art, cx - 2, cy - 3, radius * .90, key, palette[lit ? 1 : 0]);
    foliageShape(art, cx - 4, cy - 5, radius * .69, key + 17, palette[lit ? 2 : 1]);
    for (let leaf = 0; leaf < 17; leaf += 1) {
      const turn = noise(key + leaf * 57) * Math.PI * 2;
      const length = Math.sqrt(noise(key - leaf * 33 - 10)) * radius * .76;
      const fx = Math.round(cx + Math.cos(turn) * length - 3);
      const fy = Math.round(cy + Math.sin(turn) * length * .64 - 3);
      const color = fy < cy && lit ? palette[leaf % 4 === 0 ? 4 : 3] : palette[leaf % 3 === 0 ? 1 : 2];
      art.fillStyle(color, .78).fillRect(fx, fy, 2 + leaf % 3, 1 + leaf % 2);
      if (leaf % 3 === 0) art.fillStyle(color, .68).fillRect(fx - 1, fy + 1, 2, 2);
    }
  }
}

type CarPoint = readonly [across: number, along: number, height: number];

export function drawParkedCar(art: Art, ground: Art, rect: MapObject) {
  const { x, y, width, height } = rect;
  const point = ([u, v, z]: CarPoint) => at(x + u * width, y + v * height, z);
  const panel = (color: number, ...points: CarPoint[]) => shape(art, color, points.map(point));
  const shadow = (color: number, alpha: number, ...points: CarPoint[]) => shape(ground, color, points.map(point), alpha);
  const seam = (color: number, thickness: number, ...points: CarPoint[]) =>
    stroke(art, color, points.map(point), thickness);
  const [paint, side, dark, sun, worn] = rect.name === 'car'
    ? [0x8a5243, 0x704136, 0x4e322d, 0xad755a, 0x673e31]
    : [0x69776d, 0x4f5f58, 0x37463f, 0x8d9786, 0x625a49];

  shadow(0x252b25, .29,
    [-.08, .02, 0], [.9, -.045, 0], [1.13, .11, 0], [1.17, .94, 0],
    [.94, 1.08, 0], [.04, 1.04, 0], [-.13, .88, 0], [-.14, .13, 0]);
  shadow(0x222522, .5,
    [.02, .04, 0], [.92, .03, 0], [1.03, .13, 0], [1.04, .89, 0],
    [.91, 1.01, 0], [.08, 1, 0], [-.02, .89, 0], [-.02, .13, 0]);
  panel(0x2b2824, [.02, .91, 6], [.95, .96, 6], [.97, .94, 16], [.04, .91, 16]);
  panel(dark, [.05, .07, 7], [.95, .045, 7], [.97, .94, 7], [.91, .99, 7], [.07, .98, 7]);
  panel(side, [.95, .045, 8], [1, .13, 10], [1, .89, 10], [.94, .995, 10], [.92, .98, 19], [.98, .84, 22], [.98, .15, 22], [.92, .035, 18]);
  panel(dark, [.06, .978, 10], [.94, .995, 10], [.92, .98, 19], [.08, .98, 18]);
  panel(paint, [.05, .08, 18], [.12, .014, 18], [.90, .02, 18], [.98, .13, 22], [.98, .88, 22],
    [.92, .98, 19], [.08, .98, 18], [.02, .86, 21], [.02, .17, 21]);
  panel(sun, [.11, .10, 20], [.89, .10, 20], [.91, .30, 23], [.08, .30, 23]);
  panel(sun, [.09, .76, 22], [.91, .76, 22], [.92, .92, 20], [.08, .92, 20]);
  seam(dark, 1, [.13, .13, 21], [.86, .13, 21], [.90, .29, 23]);
  seam(dark, 1, [.11, .75, 22], [.88, .75, 22], [.92, .91, 20]);

  // The cabin tapers above the door line so the windshields slope into the body.
  panel(0x263331, [.08, .32, 23], [.92, .32, 23], [.80, .43, 37], [.20, .43, 37]);
  panel(0x425955, [.13, .33, 24], [.85, .33, 24], [.76, .42, 35], [.24, .42, 35]);
  panel(0x657c72, [.16, .335, 25], [.46, .335, 25], [.56, .42, 35], [.25, .42, 35]);
  panel(0x242f2e, [.92, .32, 23], [.8, .43, 37], [.81, .59, 37], [.94, .76, 22]);
  panel(0x50615c, [.92, .36, 24], [.815, .442, 35], [.82, .573, 35], [.925, .71, 24]);
  seam(0x2b302e, 2.4, [.87, .53, 23], [.82, .52, 36]);
  seam(0x879087, 1, [.82, .45, 34], [.82, .57, 34]);
  panel(0x273833, [.81, .59, 37], [.94, .76, 22], [.07, .76, 22], [.20, .59, 37]);
  panel(0x526560, [.77, .60, 35], [.87, .74, 24], [.13, .74, 24], [.24, .60, 35]);
  seam(0x857f67, 1, [.21, .725, 25], [.80, .725, 25]);
  panel(paint, [.20, .41, 37], [.80, .41, 37], [.82, .60, 37], [.18, .60, 37]);
  panel(sun, [.22, .424, 37.1], [.72, .424, 37.1], [.72, .573, 37.1], [.21, .573, 37.1]);

  for (const axle of [.23, .79]) {
    const wheel = (radius: number, color: number) => {
      const tire = Array.from({ length: 14 }, (_, i): CarPoint => {
        const angle = i * Math.PI / 7;
        return [1.006, axle + Math.cos(angle) * .073 * radius, 7.2 + Math.sin(angle) * 7.6 * radius];
      });
      panel(color, ...tire);
    };
    wheel(1.16, 0x34302b);
    wheel(1, 0x222723);
    wheel(.64, 0x3c4139);
    wheel(.39, 0x918779);
    wheel(.16, 0x424039);
  }
  seam(dark, 1.1, [1, .34, 21], [1, .34, 12], [1, .69, 12], [1, .69, 21]);
  seam(dark, 1.1, [1, .515, 21], [1, .515, 13]);
  seam(0xab9d84, 1.45, [1, .456, 18.5], [1, .487, 18.5]);
  seam(0xab9d84, 1.45, [1, .622, 18.5], [1, .653, 18.5]);
  seam(worn, 2, [1, .34, 10.5], [1, .47, 11], [1, .60, 10.4], [1, .66, 11]);
  seam(0x28302d, 3, [.09, .993, 10], [.93, .993, 10]);
  seam(0x958b79, 1.2, [.12, .992, 11], [.9, .992, 11]);
  panel(0xa9a08c, [.40, .996, 11.5], [.60, .996, 11.5], [.60, .996, 15.5], [.40, .996, 15.5]);
  for (const edge of [.13, .73]) {
    panel(0x4e302c, [edge, .996, 12], [edge + .14, .996, 12], [edge + .14, .996, 17], [edge, .996, 17]);
    seam(0xb46f56, 1.7, [edge + .02, .997, 15.5], [edge + .12, .997, 15.5]);
    seam(0xd1c5a1, 1.6, [edge, .083, 20.7], [edge + .10, .083, 20.7]);
  }
}
