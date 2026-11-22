import { canOccupy, contains, furniture, hasLineOfSight, houses } from './world.ts';
import type { MapObject, WorldPoint } from './world.ts';
import { districtBuildings } from './district.ts';

export const itemDefinitions = {
  baseball_bat: {
    name: 'Baseball Bat', category: 'Melee Weapon', description: 'Longer reach and a harder hit. Takes more time between swings.', weight: 1.3,
  },
  kitchen_knife: {
    name: 'Kitchen Knife', category: 'Melee Weapon', description: 'Quick, quiet swings. Get closer than you would with the bat.', weight: .35,
  },
  water_bottle: {
    name: 'Water Bottle',
    category: 'Drink',
    description: 'A bottle of water. Reduces Thirst.',
    weight: 1,
    use: { stat: 'thirst', change: -60, noBenefit: 'Thirst is already at zero.' },
  },
  canned_food: {
    name: 'Canned Food',
    category: 'Food',
    description: 'A can of preserved food. Reduces Hunger.',
    weight: .8,
    use: { stat: 'hunger', change: -65, noBenefit: 'Hunger is already at zero.' },
  },
  bandage: {
    name: 'Bandage',
    category: 'Medical',
    description: 'A clean bandage. Stops bleeding and restores lost Health.',
    weight: .15,
    use: { stat: 'health', change: 40, noBenefit: 'Health is full.' },
  },
  trail_mix: {
    name: 'Trail Mix', category: 'Food', description: 'A light snack that takes the edge off Hunger.', weight: .2,
    use: { stat: 'hunger', change: -27, noBenefit: 'Hunger is already at zero.' },
  },
  backpack: {
    name: 'Canvas Backpack', category: 'Gear', description: 'Equip it to open six storage slots and carry up to 9 kg.', weight: .6,
  },
  door_wedge: {
    name: 'Door Wedge', category: 'Shelter', description: 'Use beside a closed door from inside to resist forced entry.', weight: .25,
  },
  board: {
    name: 'Board', category: 'Shelter', weight: .65,
    description: 'Use with a Hammer from inside beside the closed front door of Alder House.',
  },
  hammer: {
    name: 'Hammer', category: 'Tool', weight: .45,
    description: 'Carry it in a pocket or your worn backpack to install a Board at Alder House.',
  },
  workshop_key: {
    name: 'Workshop Key', category: 'Key', description: 'Carry it in your inventory or worn backpack to unlock Cedar Workshop.', weight: .05,
  },
} as const;

export type ItemKind = keyof typeof itemDefinitions;
export const inventoryQuickSlotCount = 10;
export type ConsumableStat = 'health' | 'hunger' | 'thirst';
export const baseCarryCapacity = 5;
export const backpackCapacity = 9;
export const backpackSlots = 6;
export const containerSlots = 16;
export interface ItemInstance {
  readonly id: string;
  readonly kind: ItemKind;
}

export function itemWeight(item: ItemInstance, packs: ContainerContents) {
  return itemDefinitions[item.kind].weight + (packs[item.id] ?? []).reduce((sum, entry) => sum + itemDefinitions[entry.kind].weight, 0);
}

export function carriedLoad(inventory: readonly (ItemInstance | null)[], packId: string | null, packs: ContainerContents = {}) {
  const total = inventory.reduce((sum, item) => sum + (item ? itemWeight(item, packs) : 0), 0);
  const weight = Math.round(total * 100) / 100;
  const exertion = Math.min(1, Math.max(0, (weight - 3.5) / (backpackCapacity - 3.5)));
  return { weight, capacity: packId ? backpackCapacity : baseCarryCapacity, exertion };
}

export interface DroppedItem {
  readonly item: ItemInstance;
  readonly position: WorldPoint;
}

export type ContainerStock = Readonly<Record<string, readonly ItemKind[]>>;
export type ContainerContents = Readonly<Record<string, readonly ItemInstance[]>>;

export const starterStock: ContainerStock = {
  starter_container: ['baseball_bat', 'water_bottle'],
  house_b_kitchen_cabinet: ['canned_food'],
  house_b_living_cabinet: ['water_bottle', 'bandage'],
  house_c_kitchen_cabinet: ['canned_food', 'water_bottle'],
};

export const knifeCabinetId = 'house_b_kitchen_cabinet';

export const expandedStock: ContainerStock = {
  ...starterStock,
  ...Object.fromEntries(districtBuildings.map(({ id, unexpandedStock }) => [`${id}_cabinet`, unexpandedStock])),
};

export const authoredStock: ContainerStock = {
  ...starterStock,
  [knifeCabinetId]: [...starterStock[knifeCabinetId]!, 'kitchen_knife'],
  house_b_living_cabinet: [...starterStock.house_b_living_cabinet!, 'backpack', 'door_wedge'],
  ...Object.fromEntries(districtBuildings.map(({ id, stock }) => [`${id}_cabinet`, stock])),
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
const indoorBeds = furniture.filter(({ type }) => type === 'bed');

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
  contents: ContainerContents, sight = hasLineOfSight,
): { object: MapObject; distance: number }[] {
  return reachableFurniture(position, indoorContainers.flatMap(({ object, houseId: containerHouse }) =>
    houseId === containerHouse && Object.hasOwn(contents, object.name) ? [object] : []), sight);
}

export function reachableBeds(position: WorldPoint, houseId: string | null, sight = hasLineOfSight) {
  const house = houses.find(({ name }) => name === houseId);
  return house ? reachableFurniture(position, indoorBeds.filter((bed) => contains(house, {
    x: bed.x + bed.width / 2, y: bed.y + bed.height / 2,
  })), sight) : [];
}

function reachableFurniture(position: WorldPoint, objects: readonly MapObject[], sight: typeof hasLineOfSight) {
  return objects.flatMap((object) => {
    const x = Math.min(Math.max(position.x, object.x), object.x + object.width);
    const y = Math.min(Math.max(position.y, object.y), object.y + object.height);
    const distance = Math.hypot(x - position.x, y - position.y);
    if (distance > interactionReach || distance === 0) return [];

    // Test just short of the surface so the object's own collision does not block the interaction.
    const edge = {
      x: x + (position.x - x) * .005 / distance,
      y: y + (position.y - y) * .005 / distance,
    };
    return sight(position, edge) ? [{ object, distance }] : [];
  });
}

export function reachableDrops(
  origin: WorldPoint,
  drops: readonly DroppedItem[], sight = hasLineOfSight,
): { drop: DroppedItem; distance: number }[] {
  return drops.flatMap((drop) => {
    const distance = Math.hypot(drop.position.x - origin.x, drop.position.y - origin.y);
    return distance <= interactionReach + 1e-9 && sight(origin, drop.position) ? [{ drop, distance }] : [];
  });
}

export function findDropPosition(origin: WorldPoint, drops: readonly DroppedItem[], occupy = canOccupy, sight = hasLineOfSight): WorldPoint | null {
  const spacing = dropRadius * 2;
  const nearby = drops.filter(({ position }) =>
    Math.hypot(position.x - origin.x, position.y - origin.y) <= interactionReach + spacing);
  function isOpen(position: WorldPoint) {
    return occupy(position, dropRadius)
      && nearby.every((drop) =>
        Math.hypot(drop.position.x - position.x, drop.position.y - position.y) >= spacing - 1e-9)
      && sight(origin, position);
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
