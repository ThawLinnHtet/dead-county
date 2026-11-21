import type Phaser from 'phaser';
import { noise, screenShape } from './isometricDrawing';
import { project } from './world';
import type { WorldPoint } from './world';

type Drop = { position: WorldPoint; rise: number; radius: number; duration: number };
type Stain = { position: WorldPoint; seed: number; radius: number };

export function createImpactArt(scene: Phaser.Scene, reducedMotion: boolean) {
  const blood = scene.add.graphics().setDepth(-4800);
  const stains: Stain[] = [];
  const bursts: {
    art: Phaser.GameObjects.Graphics; position: WorldPoint; time: number; drops: Drop[];
  }[] = [];

  function redrawStains() {
    blood.clear();
    for (const stain of stains) {
      const center = project(stain.position);
      const outline = Array.from({ length: 9 }, (_, i) => {
        const angle = i * 2 * Math.PI / 9;
        const scale = .65 + .55 * noise(stain.seed + i * 17);
        return {
          x: center.x + Math.cos(angle) * stain.radius * scale,
          y: center.y + Math.sin(angle) * stain.radius * scale * .46,
        };
      });
      screenShape(blood, 0x462421, outline, .82);
      blood.fillStyle(0x673026, .75).fillEllipse(center.x - 1, center.y + .4, stain.radius, stain.radius * .35);
    }
  }

  return {
    hit(
      position: WorldPoint, from: WorldPoint, time: number,
      kind: 'bat' | 'bite', clear: (a: WorldPoint, b: WorldPoint) => boolean,
    ) {
      const seed = Math.round(time * 31 + position.x * 1337 + position.y * 983);
      const heading = Math.atan2(position.y - from.y, position.x - from.x);
      const count = kind === 'bat' ? 10 : 6;
      const drops = Array.from({ length: count }, (_, index) => {
        const angle = heading + (noise(seed + index * 41) - .5) * 2.25;
        const distance = .08 + noise(seed + index * 97) * (kind === 'bat' ? .61 : .34);
        const spot = {
          x: position.x + Math.cos(angle) * distance,
          y: position.y + Math.sin(angle) * distance,
        };
        return {
          position: clear(position, spot) ? spot : position,
          rise: 7 + noise(seed + index * 23) * 19,
          radius: 1.25 + noise(seed + index * 31) * 2.5,
          duration: 155 + noise(seed + index * 91) * 192,
        };
      });
      for (const [index, drop] of drops.entries()) {
        if (index % 2 === 0) stains.push({ position: drop.position, seed: seed + index, radius: drop.radius + 1.1 });
      }
      if (stains.length > 96) stains.splice(0, stains.length - 96);
      redrawStains();
      if (reducedMotion) return;
      if (bursts.length === 12) bursts.shift()!.art.destroy();
      const art = scene.add.graphics().setDepth(project(position).y + .04);
      bursts.push({ art, position, time, drops });
    },
    draw(activeTimeMs: number) {
      for (let index = bursts.length - 1; index >= 0; index -= 1) {
        const burst = bursts[index]!;
        const age = activeTimeMs - burst.time;
        if (age >= 350) {
          burst.art.destroy();
          bursts.splice(index, 1);
          continue;
        }
        const center = project(burst.position);
        const art = burst.art.clear();
        for (const drop of burst.drops) {
          const t = age / drop.duration;
          if (t >= 1) continue;
          const landing = project(drop.position);
          const lift = (1 - t) * 27 + 4 * t * (1 - t) * drop.rise;
          const x = Math.round(center.x + (landing.x - center.x) * t);
          const y = Math.round(center.y + (landing.y - center.y) * t - lift);
          const size = Math.ceil(drop.radius);
          art.fillStyle(0x4f1f1d, 1 - t * .62).fillRect(x - 1, y - 1, size + 1, size);
          art.fillStyle(0xb44a39, .93 - t * .65).fillRect(x, y, size, size - 1);
        }
      }
    },
  };
}
