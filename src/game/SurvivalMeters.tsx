import { useSyncExternalStore } from 'react';
import type { GameCoordinator } from './gameCoordinator';
import { getNeedWarning, roundSurvivalStat, survivalStatNames } from './survival';
import type { Need, SurvivalStat } from './survival';
import './survivalMeters.css';

export function SurvivalMeters({ coordinator, location }: { coordinator: GameCoordinator; location: string }) {
  const characterId = useSyncExternalStore(coordinator.subscribe, () => coordinator.getState().survivor.characterId);
  const bleeding = useSyncExternalStore(coordinator.subscribe, () => coordinator.getState().survivor.bleeding);
  const sleeping = useSyncExternalStore(coordinator.subscribe, () => coordinator.getState().sleep !== null);
  const restNotice = useSyncExternalStore(coordinator.subscribe, () => coordinator.getState().restNotice);
  const female = characterId === 'survivor_female';
  return (
    <section className="survival-meters field-frame" aria-label="Survival stats">
      <header className="survival-header">
        <img
          className="survival-portrait"
          src={import.meta.env.BASE_URL + (female ? 'assets/ui/survivor-female.webp' : 'assets/ui/survivor-male.webp')}
          alt={female ? 'Female survivor' : 'Male survivor'}
        />
        <p className="survival-location" role="status">{location}</p>
      </header>
      <div className="survival-meter-list">
        <SurvivalMeter coordinator={coordinator} stat="health" />
        {bleeding && <span className="survival-need-warning" data-level="critical" role="status">Bleeding · Use a bandage</span>}
        <SurvivalMeter coordinator={coordinator} stat="stamina" />
        <SurvivalMeter coordinator={coordinator} stat="hunger" />
        <SurvivalMeter coordinator={coordinator} stat="thirst" />
        <SurvivalMeter coordinator={coordinator} stat="fatigue" />
        {(sleeping || restNotice) && <span className="survival-need-warning" data-level={restNotice === 'danger' ? 'critical' : 'warning'} role="status">
          {sleeping ? 'Sleeping · E to wake up' : restNotice === 'danger' ? 'Woke up in danger'
            : restNotice === 'needs' ? 'Woke up with critical hunger or thirst' : 'Awake'}
        </span>}
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
      <span className="survival-stat-value" aria-hidden="true">{value}<span> / 100</span></span>
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
