import { canOccupy, canTraverse, mapHeight, mapWidth } from './world.ts';
import type { WorldPoint } from './world.ts';

const cellSize = 0.5;
const columns = Math.ceil(mapWidth / cellSize);
const rows = Math.ceil(mapHeight / cellSize);
const cellCount = columns * rows;
const neighbors = new Map<number, readonly number[]>();

function center(index: number): WorldPoint {
  return {
    x: (index % columns + 0.5) * cellSize,
    y: (Math.floor(index / columns) + 0.5) * cellSize,
  };
}

function distance(a: WorldPoint, b: WorldPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function nearbyCells(position: WorldPoint, radius: number): number[] {
  const x = Math.floor(position.x / cellSize);
  const y = Math.floor(position.y / cellSize);
  const cells: number[] = [];
  for (let row = Math.max(0, y - radius); row <= Math.min(rows - 1, y + radius); row += 1) {
    for (let column = Math.max(0, x - radius); column <= Math.min(columns - 1, x + radius); column += 1) {
      cells.push(row * columns + column);
    }
  }
  return cells;
}

function neighborsOf(index: number): readonly number[] {
  const cached = neighbors.get(index);
  if (cached) return cached;

  const position = center(index);
  const connected = nearbyCells(position, 1).filter((other) => other !== index && canTraverse(position, center(other)));
  neighbors.set(index, connected);
  return connected;
}

interface Candidate {
  readonly cell: number;
  readonly cost: number;
  readonly estimate: number;
}

export function findRoute(start: WorldPoint, goal: WorldPoint, traverse = canTraverse): WorldPoint[] | null {
  if (!canOccupy(goal) || !traverse(goal, goal)) return null;

  const entries = nearbyCells(start, 2).filter((index) => traverse(start, center(index)));
  const exits = new Set(nearbyCells(goal, 2).filter((index) => traverse(center(index), goal)));
  if (!entries.length || !exits.size) return null;

  const frontier: Candidate[] = [];
  const costs = new Float64Array(cellCount).fill(Infinity);
  const previous = new Int32Array(cellCount).fill(-1);
  for (const cell of entries) {
    const cost = distance(start, center(cell));
    costs[cell] = cost;
    frontier.push({ cell, cost, estimate: cost + distance(center(cell), goal) });
  }

  // Each cell has one best cost. Discard superseded entries before expanding.
  let expanded = 0;
  while (frontier.length > 0 && expanded < 1500) {
    let bestIndex = 0;
    for (let index = 1; index < frontier.length; index += 1) {
      if (frontier[index]!.estimate < frontier[bestIndex]!.estimate) bestIndex = index;
    }
    const { cell, cost } = frontier.splice(bestIndex, 1)[0]!;
    if (cost !== costs[cell]) continue;
    expanded += 1;
    if (exits.has(cell)) {
      const route = [goal];
      for (let index = cell; index !== -1; index = previous[index]!) route.push(center(index));
      return route.reverse();
    }

    const origin = center(cell);
    for (const nextCell of neighborsOf(cell)) {
      const position = center(nextCell);
      const nextCost = cost + distance(origin, position);
      if (nextCost >= costs[nextCell]!) continue;
      if (traverse !== canTraverse && !traverse(origin, position)) continue;
      costs[nextCell] = nextCost;
      previous[nextCell] = cell;
      frontier.push({ cell: nextCell, cost: nextCost, estimate: nextCost + distance(position, goal) });
    }
  }

  return null;
}
