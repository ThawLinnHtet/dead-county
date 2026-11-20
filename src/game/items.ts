import { canOccupy, contains, furniture, hasLineOfSight, houses } from './world.ts';
import type { MapObject, WorldPoint } from './world.ts';

export const itemDefinitions = {
  baseball_bat: { name: 'Baseball Bat', category: 'Melee Weapon', description: 'A sturdy wooden bat. Equip it for melee attacks.' },
  water_bottle: {
    name: 'Water Bottle',
    category: 'Drink',
    description: 'A bottle of water. Reduces Thirst.',
    use: { stat: 'thirst', change: -60, noBenefit: 'Thirst is already at zero.' },
  },
  canned_food: {
    name: 'Canned Food',
    category: 'Food',
    description: 'A can of preserved food. Reduces Hunger.',
    use: { stat: 'hunger', change: -65, noBenefit: 'Hunger is already at zero.' },
  },
  bandage: {
    name: 'Bandage',
    category: 'Medical',
    description: 'A clean bandage. Restores lost Health.',
    use: { stat: 'health', change: 40, noBenefit: 'Health is full.' },
  },
} as const;

export type ItemKind = keyof typeof itemDefinitions;
export type ConsumableStat = (typeof itemDefinitions)[Exclude<ItemKind, 'baseball_bat'>]['use']['stat'];
export interface ItemInstance {
  readonly id: string;
  readonly kind: ItemKind;
}

export interface DroppedItem {
  readonly item: ItemInstance;
  readonly position: WorldPoint;
}

export type ContainerStock = Readonly<Record<string, readonly ItemKind[]>>;
export type ContainerContents = Readonly<Record<string, readonly ItemInstance[]>>;

export const authoredStock: ContainerStock = {
  starter_container: ['baseball_bat', 'water_bottle'],
  house_b_kitchen_cabinet: ['canned_food'],
  house_b_living_cabinet: ['water_bottle', 'bandage'],
  house_c_kitchen_cabinet: ['canned_food', 'water_bottle'],
};

const containerTypes = new Set(['cabinet', 'drawer', 'supply_box']);
const indoorContainers = furniture.flatMap((object) => {
  if (!containerTypes.has(object.type)) return [];
  const center = { x: object.x + object.width / 2, y: object.y + object.height / 2 };
  const house = houses.find((zone) => contains(zone, center));
  return house ? [{ object, houseId: house.name }] : [];
});
const interactionReach = 1.35;
const dropRadius = .17;

export function seedContainers(stock: ContainerStock): ContainerContents {
  return Object.fromEntries(indoorContainers.flatMap(({ object }) => {
    const contents = stock[object.name];
    if (!contents) return [];
    return [[object.name, contents.map((kind, index) => ({ id: `${object.name}:${index}`, kind }))]];
  }));
}

export function reachableContainers(
  position: WorldPoint,
  houseId: string | null,
  contents: ContainerContents,
): { object: MapObject; distance: number }[] {
  return indoorContainers.flatMap(({ object, houseId: containerHouse }) => {
    if (houseId !== containerHouse || !contents[object.name]?.length) return [];
    const x = Math.min(Math.max(position.x, object.x), object.x + object.width);
    const y = Math.min(Math.max(position.y, object.y), object.y + object.height);
    const distance = Math.hypot(x - position.x, y - position.y);
    if (distance > interactionReach || distance === 0) return [];

    // Test just short of the cabinet surface so its own collision does not block the search.
    const edge = {
      x: x + (position.x - x) * .005 / distance,
      y: y + (position.y - y) * .005 / distance,
    };
    return hasLineOfSight(position, edge) ? [{ object, distance }] : [];
  });
}

export function reachableDrops(
  origin: WorldPoint,
  drops: readonly DroppedItem[],
): { drop: DroppedItem; distance: number }[] {
  return drops.flatMap((drop) => {
    const distance = Math.hypot(drop.position.x - origin.x, drop.position.y - origin.y);
    return distance <= interactionReach + 1e-9 && hasLineOfSight(origin, drop.position) ? [{ drop, distance }] : [];
  });
}

export function findDropPosition(origin: WorldPoint, drops: readonly DroppedItem[]): WorldPoint | null {
  const spacing = dropRadius * 2;
  const nearby = drops.filter(({ position }) =>
    Math.hypot(position.x - origin.x, position.y - origin.y) <= interactionReach + spacing);
  function isOpen(position: WorldPoint) {
    return canOccupy(position, dropRadius)
      && nearby.every((drop) =>
        Math.hypot(drop.position.x - position.x, drop.position.y - position.y) >= spacing - 1e-9)
      && hasLineOfSight(origin, position);
  }
  if (isOpen(origin)) return { ...origin };

  // Search outward with fine, evenly spaced samples, including the edge of pickup reach.
  const step = .06;
  const firstRing = nearby.reduce((radius, { position }) =>
    Math.max(radius, spacing - Math.hypot(position.x - origin.x, position.y - origin.y)), step);
  for (let radius = firstRing; ; radius = Math.min(radius + step, interactionReach)) {
    const samples = Math.ceil(2 * Math.PI * radius / step);
    for (let index = 0; index < samples; index += 1) {
      const angle = index * 2 * Math.PI / samples;
      const candidate = { x: origin.x + radius * Math.cos(angle), y: origin.y + radius * Math.sin(angle) };
      if (isOpen(candidate)) return candidate;
    }
    if (radius === interactionReach) return null;
  }
}
