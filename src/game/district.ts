import type { ItemKind } from './items.ts';
import type { MapObject } from './world.ts';

export const districtWidth = 126;
export const districtHeight = 49;

export const workshopLock = {
  doorId: 'lot_3_1_door',
  houseId: 'lot_3_1',
  keyCabinetId: 'lot_3_2_cabinet',
  keyKind: 'workshop_key',
} as const;

export const alderShelter = {
  houseId: 'lot_1_2',
  doorId: 'lot_1_2_door',
  windowId: 'lot_1_2_window',
  hammerCabinetId: 'lot_1_1_cabinet',
  boardCabinetId: 'lot_1_2_cabinet',
} as const;

const blocks = [
  { x: 54, y: 2, name: 'Alder', landmark: 'Corner Store', supplies: ['canned_food', 'canned_food', 'water_bottle'] },
  { x: 78, y: 3, name: 'Birch', landmark: 'Birch Clinic', supplies: ['bandage', 'bandage', 'water_bottle'] },
  { x: 102, y: 2, name: 'Cedar', landmark: 'Cedar Workshop', supplies: ['baseball_bat', 'bandage', 'water_bottle'] },
  { x: 54, y: 26, name: 'Dale', landmark: 'Community Hall', supplies: ['water_bottle', 'bandage', 'canned_food'] },
  { x: 78, y: 27, name: 'Elm', landmark: 'Elm Grocery', supplies: ['canned_food', 'water_bottle', 'canned_food'] },
  { x: 102, y: 28, name: 'Fern', landmark: 'Fern Laundromat', supplies: ['bandage', 'water_bottle', 'water_bottle'] },
] as const satisfies readonly { x: number; y: number; name: string; landmark: string; supplies: readonly ItemKind[] }[];

export function mapObject(name: string, type: string, x: number, y: number, width: number, height: number): MapObject {
  return { name, type, x, y, width, height };
}

export const districtBuildings = blocks.flatMap((block, blockIndex) => [
  { dx: 0, dy: 0, width: 8, height: 6, name: block.landmark, stock: block.supplies, featured: true },
  { dx: 11, dy: 1, width: 7, height: 5, name: `${block.name} House`, stock: ['water_bottle'], featured: false },
  { dx: blockIndex % 2 === 0 ? 1 : 10, dy: 9, width: 8, height: 5, name: `${block.name} Bungalow`, stock: ['canned_food', 'bandage'], featured: false },
].map(({ dx, dy, width, height, name, stock, featured }, lot) => {
  const id = `lot_${blockIndex + 1}_${lot + 1}`;
  const x = block.x + dx;
  const y = block.y + dy;
  const front = y + height - .14;
  const entrance = x + width / 2 - .75;
  const windowY = y + 1.6;
  const expanded = [...stock] as ItemKind[];
  if (featured) expanded.push(blockIndex % 2 === 0 ? 'door_wedge' : 'trail_mix');
  if (id === alderShelter.houseId) expanded.push('backpack');
  if (id + '_cabinet' === alderShelter.hammerCabinetId) expanded.push('hammer');
  if (id + '_cabinet' === alderShelter.boardCabinetId) expanded.push('board');
  if (`${id}_cabinet` === workshopLock.keyCabinetId) expanded.push(workshopLock.keyKind);
  return {
    id, name, featured, unexpandedStock: stock as readonly ItemKind[],
    stock: expanded,
    palette: (blockIndex + lot) % 3,
    house: mapObject(id, 'interior', x, y, width, height),
    walls: [
      mapObject(`${id}_north`, 'wall', x, y, width, .14),
      mapObject(`${id}_west`, 'wall', x, y, .14, height),
      mapObject(`${id}_east_top`, 'wall', x + width - .14, y, .14, 1.6),
      mapObject(`${id}_east_bottom`, 'wall', x + width - .14, windowY + 1.2, .14, height - 2.8),
      mapObject(`${id}_front_left`, 'wall', x, front, width / 2 - .75, .14),
      mapObject(`${id}_front_right`, 'wall', entrance + 1.5, front, width / 2 - .75, .14),
    ],
    openings: [
      mapObject(`${id}_door`, 'door', entrance, front, 1.5, .14),
      mapObject(`${id}_window`, 'window', x + width - .14, windowY, .14, 1.2),
    ],
    furniture: [
      mapObject(`${id}_cabinet`, 'cabinet', x + .5, y + .6, 1.6, .75),
      mapObject(`${id}_furnishing`, featured ? 'counter' : 'bed', x + width - 2.4, y + .5, 1.55, 1.05),
    ],
    porch: mapObject(`${id}_stoop`, 'concrete_landing', entrance - .36, front + .14, 2.22, .9),
  };
}));

export const districtScenery = blocks.flatMap(({ x, y }, i) => [
  mapObject(`block_${i}_oak`, 'tree', x + 9.2, y + 7.6, .49, .48),
  mapObject(`block_${i}_shade`, 'tree', x + 19.9, y + 9.4, .48, .45),
  mapObject(`block_${i}_yard`, 'privacy_fence', x + 2.2, y + 16.5, 6.4, .14),
]);

export function districtGround(x: number, y: number): number {
  const building = districtBuildings.some(({ house }) => x >= house.x && x < house.x + house.width && y >= house.y && y < house.y + house.height);
  if (building) return 5;
  const avenue = x >= 49 && y >= 18 && y <= 22;
  const lane = x >= 51 && (y === 7 || y === 33 || y === 45);
  const crossStreet = x >= 51 && [51, 52, 73, 74, 75, 97, 98, 99, 121, 122].includes(x);
  if (avenue || crossStreet || lane) return 3;
  if (x >= 49 && (y === 17 || y === 23 || y === 44 || y === 46 || [53, 72, 76, 96, 100, 120, 123].includes(x))) return 4;
  return (x * 11 + y * 7) % 6 === 0 ? 2 : 1;
}
