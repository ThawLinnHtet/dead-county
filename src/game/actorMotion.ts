import type Phaser from 'phaser';
import type { ZombieAppearanceId } from './zombie';

export const actorFrameWidth = 40;
export const actorFrameHeight = 58;
export const actorOrigin = 56 / actorFrameHeight;
export const zombieWalkKey = 'zombie-walk';

export const zombieLooks = {
  zombie_civilian: { row: 0, texture: 'actors', frame: 7, trousers: '#5a5d54', shadow: '#3b3e36' },
  zombie_worker: { row: 1, texture: 'zombie-variants', frame: 0, trousers: '#6e6b52', shadow: '#494637' },
  zombie_hoodie: { row: 2, texture: 'zombie-variants', frame: 1, trousers: '#626b6b', shadow: '#424a4d' },
  zombie_female: { row: 3, texture: 'zombie-variants', frame: 2, trousers: '#666c58', shadow: '#484d43' },
  zombie_bloody: { row: 4, texture: 'zombie-variants', frame: 3, trousers: '#606c63', shadow: '#454d44' },
} satisfies Record<ZombieAppearanceId, {
  row: number; texture: string; frame: number; trousers: string; shadow: string;
}>;

// Each contact foot travels back at ground height while the returning foot lifts.
const steps = [
  { nearX: 6, nearLift: 0, farX: -6, farLift: 0, dip: 1 },
  { nearX: 2, nearLift: 0, farX: -4, farLift: 3, dip: 0 },
  { nearX: -3, nearLift: 0, farX: 0, farLift: 3, dip: 0 },
  { nearX: -6, nearLift: 0, farX: 5, farLift: 0, dip: 1 },
  { nearX: -4, nearLift: 3, farX: 2, farLift: 0, dip: 0 },
  { nearX: 1, nearLift: 3, farX: -2, farLift: 0, dip: 0 },
];

export function createZombieWalkTexture(textures: Phaser.Textures.TextureManager) {
  if (textures.exists(zombieWalkKey)) return;
  const canvas = textures.createCanvas(
    zombieWalkKey, actorFrameWidth * steps.length, actorFrameHeight * Object.keys(zombieLooks).length,
  );
  if (!canvas) return;
  const context = canvas.context;

  for (const look of Object.values(zombieLooks)) {
    const source = textures.get(look.texture).getSourceImage() as HTMLImageElement;
    for (const [frame, step] of steps.entries()) {
      const x = frame * actorFrameWidth;
      const y = look.row * actorFrameHeight;
      context.save();
      context.translate(x, y);
      drawLeg(context, 20, 19 + step.farX, 54 - step.farLift, look.shadow, '#524233');
      drawLeg(context, 23, 21 + step.nearX, 56 - step.nearLift, look.trousers, '#66503a');

      // Preserve the original silhouette, clothing and face above the knee articulation.
      context.drawImage(source, look.frame * actorFrameWidth, 0, actorFrameWidth, 38,
        1, step.dip, actorFrameWidth, 38);
      context.restore();
      canvas.add(look.row * steps.length + frame, 0, x, y, actorFrameWidth, actorFrameHeight);
    }
  }
  canvas.refresh();
}

function drawLeg(context: CanvasRenderingContext2D, hipX: number, bootX: number, sole: number, cloth: string, boot: string) {
  const hipY = 35;
  const kneeY = 44;
  const ankleY = sole - 3;
  const kneeX = Math.round((hipX + bootX) / 2) + 2;
  const outline = '#282620';
  for (let y = hipY; y <= ankleY; y += 1) {
    const center = y <= kneeY
      ? hipX + (kneeX - hipX) * (y - hipY) / (kneeY - hipY)
      : kneeX + (bootX - kneeX) * (y - kneeY) / (ankleY - kneeY);
    const x = Math.round(center);
    const width = y < kneeY ? 7 : 5;
    const left = x - Math.floor(width / 2);
    context.fillStyle = outline;
    context.fillRect(left, y, width, 1);
    context.fillStyle = cloth;
    context.fillRect(left + 2, y, width - 3, 1);
  }
  context.fillStyle = outline;
  context.fillRect(bootX - 2, sole - 4, 6, 2);
  context.fillRect(bootX - 3, sole - 3, 10, 3);
  context.fillStyle = boot;
  context.fillRect(bootX - 2, sole - 2, 8, 1);
}

export function zombieWalkFrame(appearance: ZombieAppearanceId, distance: number) {
  return zombieLooks[appearance].row * steps.length + Math.floor(distance * 11) % steps.length;
}
