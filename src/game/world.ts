import houseAMap from './maps/house-a.json' with { type: 'json' };

export interface WorldPoint {
  readonly x: number;
  readonly y: number;
}

export interface WorldRect extends WorldPoint {
  readonly width: number;
  readonly height: number;
}

export interface MapObject extends WorldRect {
  readonly name: string;
  readonly type: string;
}

export const tileWidth = houseAMap.tilewidth;
export const tileHeight = houseAMap.tileheight;
export const mapWidth = houseAMap.width;
export const mapHeight = houseAMap.height;
export const groundTiles = houseAMap.layers.find((layer) => layer.name === 'Ground')?.data ?? [];

function objectsOn(layerName: string): MapObject[] {
  const layer = houseAMap.layers.find((entry) => entry.name === layerName);
  // Tiled's isometric object coordinates use the map's tile height on both axes.
  return (layer?.objects ?? []).map(({ name, type, x, y, width, height }) => ({
    name,
    type,
    x: x / tileHeight,
    y: y / tileHeight,
    width: width / tileHeight,
    height: height / tileHeight,
  }));
}

function requireObject(layerName: string, name: string): MapObject {
  const object = objectsOn(layerName).find((entry) => entry.name === name);
  if (!object) throw new Error(`Missing Tiled object ${layerName}/${name}`);
  return object;
}

export const walls = objectsOn('BuildingsWalls');
export const furniture = objectsOn('Furniture');
export const outdoorProps = objectsOn('LowObstacles');
export const houses = objectsOn('Zones').filter((entry) => entry.type === 'interior');
export const details = objectsOn('Zones').filter((entry) => entry.type !== 'interior');
export const roofs = objectsOn('RoofOverlay');
const blockers = [...walls, ...furniture, ...outdoorProps];
const bounds = requireObject('Navigation', 'neighborhood');

const { x: spawnX, y: spawnY } = requireObject('Entities', 'survivor_spawn');
export const survivorSpawn: WorldPoint = { x: spawnX, y: spawnY };
const entities = objectsOn('Entities');
export const zombieSpawns = entities.filter((entity) => entity.type === 'zombie').map(({ name, x, y }) => {
  const destination = requireObject('Entities', name + '_wander');
  return { id: name, position: { x, y }, destination: { x: destination.x, y: destination.y } };
});

export function project({ x, y }: WorldPoint): WorldPoint {
  return { x: (x - y) * tileWidth / 2, y: (x + y) * tileHeight / 2 };
}

export function unproject({ x, y }: WorldPoint): WorldPoint {
  return { x: x / tileWidth + y / tileHeight, y: y / tileHeight - x / tileWidth };
}

const actorRadius = 0.23;

export function canOccupy(position: WorldPoint, radius = actorRadius): boolean {
  const { x, y } = position;
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(radius) || radius <= 0 ||
      x - radius < bounds.x || y - radius < bounds.y ||
      x + radius > bounds.x + bounds.width || y + radius > bounds.y + bounds.height) {
    return false;
  }

  return !blockers.some((blocker) => {
    const closestX = Math.min(Math.max(x, blocker.x), blocker.x + blocker.width);
    const closestY = Math.min(Math.max(y, blocker.y), blocker.y + blocker.height);
    return (x - closestX) ** 2 + (y - closestY) ** 2 < radius ** 2;
  });
}

function intersectsSegment(rect: WorldRect, start: WorldPoint, end: WorldPoint): boolean {
  let entry = 0;
  let exit = 1;
  for (const [origin, delta, low, high] of [
    [start.x, end.x - start.x, rect.x, rect.x + rect.width],
    [start.y, end.y - start.y, rect.y, rect.y + rect.height],
  ] as const) {
    if (delta === 0) {
      if (origin < low || origin > high) return false;
      continue;
    }
    const a = (low - origin) / delta;
    const b = (high - origin) / delta;
    entry = Math.max(entry, Math.min(a, b));
    exit = Math.min(exit, Math.max(a, b));
    if (entry > exit) return false;
  }
  return true;
}

export function hasLineOfSight(start: WorldPoint, end: WorldPoint): boolean {
  return !blockers.some((rect) => intersectsSegment(rect, start, end));
}

export function canTraverse(start: WorldPoint, end: WorldPoint): boolean {
  if (!canOccupy(start) || !canOccupy(end)) return false;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return true;

  return !blockers.some((rect) => {
    if (intersectsSegment(rect, start, end)) return true;
    // Test the rounded corners of a swept actor footprint. Endpoint clearance
    // above covers nearest points along a wall's face.
    for (const x of [rect.x, rect.x + rect.width]) {
      for (const y of [rect.y, rect.y + rect.height]) {
        const t = Math.min(1, Math.max(0, ((x - start.x) * dx + (y - start.y) * dy) / lengthSquared));
        if ((x - (start.x + t * dx)) ** 2 + (y - (start.y + t * dy)) ** 2 < actorRadius ** 2) return true;
      }
    }
    return false;
  });
}

export function contains(rect: WorldRect, point: WorldPoint, margin = 0): boolean {
  return point.x >= rect.x + margin && point.x <= rect.x + rect.width - margin &&
    point.y >= rect.y + margin && point.y <= rect.y + rect.height - margin;
}
