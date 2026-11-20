import { contains, furniture, hasLineOfSight, houses } from './world.ts';
import type { MapObject, WorldPoint } from './world.ts';

export const itemDefinitions = {
  baseball_bat: { name: 'Baseball Bat', category: 'Melee Weapon', description: 'A sturdy wooden bat. Equip it for melee attacks.' },
  water_bottle: { name: 'Water Bottle', category: 'Drink', description: 'A bottle of water. Reduces Thirst.' },
  canned_food: { name: 'Canned Food', category: 'Food', description: 'A can of preserved food. Reduces Hunger.' },
  bandage: { name: 'Bandage', category: 'Medical', description: 'A clean bandage. Restores lost Health.' },
} as const;

export type ItemKind = keyof typeof itemDefinitions;
export interface ItemInstance {
  readonly id: string;
  readonly kind: ItemKind;
}

export type ContainerStock = Readonly<Record<string, readonly ItemKind[]>>;
export type ContainerContents = Readonly<Record<string, readonly ItemInstance[]>>;

export const authoredStock: ContainerStock = {
  starter_container: ['baseball_bat', 'water_bottle'],
  house_b_kitchen_cabinet: ['canned_food'],
  house_b_living_cabinet: ['water_bottle', 'bandage'],
};

const containerTypes = new Set(['cabinet', 'drawer', 'supply_box']);
const indoorContainers = furniture.flatMap((object) => {
  if (!containerTypes.has(object.type)) return [];
  const center = { x: object.x + object.width / 2, y: object.y + object.height / 2 };
  const house = houses.find((zone) => contains(zone, center));
  return house ? [{ object, houseId: house.name }] : [];
});
const searchReach = 1.35;

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
    if (distance > searchReach || distance === 0) return [];

    // Test just short of the cabinet surface so its own collision does not block the search.
    const edge = {
      x: x + (position.x - x) * .005 / distance,
      y: y + (position.y - y) * .005 / distance,
    };
    return hasLineOfSight(position, edge) ? [{ object, distance }] : [];
  });
}
