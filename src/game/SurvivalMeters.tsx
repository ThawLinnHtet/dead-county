import { useSyncExternalStore } from 'react';
import type { GameCoordinator } from './gameCoordinator';
import { getNeedWarning, roundSurvivalStat, survivalStatNames } from './survival';
import type { Need, SurvivalStat } from './survival';
import './survivalMeters.css';

export function SurvivalMeters({ coordinator }: { coordinator: GameCoordinator }) {
  const characterId = useSyncExternalStore(coordinator.subscribe, () => coordinator.getState().survivor.characterId);
  const female = characterId === 'survivor_female';
  return (
    <section className="survival-meters" aria-label="Survival stats">
      <img
        className="survival-portrait"
        src={import.meta.env.BASE_URL + (female ? 'assets/ui/survivor-female.webp' : 'assets/ui/survivor-male.webp')}
        alt={female ? 'Female survivor' : 'Male survivor'}
      />
      <div className="survival-meter-list">
        <SurvivalMeter coordinator={coordinator} stat="health" />
        <SurvivalMeter coordinator={coordinator} stat="stamina" />
        <SurvivalMeter coordinator={coordinator} stat="hunger" />
        <SurvivalMeter coordinator={coordinator} stat="thirst" />
      </div>
    </section>
  );
}

function SurvivalMeter({ coordinator, stat }: { coordinator: GameCoordinator; stat: SurvivalStat }) {
  const value = useSyncExternalStore(coordinator.subscribe, () => roundSurvivalStat(coordinator.getState().survivor[stat]));
  const label = survivalStatNames[stat];
  return (
    <div className="survival-meter" data-stat={stat}>
      <span className="survival-stat-icon" aria-hidden="true" />
      <label htmlFor={`survivor-${stat}`}>{label}</label>
      <meter id={`survivor-${stat}`} min={0} max={100} value={value} />
      <span className="survival-stat-value" aria-hidden="true">{value} / 100</span>
      {(stat === 'hunger' || stat === 'thirst') && <NeedWarning coordinator={coordinator} need={stat} />}
    </div>
  );
}

function NeedWarning({ coordinator, need }: { coordinator: GameCoordinator; need: Need }) {
  const warning = useSyncExternalStore(coordinator.subscribe, () => getNeedWarning(need, coordinator.getState().survivor[need]));
  const criticalLabel = need === 'hunger' ? 'Critical hunger' : 'Critical thirst';
  const earlyLabel = need === 'hunger' ? 'Find food' : 'Find water';
  return (
    <span className="survival-need-warning" data-level={warning ?? undefined} role="status">
      {warning === 'critical' ? `${criticalLabel} · Losing Health` : warning === 'warning' ? earlyLabel : null}
    </span>
  );
}
