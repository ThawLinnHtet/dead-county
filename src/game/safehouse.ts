import { dayLengthMs } from './survival.ts';
import { contains, furniture, houses, openings } from './world.ts';

export const nightsToSecureSafehouse = 3;
export const firstSafehouseDuskMs = dayLengthMs * (20 - 8) / 24;
export const safehouseNightLengthMs = dayLengthMs * 10 / 24;
export const firstSafehouseDawnMs = firstSafehouseDuskMs + safehouseNightLengthMs;

const bedCenters = furniture.filter(({ type }) => type === 'bed').map(({ x, y, width, height }) => ({
  x: x + width / 2, y: y + height / 2,
}));
export const eligibleSafehouses = new Map(houses.flatMap((house) =>
  bedCenters.some((center) => contains(house, center)) && openings.some(({ name, type }) =>
    name === house.name + '_door' && type === 'door')
    ? [[house.name, house] as const] : [],
));

export const safehouseDoorIds = new Set([...eligibleSafehouses.keys()].map((id) => id + '_door'));

export interface SafehouseProgress {
  readonly houseId: string;
  readonly nights: number;
  readonly dawnMs: number | null;
}

export function advanceSafehouse(
  safehouse: SafehouseProgress | null, beforeMs: number, afterMs: number, stayedInside: boolean,
): SafehouseProgress | null {
  if (!safehouse || safehouse.nights === nightsToSecureSafehouse) return safehouse;
  if (!stayedInside) return safehouse.dawnMs === null ? safehouse : { ...safehouse, dawnMs: null };

  const nextDusk = firstSafehouseDuskMs +
    (Math.floor((beforeMs - firstSafehouseDuskMs) / dayLengthMs) + 1) * dayLengthMs;
  let dawnMs = safehouse.dawnMs ?? (nextDusk <= afterMs ? nextDusk + safehouseNightLengthMs : null);
  let nights = safehouse.nights;
  if (dawnMs !== null && dawnMs <= afterMs) {
    const passedDawns = 1 + Math.floor((afterMs - dawnMs) / dayLengthMs);
    nights = Math.min(nightsToSecureSafehouse, nights + passedDawns);
    const followingDawn = dawnMs + passedDawns * dayLengthMs;
    dawnMs = nights < nightsToSecureSafehouse && followingDawn - safehouseNightLengthMs <= afterMs ? followingDawn : null;
  }
  return nights === safehouse.nights && dawnMs === safehouse.dawnMs ? safehouse : { ...safehouse, nights, dawnMs };
}
