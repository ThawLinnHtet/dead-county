import type Phaser from 'phaser';
import { batConfig, damageCueMs, shoveConfig } from './combat';
import type { AttackState } from './combat';
import type { BatAimPreview } from './gameCoordinator';
import { project } from './world';
import type { WorldPoint } from './world';
import { zombieConfig } from './zombie';

type Graphics = Phaser.GameObjects.Graphics;

export function drawBatAim(reach: Graphics, bracket: Graphics, preview: BatAimPreview | null) {
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

export function drawBat(
  art: Graphics, feet: WorldPoint, facingLeft: boolean, attack: AttackState | null, lean: number, height: number,
  readyAim: WorldPoint | undefined, female: boolean,
) {
  const side = facingLeft ? -1 : 1;
  const { x, y } = feet;
  let gripX = x + side * 8;
  let gripY = y - 25 * height;
  let angle = -1.05;
  if (readyAim && !attack) {
    const aim = screenAngle(readyAim);
    gripX = x + Math.cos(aim) * 10;
    gripY = y - 32 * height + Math.sin(aim) * 5;
    angle = Math.atan2(Math.sin(aim - .75), Math.cos(aim - .75) * side);
  }
  if (attack) {
    const aim = screenAngle(attack.direction);
    switch (attack.phase) {
      case 'windup': {
        const progress = 1 - attack.remainingMs / batConfig.windupMs;
        gripX = x + side * (6 - 10 * progress);
        gripY = y - 26 - 15 * progress;
        angle = -1.05 - progress * 1.12;
        break;
      }
      case 'contact': {
        const progress = 1 - attack.remainingMs / batConfig.contactMs;
        gripX = x + Math.cos(aim) * 13;
        gripY = y - 31 + Math.sin(aim) * 11;
        angle = aim + (-.48 + progress * .93) * side;
        const trail = art.lineStyle(2, 0xe2be8a, .6 * (1 - progress)).beginPath();
        trail.arc(x, y - 31, 42, angle - .47, angle + .12);
        trail.strokePath();
        break;
      }
      case 'recovery': {
        const remaining = attack.remainingMs / batConfig.recoveryMs;
        gripX = x + side * (8 + 5 * remaining);
        gripY = y - 25 + 6 * remaining;
        const followThrough = Math.atan2(Math.sin(aim + .45 * side), Math.cos(aim + .45 * side) * side);
        angle = -1.05 + (followThrough + 1.05) * remaining;
        break;
      }
    }
  }
  if (attack?.phase !== 'contact') {
    angle = Math.atan2(Math.sin(angle), Math.cos(angle) * side);
    gripX += Math.sin(lean * Math.PI / 180) * 24;
  }
  const tipX = gripX + Math.cos(angle) * 28;
  const tipY = gripY + Math.sin(angle) * 28;
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
  art.lineStyle(3, 0xbb8956).lineBetween(gripX, gripY - .5, tipX, tipY - .5);
  art.lineStyle(4, 0x6c4832).lineBetween(gripX, gripY, gripX + Math.cos(angle) * 7, gripY + Math.sin(angle) * 7);
  art.fillStyle(0xb68968).fillCircle(gripX, gripY, 2.2);
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
    art.lineStyle(3, 0x8f6953).lineBetween(elbowX, elbowY, handX, handY);
    art.fillStyle(0xbc9273).fillCircle(handX, handY, 2);
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
