import type Phaser from 'phaser';
import { damageCueMs, meleeWeapons, recoveryDuration, shoveConfig } from './combat';
import type { AttackState, MeleeKind } from './combat';
import type { MeleeAimPreview } from './gameCoordinator';
import { project } from './world';
import type { WorldPoint } from './world';
import { zombieConfig } from './zombie';

type Graphics = Phaser.GameObjects.Graphics;

export function drawMeleeAim(reach: Graphics, bracket: Graphics, preview: MeleeAimPreview | null) {
  reach.clear();
  bracket.clear();
  if (!preview) return;

  const points = preview.arc.map((point) => point && project(point));
  const center = preview.center && project(preview.center);
  const origin = project(preview.origin);
  const opacity = preview.committed ? .83 : .53;
  for (const [width, color, alpha] of [[3.4, 0x201b15, opacity], [1.35, 0xe3c69b, opacity]] as const) {
    reach.lineStyle(width, color, alpha).beginPath();
    for (let i = 1; i < points.length; i += 1) {
      const first = points[i - 1];
      const second = points[i];
      if (first && second) reach.moveTo(first.x, first.y).lineTo(second.x, second.y);
    }
    if (center) {
      reach.moveTo(center.x + (origin.x - center.x) * .24, center.y + (origin.y - center.y) * .24)
        .lineTo(center.x, center.y);
    }
    reach.strokePath();
  }

  if (preview.target) {
    const { x, y } = project(preview.target.position);
    bracket.setDepth(y + .035);
    for (const [width, color] of [[4, 0x211a12], [1.8, 0xf5d58d]] as const) {
      bracket.lineStyle(width, color, .95).beginPath();
      for (const side of [-1, 1]) {
        bracket.moveTo(x + side * 11, y - 4)
          .lineTo(x + side * 16, y)
          .lineTo(x + side * 11, y + 4);
      }
      bracket.strokePath();
    }
  }
}

function screenAngle(direction: WorldPoint) {
  const { x, y } = project(direction);
  return Math.atan2(y, x);
}

export function drawMeleeWeapon(
  art: Graphics, feet: WorldPoint, facingLeft: boolean, attack: AttackState | null, lean: number, height: number,
  readyAim: WorldPoint | undefined, female: boolean, reducedMotion: boolean, weapon: MeleeKind,
) {
  const timing = meleeWeapons[weapon];
  const knife = weapon === 'kitchen_knife';
  const length = knife ? 15 : 28;
  const side = facingLeft ? -1 : 1;
  const { x, y } = feet;
  let gripX = x + side * 8;
  let gripY = y - 25 * height;
  const idleAngle = Math.atan2(Math.sin(-1.05), Math.cos(-1.05) * side);
  let angle = idleAngle;
  if (readyAim && !attack) {
    const aim = screenAngle(readyAim);
    gripX = x + Math.cos(aim) * 10;
    gripY = y - 32 * height + Math.sin(aim) * 5;
    angle = aim - .75 * side;
  }
  if (attack) {
    const aim = screenAngle(attack.direction);
    const blendAngle = (from: number, to: number, progress: number) =>
      from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * progress;
    switch (attack.phase) {
      case 'windup': {
        const progress = 1 - attack.remainingMs / timing.windupMs;
        const loaded = aim - 1.5 * side;
        const release = Math.max(0, (progress - .72) / .28) ** 1.7;
        const gather = Math.min(1, progress / .62);
        angle = blendAngle(idleAngle, loaded, gather);
        angle = blendAngle(angle, aim, release);
        gripX = x + side * (8 - 11 * gather) * (1 - release) + Math.cos(aim) * 13 * release;
        gripY = y + (-25 - 12 * gather) * (1 - release) + (-31 + Math.sin(aim) * 11) * release;
        break;
      }
      case 'contact': {
        const progress = 1 - attack.remainingMs / timing.contactMs;
        gripX = x + Math.cos(aim) * 13;
        gripY = y - 31 + Math.sin(aim) * 11;
        angle = aim + .88 * (1 - (1 - progress) ** 2) * side;
        if (!reducedMotion) {
          const trail = art.lineStyle(2, 0xe2be8a, .43 * (1 - progress)).beginPath();
          trail.arc(gripX, gripY, length - 1, angle - .42 * side, angle, side < 0);
          trail.strokePath();
        }
        break;
      }
      case 'recovery': {
        const remaining = attack.remainingMs / recoveryDuration(timing, attack.tired);
        gripX = x + side * 8 * (1 - remaining) + Math.cos(aim) * 13 * remaining;
        gripY = y - 25 * (1 - remaining) + (-31 + Math.sin(aim) * 11) * remaining;
        angle = blendAngle(idleAngle, aim + .88 * side, remaining);
        break;
      }
    }
  }
  if (!attack) gripX += Math.sin(lean * Math.PI / 180) * 24;
  const tipX = gripX + Math.cos(angle) * length;
  const tipY = gripY + Math.sin(angle) * length;
  const twoHanded = !knife && !!(readyAim || attack);
  const supportX = gripX + Math.cos(angle) * 6;
  const supportY = gripY + Math.sin(angle) * 6;
  if (twoHanded) {
    const shoulder = x - 5 * side + Math.sin(lean * Math.PI / 180) * 30;
    const elbow = shoulder - 4 * side;
    for (const [width, color] of [[6, 0x302920], [4, female ? 0x694534 : 0x50543e]] as const) {
      art.lineStyle(width, color).lineBetween(shoulder, y - 33 * height, elbow, y - 23 * height)
        .lineBetween(elbow, y - 23 * height, supportX, supportY);
    }
  }
  if (readyAim || attack) {
    const shoulderX = x + side * 5 + Math.sin(lean * Math.PI / 180) * 30;
    const shoulderY = y - 34 * height;
    const elbowX = (gripX + shoulderX) / 2 - side * 3;
    const elbowY = (gripY + shoulderY) / 2 + 5;
    art.lineStyle(6, 0x302920).lineBetween(shoulderX, shoulderY, elbowX, elbowY)
      .lineBetween(elbowX, elbowY, gripX, gripY);
    art.lineStyle(4, female ? 0x805742 : 0x686c50).lineBetween(shoulderX, shoulderY, elbowX, elbowY)
      .lineBetween(elbowX, elbowY, gripX, gripY);
  }
  art.lineStyle(6, 0x342417).lineBetween(gripX, gripY, tipX, tipY);
  art.lineStyle(3, knife ? 0xc2cbd0 : 0xbb8956).lineBetween(gripX, gripY - .5, tipX, tipY - .5);
  art.lineStyle(4, 0x6c4832).lineBetween(gripX, gripY, gripX + Math.cos(angle) * 7, gripY + Math.sin(angle) * 7);
  art.fillStyle(0xb68968).fillCircle(gripX, gripY, 2.2);
  if (twoHanded) art.fillStyle(0xc09271).fillCircle(supportX, supportY, 2.2);
}

export function drawShove(art: Graphics, feet: WorldPoint, attack: AttackState) {
  const angle = screenAngle(attack.direction);
  const extension = attack.phase === 'contact' ? 21 : attack.phase === 'windup' ? 5
    : 7 + 10 * attack.remainingMs / shoveConfig.recoveryMs;
  for (const offset of [-4, 4]) {
    const shoulder = { x: feet.x + offset, y: feet.y - 32 };
    const hand = { x: shoulder.x + Math.cos(angle) * extension, y: shoulder.y + Math.sin(angle) * extension - 3 };
    art.lineStyle(5, 0x544633).lineBetween(shoulder.x, shoulder.y, hand.x, hand.y);
    art.fillStyle(0xb98767).fillCircle(hand.x, hand.y, 2.8);
  }
}

export function drawBiteArms(art: Graphics, feet: WorldPoint, attack: AttackState, lean: number) {
  const { x, y } = feet;
  const aim = screenAngle(attack.direction);
  const dx = Math.cos(aim);
  const dy = Math.sin(aim);
  let reach = 10;
  let lift = 8;
  if (attack.phase === 'windup') {
    const progress = 1 - attack.remainingMs / zombieConfig.bite.windupMs;
    reach += progress * 7;
    lift += progress * 4;
  } else if (attack.phase === 'contact') {
    reach = 23;
    lift = 2;
  } else {
    const remaining = attack.remainingMs / zombieConfig.bite.recoveryMs;
    reach = 6 + 8 * remaining;
    lift = -5 + 9 * remaining;
  }
  const shoulderX = x + Math.sin(lean * Math.PI / 180) * 30;
  for (const offset of [-4, 4]) {
    const shoulderY = y - 31 + offset;
    const elbowX = shoulderX + dx * reach * .6;
    const elbowY = shoulderY + dy * reach * .45 - lift * .4;
    const handX = shoulderX + dx * reach;
    const handY = shoulderY + dy * reach * .65 - lift;
    art.lineStyle(6, 0x40312b).lineBetween(shoulderX, shoulderY, elbowX, elbowY);
    art.lineStyle(4, 0x8f6953).lineBetween(elbowX, elbowY, handX, handY);
    art.fillStyle(0xbc9273).fillCircle(handX, handY, 2);
    if (attack.phase !== 'recovery') {
      art.lineStyle(1.6, 0xbc9273).lineBetween(handX, handY - 1, handX + dx * 4, handY + dy * 3 - 2)
        .lineBetween(handX, handY + 1, handX + dx * 3, handY + dy * 3 + 2);
    }
  }
}

export function drawDamageCue(art: Graphics, feet: WorldPoint, elapsedMs: number, isBite: boolean, fell: boolean) {
  const remaining = 1 - elapsedMs / damageCueMs;
  const y = feet.y - (fell ? 12 : 35);
  const distance = 12 + 7 * (1 - remaining);
  for (const side of [-1, 1]) {
    const x = feet.x + side * distance;
    const outerX = x + side * 7;
    const outerY = y - 6;
    art.lineStyle(4, 0x2c2119, remaining).lineBetween(x, y, outerX, outerY);
    art.lineStyle(2, isBite ? 0xe29076 : 0xffd09b, remaining).lineBetween(x, y, outerX, outerY);
  }
}
