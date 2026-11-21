import type Phaser from 'phaser';
import { noise } from './isometricDrawing';
import { tileHeight, tileWidth } from './world';

export const terrainTextureKey = 'terrain';

const grass = ['#4e563b', '#51583c', '#545a3d', '#575c3f', '#5a5e40', '#5d6041', '#606243'];
const asphalt = ['#3d403b', '#40413b', '#3e413d'];
const materials = ['#555e40', '#586343', asphalt[0]!, '#938977', '#725d49', '#a49d89', ...grass, ...asphalt.slice(1)];
const boards = ['#7c644c', '#6e5943', '#866b51', '#796049', '#82694e'];
const firstGrassFrame = 6;
const firstExtraAsphaltFrame = firstGrassFrame + grass.length;

function field(x: number, y: number) {
  const column = Math.floor(x);
  const row = Math.floor(y);
  const u = x - column;
  const v = y - row;
  const seed = column * 127 + row * 587;
  const top = noise(seed) * (1 - u) + noise(seed + 127) * u;
  const bottom = noise(seed + 587) * (1 - u) + noise(seed + 714) * u;
  return top * (1 - v) + bottom * v;
}

export function lawnVariation(x: number, y: number) {
  return field(x / 5.5, y / 5.5) * .72 + field(x / 2.4 + 32, y / 2.4 - 17) * .28;
}

export function terrainFrame(tile: number, x: number, y: number) {
  if (tile === 3) {
    const variant = Math.floor(noise(x * 987 + y * 379) * asphalt.length);
    return variant === 0 ? tile - 1 : firstExtraAsphaltFrame + variant - 1;
  }
  if (tile > 2) return tile - 1;
  return firstGrassFrame + Math.min(grass.length - 1, Math.floor(lawnVariation(x + .5, y + .5) * grass.length));
}

export function createTerrainTexture(textures: Phaser.Textures.TextureManager) {
  if (textures.exists(terrainTextureKey)) return;
  const texture = textures.createCanvas(terrainTextureKey, tileWidth * materials.length, tileHeight);
  if (!texture) return;
  const { context } = texture;
  for (const [tile, material] of materials.entries()) {
    const left = tile * tileWidth;
    const isAsphalt = tile === 2 || tile >= firstExtraAsphaltFrame;
    for (let y = 0; y < tileHeight; y += 1) {
      const row = (y + .5) / tileHeight;
      const halfSpan = Math.floor(Math.min(row, 1 - row) * tileWidth);
      const center = tileWidth / 2;
      context.fillStyle = material;
      context.fillRect(left + center - halfSpan, y, halfSpan * 2, 1);
      if (isAsphalt) {
        for (let x = center - halfSpan; x < center + halfSpan; x += 1) {
          const grit = noise(x * 131 + y * 997 + tile * 3337);
          if (grit > .94) {
            context.fillStyle = grit > .99 ? '#4b4b42' : '#373a34';
            context.fillRect(left + x, y, 1, 1);
          }
        }
        continue;
      }
      if (tile >= firstGrassFrame) {
        for (let x = center - halfSpan; x < center + halfSpan; x += 1) {
          const stubble = noise(x * 223 + Math.floor(y / 2) * 1637 + tile * 5059);
          if (stubble < .036) {
            context.fillStyle = stubble < .013 ? '#74744c' : '#454d35';
            context.globalAlpha = .38;
            context.fillRect(left + x, y, 1, 1);
            context.globalAlpha = 1;
          }
        }
        continue;
      }
      if (tile < 3) continue;
      for (let x = center - halfSpan; x < center + halfSpan; x += 1) {
        const across = (x + .5 - center) / tileWidth;
        const u = row + across;
        const v = row - across;
        if (tile === 3) {
          if (u < .035 || v < .035) context.fillStyle = '#746b5e';
          else if (u < .065 || v < .065) context.fillStyle = '#a39a86';
          else continue;
        } else if (tile === 4) {
          const board = Math.min(4, Math.floor(v * boards.length));
          const groove = v * boards.length - board;
          const joint = (board === 1 && Math.abs(u - .31) < .017) || (board === 3 && Math.abs(u - .74) < .017);
          context.fillStyle = groove < .11 || joint ? '#544637' : boards[board]!;
        } else {
          context.fillStyle = u < .035 || v < .035 ? '#858072'
            : (u < .5) === (v < .5) ? '#b0a891' : '#9c9685';
        }
        context.fillRect(left + x, y, 1, 1);
      }
    }
    texture.add(tile, 0, left, 0, tileWidth, tileHeight);
  }
  texture.refresh();
}
