import { hasLineOfSight } from './world.ts';
import type { WorldPoint } from './world.ts';

export const batConfig = {
  reach: 1.24,
  halfArc: Math.PI / 3,
  damage: 36,
  knockback: 0.18,
  stepSpeed: 1.18,
  windupMs: 250,
  contactMs: 125,
  recoveryMs: 425,
};

export const damageCueMs = 280;

export interface AttackState {
  readonly phase: 'windup' | 'contact' | 'recovery';
  readonly remainingMs: number;
  readonly direction: WorldPoint;
  readonly damageApplied: boolean;
}

type AttackTiming = { windupMs: number; contactMs: number; recoveryMs: number };

export function beginAttack(direction: WorldPoint, timing: AttackTiming): AttackState {
  return { direction, phase: 'windup', remainingMs: timing.windupMs, damageApplied: false };
}

export function advanceAttack(attack: AttackState | null, elapsed: number, timing: AttackTiming): AttackState | null {
  if (!attack) return null;
  const remainingMs = attack.remainingMs - elapsed;
  if (remainingMs > 0) return { ...attack, remainingMs };
  switch (attack.phase) {
    case 'windup': return { ...attack, phase: 'contact', remainingMs: timing.contactMs };
    case 'contact': return { ...attack, phase: 'recovery', remainingMs: timing.recoveryMs };
    case 'recovery': return null;
  }
}

export function aimFrom(origin: WorldPoint, target: WorldPoint): WorldPoint | null {
  const x = target.x - origin.x;
  const y = target.y - origin.y;
  const length = Math.hypot(x, y);
  return Number.isFinite(length) && length > 0.0001 ? { x: x / length, y: y / length } : null;
}

export function isInReach(origin: WorldPoint, target: WorldPoint, reach: number, sight = hasLineOfSight): boolean {
  return Math.hypot(target.x - origin.x, target.y - origin.y) <= reach && sight(origin, target);
}

export function selectBatTarget<T extends { id: string; health: number; position: WorldPoint }>(
  origin: WorldPoint, aim: WorldPoint, zombies: readonly T[], sight = hasLineOfSight,
): T | undefined {
  const ties = 0.000000001;
  const candidates = zombies.flatMap((zombie) => {
    if (zombie.health <= 0 || !isInReach(origin, zombie.position, batConfig.reach, sight)) return [];
    const x = zombie.position.x - origin.x;
    const y = zombie.position.y - origin.y;
    const angle = Math.atan2(Math.abs(aim.x * y - aim.y * x), aim.x * x + aim.y * y);
    return angle <= batConfig.halfArc ? [{ zombie, angle, distance: Math.hypot(x, y) }] : [];
  });

  // Floating point arithmetic can add tiny differences to geometrically equal values.
  // Find each minimum before applying its tolerance so iteration order cannot decide a tie.
  const bestAngle = Math.min(...candidates.map(({ angle }) => angle));
  const centered = candidates.filter(({ angle }) => angle <= bestAngle + ties);
  const bestDistance = Math.min(...centered.map(({ distance }) => distance));
  const nearest = centered.filter(({ distance }) => distance <= bestDistance + ties);
  return nearest.sort((a, b) => a.zombie.id < b.zombie.id ? -1 : Number(a.zombie.id > b.zombie.id))[0]?.zombie;
}
