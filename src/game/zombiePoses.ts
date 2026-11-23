import type Phaser from 'phaser';
import { actorFrameHeight, actorFrameWidth, zombieLooks } from './actorMotion';
import { shoveConfig } from './combat';

export const zombiePoseKey = 'zombie-combat-poses';

// Coordinates are relative to the standing actor's feet. Each row places the
// pelvis, knee, boot, elbow and palm independently around the original torso.
type Joint = readonly [number, number];
type Pose = { hip: Joint; tilt: number; knee: Joint; boot: Joint; elbow: Joint; palm: Joint };
const poses = {
  flinch: { hip: [-2, -21], tilt: -16, knee: [6, -12], boot: [4, -1], elbow: [10, -29], palm: [5, -37] },
  buckle: { hip: [-5, -15], tilt: -24, knee: [6, -11], boot: [4, -1], elbow: [-16, -22], palm: [-22, -15] },
  seated: { hip: [-9, -6], tilt: -43, knee: [3, -14], boot: [10, -1], elbow: [-23, -9], palm: [-26, -2] },
  grounded: { hip: [-7, -4], tilt: -78, knee: [6, -8], boot: [18, -1], elbow: [-18, -2], palm: [-26, -1] },
  push: { hip: [-7, -7], tilt: -50, knee: [4, -12], boot: [11, -1], elbow: [-20, -13], palm: [-22, -1] },
  kneel: { hip: [-3, -12], tilt: 18, knee: [5, -3], boot: [-7, -1], elbow: [12, -13], palm: [14, -2] },
} as const satisfies Record<string, Pose>;
const names = Object.keys(poses) as (keyof typeof poses)[];

export function knockdownPose(remaining: number, reduced: boolean): keyof typeof poses {
  const elapsed = shoveConfig.knockdownMs - remaining;
  if (!reduced && elapsed < 90) return 'buckle';
  if (!reduced && elapsed < 195) return 'seated';
  if (remaining <= 145) return 'kneel';
  if (remaining <= 365) return 'push';
  return 'grounded';
}

export function createZombiePoses(textures: Phaser.Textures.TextureManager) {
  if (textures.exists(zombiePoseKey)) return;
  const width = 108;
  const canvas = textures.createCanvas(zombiePoseKey, width * names.length, actorFrameHeight * Object.keys(zombieLooks).length);
  if (!canvas) return;
  const ctx = canvas.context;
  for (const [appearance, look] of Object.entries(zombieLooks)) {
    const source = textures.get(look.texture).getSourceImage() as HTMLImageElement;
    for (const [i, name] of names.entries()) {
      const pose: Pose = poses[name];
      const left = i * width;
      const top = look.row * actorFrameHeight;
      ctx.save();
      ctx.translate(left + width / 2, top + 56);
      ctx.imageSmoothingEnabled = false;
      function limb(a: Joint, b: Joint, c: Joint, color: string, thickness: number) {
        for (const outline of [true, false]) {
          ctx.strokeStyle = outline ? '#302d28' : color;
          ctx.lineWidth = thickness + (outline ? 2 : 0);
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(...c); ctx.stroke();
        }
      }
      const [hx, hy] = pose.hip, [kx, ky] = pose.knee, [bx, by] = pose.boot;
      limb([hx - 2, hy], [kx - 6,ky - 2], [bx - 7, by - 3], look.shadow, 4);
      limb(pose.hip, pose.knee, pose.boot, look.trousers, 5);
      ctx.fillStyle = '#46392e';
      ctx.fillRect(bx - 2, by - 3, 8, 4);
      ctx.fillRect(bx - 9, by - 6, 7, 4);
      ctx.save();
      ctx.translate(hx, hy);
      const angle = pose.tilt * Math.PI / 180;
      ctx.rotate(angle);
      ctx.drawImage(source, look.frame * actorFrameWidth, 0, actorFrameWidth, 37, -20, -36, actorFrameWidth, 37);
      ctx.restore();
      limb([hx + 13 * Math.sin(angle), hy - 13 * Math.cos(angle)], pose.elbow, pose.palm, look.shadow, 4);
      ctx.fillStyle = '#ad9077';
      ctx.fillRect(pose.palm[0]-2,pose.palm[1]-2, 5, 3);
      ctx.restore();
      canvas.add(appearance + '-' + name, 0, left, top, width, actorFrameHeight);
    }
  }
  canvas.refresh();
}
