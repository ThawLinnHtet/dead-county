import { contains, hasLineOfSight, houses } from './world.ts';
import type { MapObject, WorldPoint } from './world.ts';
import type { ZombieState } from './zombie.ts';

export interface DoorDefense {
  readonly pressureMs: number;
  readonly wedged: boolean;
  readonly barricaded?: true;
}

export type DoorDefenses = Readonly<Partial<Record<string, DoorDefense>>>;
export type DoorStrain = 'intact' | 'straining' | 'failing';
export const doorKnockIntervalMs = 450;

export function openingCenter({ x, y, width, height }: MapObject): WorldPoint {
  return { x: x + width / 2, y: y + height / 2 };
}

export function doorResistance(defense?: Pick<DoorDefense, 'wedged' | 'barricaded'>) {
  return defense?.barricaded ? 5300 : defense?.wedged ? 4200 : 1450;
}

export function doorStrain(defense: DoorDefense | undefined): DoorStrain {
  if (!defense) return 'intact';
  const fraction = defense.pressureMs / doorResistance(defense);
  return fraction >= .72 ? 'failing' : fraction >= .3 ? 'straining' : 'intact';
}

function doorBlocksTarget(door: MapObject, closed: readonly MapObject[], origin: WorldPoint, target: WorldPoint) {
  const house = houses.find(({ name }) => door.name.startsWith(name + '_'));
  return house && contains(house, target)
    && !hasLineOfSight(origin, target, [door])
    && hasLineOfSight(origin, target, closed.filter((opening) => opening !== door));
}

export function findClosedDoorApproach(closed: readonly MapObject[], origin: WorldPoint, target: WorldPoint): WorldPoint | null {
  const door = closed.find((opening) => opening.type === 'door' && doorBlocksTarget(opening, closed, origin, target));
  if (!door) return null;
  const center = openingCenter(door);
  if (door.height > door.width) return { x: center.x + Math.sign(origin.x - center.x) * .42, y: center.y };
  return { x: center.x, y: center.y + Math.sign(origin.y - center.y) * .42 };
}

export function advanceDoorPressure(
  closed: readonly MapObject[], defenses: DoorDefenses, zombies: readonly ZombieState[], elapsed: number,
) {
  let updated: Partial<Record<string, DoorDefense>> | undefined;
  const forced = new Set<MapObject>();
  for (const door of closed) {
    if (door.type !== 'door') continue;
    const center = openingCenter(door);
    const pressers = zombies.filter(({ health, position, behavior, attack }) =>
      health > 0 && !attack && behavior.kind === 'chase'
      && Math.hypot(position.x - center.x, position.y - center.y) <= 1.3
      && doorBlocksTarget(door, closed, position, behavior.lastKnownPosition),
    );
    if (!pressers.length) continue;
    updated ??= { ...defenses };
    const defense = updated[door.name] ?? { wedged: false, pressureMs: 0 };
    const pressureMs = defense.pressureMs + elapsed * Math.min(3, pressers.length);
    if (pressureMs >= doorResistance(defense)) {
      forced.add(door);
      delete updated[door.name];
    } else {
      updated[door.name] = { ...defense, pressureMs };
    }
  }
  return { defenses: updated ?? defenses, closed: forced.size ? closed.filter((door) => !forced.has(door)) : closed, breached: forced };
}
