import { project } from './world';
import type { WorldPoint, WorldRect } from './world';

export interface ElevatedPoint extends WorldPoint {
  readonly z?: number;
}

export function at(x: number, y: number, z = 0): ElevatedPoint {
  return { x, y, z };
}

function onScreen(point: ElevatedPoint): WorldPoint {
  const projected = project(point);
  return { x: projected.x, y: projected.y - (point.z ?? 0) };
}

export function shape(
  art: Phaser.GameObjects.Graphics, color: number, points: ElevatedPoint[], alpha = 1,
): void {
  screenShape(art, color, points.map(onScreen), alpha);
}

export function screenShape(
  art: Phaser.GameObjects.Graphics, color: number, points: WorldPoint[], alpha = 1,
): void {
  trace(art, points);
  art.closePath().fillStyle(color, alpha).fillPath();
}

function trace(art: Phaser.GameObjects.Graphics, [first, ...remaining]: WorldPoint[]): void {
  if (!first) return;
  art.beginPath().moveTo(first.x, first.y);
  for (const point of remaining) art.lineTo(point.x, point.y);
}

export function stroke(
  art: Phaser.GameObjects.Graphics, color: number, points: ElevatedPoint[], width = 1, alpha = 1,
): void {
  trace(art, points.map(onScreen));
  art.lineStyle(width, color, alpha).strokePath();
}

export function corners({ x, y, width, height }: WorldRect, z = 0): ElevatedPoint[] {
  return [at(x, y, z), at(x + width, y, z), at(x + width, y + height, z), at(x, y + height, z)];
}

export function floor(art: Phaser.GameObjects.Graphics, rect: WorldRect, color: number, z = 0, alpha = 1) {
  shape(art, color, corners(rect, z), alpha);
}

type BoxColors = readonly [top: number, right: number, left: number];

export function box(
  art: Phaser.GameObjects.Graphics, rect: WorldRect, rise: number, colors: BoxColors, base = 0,
): void {
  const [, b, c, d] = corners(rect, base);
  const [aTop, bTop, cTop, dTop] = corners(rect, base + rise);
  shape(art, colors[1], [b, c, cTop, bTop]);
  shape(art, colors[2], [c, d, dTop, cTop]);
  shape(art, colors[0], [aTop, bTop, cTop, dTop]);
}

export function inset(rect: WorldRect, margin: number): WorldRect {
  return { x: rect.x + margin, y: rect.y + margin, width: rect.width - margin * 2, height: rect.height - margin * 2 };
}

export function nearDepth(rect: WorldRect): number {
  return project({ x: rect.x + rect.width, y: rect.y + rect.height }).y;
}

export function artBounds(rect: WorldRect, rise: number) {
  return {
    left: project({ x: rect.x, y: rect.y + rect.height }).x - 12,
    right: project({ x: rect.x + rect.width, y: rect.y }).x + 12,
    top: project(rect).y - rise - 12,
    bottom: nearDepth(rect) + 12,
  };
}

export function isArtInView(view: Phaser.Geom.Rectangle, bounds: ReturnType<typeof artBounds>) {
  return bounds.right >= view.left && bounds.left <= view.right && bounds.bottom >= view.top && bounds.top <= view.bottom;
}

export function noise(seed: number): number {
  const doubled = Math.imul(seed ^ 0x1d872b41, 0x85ebca6b);
  return ((doubled ^ doubled >>> 11) >>> 0) / 4294967296;
}
