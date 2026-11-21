import neighborhood from './maps/neighborhood.json' with { type: 'json' };
import { districtBuildings, districtGround, districtHeight, districtScenery, districtWidth, mapObject } from './district.ts';

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

export const tileWidth = neighborhood.tilewidth;
export const tileHeight = neighborhood.tileheight;
export const mapWidth = districtWidth;
export const mapHeight = districtHeight;
const originalGround = neighborhood.layers.find((layer) => layer.name === 'Ground')?.data ?? [];
export const groundTiles = Array.from({ length: mapWidth * mapHeight }, (_, index) => {
  const x = index % mapWidth;
  const y = Math.floor(index / mapWidth);
  return x < neighborhood.width && y < neighborhood.height ? originalGround[y * neighborhood.width + x]! : districtGround(x, y);
});

function objectsOn(layerName: string) {
  const layer = neighborhood.layers.find((entry) => entry.name === layerName);
  // Tiled's isometric object coordinates use the map's tile height on both axes.
  return (layer?.objects ?? []).map(({ name, type, x, y, width, height, properties }) => ({
    name,
    type,
    x: x / tileHeight,
    y: y / tileHeight,
    width: width / tileHeight,
    height: height / tileHeight,
    properties,
  }));
}

function requireObject(layerName: string, name: string): MapObject {
  const object = objectsOn(layerName).find((entry) => entry.name === name);
  if (!object) throw new Error(`Missing Tiled object ${layerName}/${name}`);
  return object;
}

export const walls = [...objectsOn('BuildingsWalls'), ...districtBuildings.flatMap((lot) => lot.walls)];
export const furniture = [...objectsOn('Furniture'), ...districtBuildings.flatMap((lot) => lot.furniture)];
export const outdoorProps = [...objectsOn('LowObstacles').filter(({ name }) => name !== 'east_road_barrier'), ...districtScenery];
export const houses = [...objectsOn('Zones').filter((entry) => entry.type === 'interior'), ...districtBuildings.map((lot) => lot.house)];
export const details = [...objectsOn('Zones').filter((entry) => entry.type !== 'interior'), ...districtBuildings.map((lot) => lot.porch)];
export const roofs = [...objectsOn('RoofOverlay'), ...districtBuildings.map((lot) => lot.house)];
export const openings = [mapObject('house_a_door', 'door', 13.90, 7.42, .14, 1.73),
  mapObject('house_b_door', 'door', 25.73, 15.76, 1.67, .14),
  mapObject('house_c_door', 'door', 40.2, 15.96, 1.7, .14),
  mapObject('house_c_side_door', 'door', 45.16, 13.59, .14, 1.68),
  ...districtBuildings.flatMap((lot) => lot.openings)];
export const initiallyClosed = openings.filter((opening) => opening.type === 'window').map(({ name }) => name);
const blockers = [...walls, ...furniture, ...outdoorProps];
const bucketSize = 5;
const bucketColumns = Math.ceil((mapWidth + bucketSize) / bucketSize);
const obstacleBuckets = new Map<number, MapObject[]>();
for (const rect of blockers) {
  for (const index of bucketIndices(rect.x, rect.y, rect.x + rect.width, rect.y + rect.height)) {
    const bucket = obstacleBuckets.get(index);
    if (bucket) bucket.push(rect);
    else obstacleBuckets.set(index, [rect]);
  }
}

function* bucketIndices(left: number, top: number, right: number, bottom: number) {
  for (let y = Math.max(0, Math.floor(top / bucketSize)); y <= Math.floor(bottom / bucketSize); y += 1) {
    for (let x = Math.max(0, Math.floor(left / bucketSize)); x <= Math.floor(right / bucketSize); x += 1) {
      yield y * bucketColumns + x;
    }
  }
}

function someObstacle(start: WorldPoint, end: WorldPoint, margin: number, test: (rect: MapObject) => boolean) {
  const indices = bucketIndices(Math.min(start.x, end.x) - margin, Math.min(start.y, end.y) - margin,
    Math.max(start.x, end.x) + margin, Math.max(start.y, end.y) + margin);
  for (const index of indices) {
    if (obstacleBuckets.get(index)?.some(test)) return true;
  }
  return false;
}

const { x: spawnX, y: spawnY } = requireObject('Entities', 'survivor_spawn');
export const survivorSpawn: WorldPoint = { x: spawnX, y: spawnY };
const zombieAppearances = [
  'zombie_civilian', 'zombie_worker', 'zombie_hoodie', 'zombie_female', 'zombie_bloody',
] as const;
export type ZombieAppearanceId = typeof zombieAppearances[number];

export const starterZombieSpawns = objectsOn('Entities').filter((entity) => entity.type === 'zombie')
  .map(({ name, x, y, properties }) => {
    const destination = requireObject('Entities', name + '_wander');
    const authoredAppearance = properties?.find((property) => property.name === 'appearance')?.value;
    const appearanceId = zombieAppearances.find((appearance) => appearance === authoredAppearance);
    if (!appearanceId) throw new Error(`Unknown Tiled zombie appearance for ${name}: ${authoredAppearance}`);
    return { id: name, position: { x, y }, destination: { x: destination.x, y: destination.y }, appearanceId };
  });
export const zombieSpawns = [...starterZombieSpawns, ...[
  [56, 20], [65, 12], [74, 19], [92, 16], [98, 19],
  [110, 18], [57, 44], [76.5, 43], [91, 44], [123, 33],
].map(([x, y], index) => ({
  id: `district_zombie_${index + 1}`, position: { x: x!, y: y! },
  destination: { x: x! + 2, y: y! > 24 ? y! + 1.4 : y! + .25 },
  appearanceId: zombieAppearances[index % zombieAppearances.length]!,
}))];

export function project({ x, y }: WorldPoint): WorldPoint {
  return { x: (x - y) * tileWidth / 2, y: (x + y) * tileHeight / 2 };
}

export function unproject({ x, y }: WorldPoint): WorldPoint {
  return { x: x / tileWidth + y / tileHeight, y: y / tileHeight - x / tileWidth };
}

export const actorRadius = 0.23;

export function canOccupy(position: WorldPoint, radius = actorRadius, closed: readonly MapObject[] = []): boolean {
  const { x, y } = position;
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(radius) || radius <= 0 ||
      x - radius < 0 || y - radius < 0 || x + radius > mapWidth || y + radius > mapHeight) {
    return false;
  }

  const overlaps = (blocker: MapObject) => overlapsOpening(position, blocker, radius);
  return !someObstacle(position, position, radius, overlaps) && !closed.some(overlaps);
}

export function overlapsOpening({ x, y }: WorldPoint, rect: MapObject, radius = actorRadius) {
  const closestX = Math.min(Math.max(x, rect.x), rect.x + rect.width);
  const closestY = Math.min(Math.max(y, rect.y), rect.y + rect.height);
  return (x - closestX) ** 2 + (y - closestY) ** 2 < radius ** 2;
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

export function hasLineOfSight(start: WorldPoint, end: WorldPoint, closed: readonly MapObject[] = []): boolean {
  const blocksSight = (rect: MapObject) => intersectsSegment(rect, start, end);
  return !someObstacle(start, end, 0, blocksSight) && !closed.some(blocksSight);
}

export function canTraverse(start: WorldPoint, end: WorldPoint, closed: readonly MapObject[] = []): boolean {
  if (!canOccupy(start, actorRadius, closed) || !canOccupy(end, actorRadius, closed)) return false;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return true;

  const obstructsTravel = (rect: MapObject) => {
    if (Math.min(start.x, end.x) - actorRadius > rect.x + rect.width || Math.max(start.x, end.x) + actorRadius < rect.x
      || Math.min(start.y, end.y) - actorRadius > rect.y + rect.height || Math.max(start.y, end.y) + actorRadius < rect.y) return false;
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
  };
  return !someObstacle(start, end, actorRadius, obstructsTravel) && !closed.some(obstructsTravel);
}

export function contains(rect: WorldRect, point: WorldPoint, margin = 0): boolean {
  return point.x >= rect.x + margin && point.x <= rect.x + rect.width - margin &&
    point.y >= rect.y + margin && point.y <= rect.y + rect.height - margin;
}

export function createTraversal(closed: () => readonly MapObject[]) {
  return {
    canOccupy: (position: WorldPoint, radius = actorRadius) => canOccupy(position, radius, closed()),
    canTraverse: (start: WorldPoint, end: WorldPoint) => canTraverse(start, end, closed()),
    hasLineOfSight: (start: WorldPoint, end: WorldPoint) => hasLineOfSight(start, end, closed()),
  };
}

export type Traversal = ReturnType<typeof createTraversal>;
