import type Phaser from 'phaser';
import { batConfig, damageCueMs, shoveConfig } from './combat';
import type { AttackState } from './combat';
import { project } from './world';
import type { WorldPoint } from './world';
import { zombieConfig } from './zombie';

type Graphics = Phaser.GameObjects.Graphics;

function screenAngle(direction: WorldPoint) {
  const { x, y } = project(direction);
  return Math.atan2(y, x);
}

export function drawBat(
  art: Graphics, feet: WorldPoint, facingLeft: boolean, attack: AttackState | null, lean: number, height: number,
  readyAim?: WorldPoint,
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
  art.lineStyle(6, 0x342417).lineBetween(gripX, gripY, tipX, tipY);
  art.lineStyle(3, 0xbb8956).lineBetween(gripX, gripY - .5, tipX, tipY - .5);
  art.lineStyle(4, 0x6c4832).lineBetween(gripX, gripY, gripX + Math.cos(angle) * 7, gripY + Math.sin(angle) * 7);
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
