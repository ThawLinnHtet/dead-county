import type Phaser from 'phaser';
import { tileHeight, tileWidth } from './world';

export const terrainTextureKey = 'terrain';

const materials = ['#555e40', '#586343', '#3b3f3b', '#8c8779', '#725d49', '#a49d89'];
const boards = ['#78634e', '#6f5a46', '#826d56', '#74604c', '#7d6850'];

export function createTerrainTexture(textures: Phaser.Textures.TextureManager) {
  if (textures.exists(terrainTextureKey)) return;
  const texture = textures.createCanvas(terrainTextureKey, tileWidth * materials.length, tileHeight);
  if (!texture) return;
  const { context } = texture;
  for (const [tile, material] of materials.entries()) {
    const left = tile * tileWidth;
    for (let y = 0; y < tileHeight; y += 1) {
      const row = (y + .5) / tileHeight;
      const halfSpan = Math.floor(Math.min(row, 1 - row) * tileWidth);
      const center = tileWidth / 2;
      context.fillStyle = material;
      context.fillRect(left + center - halfSpan, y, halfSpan * 2, 1);
      if (tile < 3) continue;
      for (let x = center - halfSpan; x < center + halfSpan; x += 1) {
        const across = (x + .5 - center) / tileWidth;
        const u = row + across;
        const v = row - across;
        if (tile === 3) {
          if (u < .035 || v < .035) context.fillStyle = '#757166';
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
