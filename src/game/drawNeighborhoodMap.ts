import { details, groundTiles, mapHeight, mapWidth, outdoorProps, roofs } from './world';

export const houseNames: Readonly<Record<string, string>> = {
  house_a: 'House A',
  house_b: 'House B',
  house_c: 'House C',
};

// Ground tile IDs from the Tiled neighborhood tileset, including the two lawn variants.
const groundColors = ['#333826', '#50553a', '#555a3d', '#65625c', '#8d826b', '#665b45', '#665b45'];
const roofColors: Readonly<Record<string, string>> = {
  house_a: '#916d53',
  house_b: '#85847b',
  house_c: '#876357',
};
const entrances = new Set(['porch', 'covered_porch', 'risk_stoop', 'concrete_landing']);
const mapPixelsPerTile = 24;
let chartImage: string | undefined;

export function getNeighborhoodMapImage(): string {
  if (chartImage) return chartImage;
  const canvas = document.createElement('canvas');
  canvas.width = mapWidth * mapPixelsPerTile;
  canvas.height = mapHeight * mapPixelsPerTile;
  const art = canvas.getContext('2d')!;
  art.scale(mapPixelsPerTile, mapPixelsPerTile);

  groundTiles.forEach((tile, index) => {
    const x = index % mapWidth;
    const y = Math.floor(index / mapWidth);
    art.fillStyle = groundColors[tile] ?? groundColors[0]!;
    art.fillRect(x, y, 1, 1);
    if (tile !== 1 && tile !== 2) return;
    const offset = (index * 67 % 19) / 23;
    art.fillStyle = tile === 1 ? '#5b5e40' : '#434a34';
    art.fillRect(x + offset, y + .2, .15, .06);
    art.fillRect(x + .24, y + .64 + offset * .2, .10, .07);
  });

  for (const { x, y, width, height, type } of details) {
    if (!entrances.has(type)) continue;
    art.fillStyle = '#96856a';
    art.fillRect(x, y, width, height);
  }

  for (const { x, y, width, height, type } of outdoorProps) {
    if (type === 'tree') {
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      art.fillStyle = '#333d2d';
      art.beginPath();
      art.arc(centerX, centerY, 1.03, 0, Math.PI * 2);
      art.fill();
      art.fillStyle = '#646745';
      art.beginPath();
      art.arc(centerX - .18, centerY - .16, .77, 0, Math.PI * 2);
      art.fill();
    } else if (type === 'fence' || type === 'privacy_fence' || type === 'road_barrier' || type === 'car') {
      art.fillStyle = '#383b32';
      art.fillRect(x, y, width, height);
    }
  }

  for (const { name, x, y, width, height } of roofs) {
    art.fillStyle = '#33362c';
    art.fillRect(x + .22, y + .27, width, height);
    art.fillStyle = roofColors[name] ?? '#916d53';
    art.fillRect(x, y, width, height);
    art.fillStyle = 'rgb(24 20 17 / 25%)';
    art.fillRect(x, y + height / 2, width, height / 2);
    art.strokeStyle = '#32332c';
    art.lineWidth = .14;
    art.strokeRect(x, y, width, height);
    art.fillStyle = 'rgb(238 230 214 / 28%)';
    art.fillRect(x + .1, y + height / 2, width - .2, .09);
  }

  chartImage = canvas.toDataURL();
  return chartImage;
}
