export const survivalStatNames = { health: 'Health', stamina: 'Stamina', hunger: 'Hunger', thirst: 'Thirst', fatigue: 'Fatigue' } as const;
export type SurvivalStat = keyof typeof survivalStatNames;
export type Need = 'hunger' | 'thirst';
type Needs = Readonly<Record<Need, number>>;
export const survivalPacing = 8;
export const dayLengthMs = 12 * 60_000;
const gameHourMs = dayLengthMs / 24;
export const sleepSpeed = 90;
export const maximumSleepMs = 10 * gameHourMs;
export const fatiguePerMs = 100 / (20 * gameHourMs);
export const sleepRecoveryPerMs = 100 / (6 * gameHourMs);

export function plannedSleepMs(activeTimeMs: number) {
  const hour = (8 + activeTimeMs / gameHourMs) % 24;
  return (hour >= 20 ? 30 - hour : hour < 6 ? 6 - hour : 1) * gameHourMs;
}
export const bleedingDamagePerMs = .00018;

function neighborhoodMinute(activeTimeMs: number) {
  return 8 * 60 + Math.floor(activeTimeMs * 1440 / dayLengthMs);
}

export function neighborhoodDarkness(activeTimeMs: number) {
  const hour = (neighborhoodMinute(activeTimeMs) % 1440) / 60;
  return Math.min(1, Math.max(0, 1 - Math.min((hour - 5) / 3, (21 - hour) / 3, 1)));
}

export function neighborhoodTime(activeTimeMs: number) {
  const minute = neighborhoodMinute(activeTimeMs);
  const minuteOfDay = minute % 1440;
  const hour = minuteOfDay / 60;
  return {
    day: Math.floor(minute / 1440) + 1,
    time: `${String(Math.floor(hour)).padStart(2, '0')}:${String(minuteOfDay % 60).padStart(2, '0')}`,
    darkness: neighborhoodDarkness(activeTimeMs),
  };
}

export function roundSurvivalStat(value: number) {
  if (value <= 0) return 0;
  if (value >= 100) return 100;
  // Keep the endpoints reserved for exact boundaries, including no-benefit Use.
  return Math.max(1, Math.min(99, Math.round(value)));
}

const needs = {
  hunger: { progressionPerMs: .0016 / survivalPacing, warning: 40, critical: 80, damagePerMs: .0028 / survivalPacing },
  thirst: { progressionPerMs: .002 / survivalPacing, warning: 44, critical: 80, damagePerMs: .00325 / survivalPacing },
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

export function getSurvivalStep(survivor: Needs & { readonly health: number; readonly bleeding?: boolean }, maximumMs: number) {
  const hungerCriticalInMs = timeUntilCritical('hunger', survivor.hunger);
  const thirstCriticalInMs = timeUntilCritical('thirst', survivor.thirst);
  const damagePerMs = Math.max(
    hungerCriticalInMs === 0 ? needs.hunger.damagePerMs : 0,
    thirstCriticalInMs === 0 ? needs.thirst.damagePerMs : 0,
  ) + (survivor.bleeding ? bleedingDamagePerMs : 0);

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
