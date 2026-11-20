export const survivalStatNames = { health: 'Health', stamina: 'Stamina', hunger: 'Hunger', thirst: 'Thirst' } as const;
export type SurvivalStat = keyof typeof survivalStatNames;
export type Need = 'hunger' | 'thirst';
type Needs = Readonly<Record<Need, number>>;

export function roundSurvivalStat(value: number) {
  if (value <= 0) return 0;
  if (value >= 100) return 100;
  // Keep the endpoints reserved for exact boundaries, including no-benefit Use.
  return Math.max(1, Math.min(99, Math.round(value)));
}

const needs = {
  hunger: { progressionPerMs: .0016, warning: 40, critical: 80, damagePerMs: .0028 },
  thirst: { progressionPerMs: .002, warning: 44, critical: 80, damagePerMs: .00325 },
};

export function getNeedWarning(need: Need, severity: number) {
  const { warning, critical } = needs[need];
  if (severity >= critical) return 'critical';
  return severity >= warning ? 'warning' : null;
}

function timeUntilCritical(need: Need, severity: number) {
  const { critical, progressionPerMs } = needs[need];
  return severity >= critical ? 0 : (critical - severity) / progressionPerMs;
}

function advanceNeed(need: Need, severity: number, elapsedMs: number, criticalInMs: number) {
  const { critical, progressionPerMs } = needs[need];
  return elapsedMs === criticalInMs ? critical : Math.min(100, severity + progressionPerMs * elapsedMs);
}

export function getSurvivalStep(survivor: Needs & { readonly health: number }, maximumMs: number) {
  const hungerCriticalInMs = timeUntilCritical('hunger', survivor.hunger);
  const thirstCriticalInMs = timeUntilCritical('thirst', survivor.thirst);
  const damagePerMs = Math.max(
    hungerCriticalInMs === 0 ? needs.hunger.damagePerMs : 0,
    thirstCriticalInMs === 0 ? needs.thirst.damagePerMs : 0,
  );

  // End the step when damage changes rate or kills the survivor, just as combat
  // steps end at attack phase boundaries. Each interval has one damage rate.
  const deathInMs = damagePerMs > 0 ? survivor.health / damagePerMs : Infinity;
  const elapsedMs = Math.min(maximumMs, hungerCriticalInMs || Infinity, thirstCriticalInMs || Infinity, deathInMs);
  return {
    elapsedMs,
    needDamage: elapsedMs === deathInMs ? survivor.health : elapsedMs * damagePerMs,
    hunger: advanceNeed('hunger', survivor.hunger, elapsedMs, hungerCriticalInMs),
    thirst: advanceNeed('thirst', survivor.thirst, elapsedMs, thirstCriticalInMs),
  };
}
